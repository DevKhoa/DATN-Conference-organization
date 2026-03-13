import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, QrCode, Search, ChevronDown, CheckCircle2, Ticket,
  Loader2, AlertCircle, RefreshCw, Calendar, MapPin,
  ChevronLeft, ChevronRight, XCircle, UserCheck, ArrowLeft
} from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';

interface AttendencesManagementProps {
  userRoleId: number;
  onNavigateBack: () => void;
  onNavigateProfile: (email: string) => void;
  initialConfId?: number;
  initialSessionId?: number;
}

// Interface cho Session
interface Session {
  session_id: number;
  session_name: string;
  room_location: string;
}

interface AttendeeRow {
  registration_id: number;
  user_id: number;
  full_name: string;
  email: string;
  organization: string | null;
  ticket_name: string;
  is_checkin: boolean;
  checkin_time: string | null;
  at_id: number | null;
}

const AttendencesManagement: React.FC<AttendencesManagementProps> = ({
  userRoleId,
  onNavigateBack,
  onNavigateProfile,
  initialConfId,
  initialSessionId
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [conferences, setConferences] = useState<any[]>([]);
  const [selectedConfId, setSelectedConfId] = useState<number | null>(initialConfId || null);

  // New states for Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessionId || null);

  const [ticketStats, setTicketStats] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTicketType, setFilterTicketType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterOrg, setFilterOrg] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Fetch Conferences
  useEffect(() => {
    const fetchConferences = async () => {
      try {
        setLoading(true);
        const { data, error: confError } = await supabase
          .from('conferences')
          .select('conf_id, conf_name, start_date, location')
          .eq('is_active', true)
          .order('create_time', { ascending: false });

        if (confError) throw confError;
        if (data && data.length > 0) {
          setConferences(data);
          if (!selectedConfId) setSelectedConfId(data[0].conf_id);
        }
      } catch (err: any) {
        setError('Không thể tải danh sách hội nghị.');
      } finally {
        setLoading(false);
      }
    };
    fetchConferences();
  }, []);

  // 2. Fetch Sessions when Conference changes
  useEffect(() => {
    const fetchSessions = async () => {
      if (!selectedConfId) return;
      try {
        const { data, error: sessError } = await supabase
          .from('sessions')
          .select('session_id, session_name, room_location')
          .eq('conf_id', selectedConfId);

        if (sessError) throw sessError;
        setSessions(data || []);
        if (data && data.length > 0) {
          const isCurrentValid = (data as any[]).some(s => s.session_id === selectedSessionId);

          if (!selectedSessionId || !isCurrentValid) {
            setSelectedSessionId(data[0].session_id);
          }
        } else {
          setSelectedSessionId(null);
          setAttendees([]);
        }
      } catch (err) {
        setError('Không thể tải danh sách phiên họp.');
      }
    };
    fetchSessions();
  }, [selectedConfId]);

  // 3. FETCH DATA: Lấy danh sách người đăng ký thuộc về Session đó
  const fetchDashboardData = async (sessionId: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      // Lấy thống kê vé chung cho hội nghị
      const { data: ticketsData } = await supabase
        .from('ticket_configs')
        .select('*')
        .eq('conference_id', selectedConfId);
      setTicketStats(ticketsData || []);

      // Truy vấn Registrations -> TicketSession (filter by sessionId) -> Attendences (filter by sessionId)
      const { data, error: regError } = await supabase
        .from('registrations')
        .select(`
          registration_id,
          user:user_id (user_id, full_name, email, organization),
          ticket_configs!inner (
            ticket_name,
            ticket_session!inner (session_id)
          ),
          attendences (
            at_id, is_checkin, checkin_time, session_id
          )
        `)
        .eq('ticket_configs.ticket_session.session_id', sessionId);

      if (regError) throw regError;

      const processedData: AttendeeRow[] = (data as any[]).map(reg => {
        // Lấy đúng bản ghi điểm danh của session này
        const att = reg.attendences?.find((a: any) => a.session_id === sessionId) || null;

        return {
          registration_id: reg.registration_id,
          user_id: reg.user?.user_id || 0,
          full_name: reg.user?.full_name || 'N/A',
          email: reg.user?.email || '',
          organization: reg.user?.organization || '',
          ticket_name: reg.ticket_configs?.ticket_name || 'Standard',
          is_checkin: att?.is_checkin ?? false,
          checkin_time: att?.checkin_time || null,
          at_id: att?.at_id ?? null
        };
      });

      setAttendees(processedData);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải dữ liệu người tham dự.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) fetchDashboardData(selectedSessionId);
  }, [selectedSessionId]);

  // Realtime Subscription
  useEffect(() => {
    if (!selectedSessionId) return;

    const channel = supabase
      .channel('attendences_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendences', filter: `session_id=eq.${selectedSessionId}` },
        (payload: any) => {
          const newRecord = payload.new;
          if (newRecord && newRecord.registration_id) {
            setAttendees(prevAttendees =>
              prevAttendees.map(attendee =>
                attendee.registration_id === newRecord.registration_id
                  ? { ...attendee, is_checkin: newRecord.is_checkin, checkin_time: newRecord.checkin_time }
                  : attendee
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSessionId]);

  // 4. TOGGLE CHECK-IN: Theo registration_id và session_id
  const handleToggleCheckIn = async (registrationId: number, currentStatus: boolean) => {
    if (!selectedSessionId) return;

    const newStatus = !currentStatus;
    const newTime = newStatus ? new Date().toISOString() : null;

    // Optimistic Update
    setAttendees(prevAttendees =>
      prevAttendees.map(attendee =>
        attendee.registration_id === registrationId
          ? { ...attendee, is_checkin: newStatus, checkin_time: newTime }
          : attendee
      )
    );

    try {
      const { error: upsertError } = await supabase
        .from('attendences')
        .upsert(
          {
            registration_id: registrationId,
            session_id: selectedSessionId,
            is_checkin: newStatus,
            checkin_time: newTime
          },
          {
            onConflict: 'registration_id, session_id'
          }
        );

      if (upsertError) throw upsertError;

    } catch (err: any) {
      console.error("Lỗi chi tiết:", err);
      if (selectedSessionId) fetchDashboardData(selectedSessionId);
      alert(`Thao tác thất bại: ${err.message || 'Lỗi cơ sở dữ liệu'}`);
    }
  };

  // UI LOGIC
  const currentConf = conferences.find(c => c.conf_id === selectedConfId);

  const filteredAttendees = useMemo(() => {
    return attendees.filter(a => {
      const matchSearch = a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.organization?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTicket = filterTicketType === 'All' ? true : a.ticket_name === filterTicketType;
      const matchStatus = filterStatus === 'All' ? true : (filterStatus === 'Checked' ? a.is_checkin : !a.is_checkin);
      const matchOrg = filterOrg === 'All' ? true : a.organization === filterOrg;

      return matchSearch && matchTicket && matchStatus && matchOrg;
    });
  }, [attendees, searchTerm, filterTicketType, filterStatus, filterOrg]);

  const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);
  const paginatedData = filteredAttendees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const ticketTypes = Array.from(new Set(attendees.map(a => a.ticket_name)));
  const organizations = Array.from(new Set(attendees.map(a => a.organization).filter(Boolean)));

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterTicketType, filterStatus, filterOrg, selectedSessionId]);

  if (userRoleId !== 1 && userRoleId !== 2) return <div className="p-20 text-center font-bold">Truy cập bị từ chối.</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {initialConfId && (
              <button
                onClick={onNavigateBack}
                className="p-2 -ml-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all group"
                title="Back to Conference Detail"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            )}

            <div className="p-3 bg-brand-700 rounded-xl text-white shadow-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">{currentConf?.conf_name || "Conference Management"}</h1>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-bold">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {currentConf?.start_date ? new Date(currentConf.start_date).toLocaleDateString('vi-VN') : '--/--/----'}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {currentConf?.location || 'Chưa xác định'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Conference Selector */}
            <div className="relative min-w-[200px]">
              <select
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-brand-500"
                onChange={(e) => setSelectedConfId(Number(e.target.value))}
                value={selectedConfId || ''}
              >
                {conferences.map(c => <option key={c.conf_id} value={c.conf_id}>{c.conf_name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Session Selector */}
            <div className="relative min-w-[200px]">
              <select
                className="w-full pl-4 pr-10 py-2.5 bg-brand-50 border border-brand-200 rounded-xl text-sm font-bold text-brand-700 appearance-none outline-none focus:ring-2 focus:ring-brand-500"
                onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                value={selectedSessionId || ''}
                disabled={sessions.length === 0}
              >
                {sessions.length > 0 ? (
                  sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.session_name}</option>)
                ) : (
                  <option>No sessions available</option>
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SESSION REGISTRATION</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900">{attendees.length.toLocaleString()}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">Registrants</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SESSION CHECKED IN</p>
              <p className="text-3xl font-black text-slate-900">
                {attendees.filter(a => a.is_checkin).length} <span className="text-base text-slate-400">/ {attendees.length}</span>
              </p>
            </div>
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" stroke="#F1F5F9" strokeWidth="5" fill="transparent" />
                <circle cx="28" cy="28" r="24" stroke="#4F46E5" strokeWidth="5" fill="transparent"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - (attendees.filter(a => a.is_checkin).length / (attendees.length || 1)))}
                  className="transition-all duration-1000" />
              </svg>
              <span className="absolute text-[10px] font-black text-slate-700">
                {attendees.length > 0 ? Math.round((attendees.filter(a => a.is_checkin).length / attendees.length) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TICKET DISTRIBUTION</p>
              <Ticket className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
              {ticketStats.map((t, i) => {
                const count = attendees.filter(a => a.ticket_name === t.ticket_name).length;
                const percentage = attendees.length > 0 ? (count / attendees.length) * 100 : 0;
                return (
                  <div key={t.ticket_id}
                    className={`${i % 3 === 0 ? 'bg-amber-400' : i % 3 === 1 ? 'bg-brand-600' : 'bg-green-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                );
              })}
            </div>
            <div className="flex gap-4">
              {ticketStats.slice(0, 3).map((t, i) => (
                <div key={t.ticket_id} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                  <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-brand-600' : 'bg-green-500'}`}></span>
                  {t.ticket_name.substring(0, 3)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-grow min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, organization..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2 outline-none"
            onChange={(e) => setFilterTicketType(e.target.value)} value={filterTicketType}>
            <option value="All">Ticket type</option>
            {ticketTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2 outline-none"
            onChange={(e) => setFilterStatus(e.target.value)} value={filterStatus}>
            <option value="All">Status</option>
            <option value="Checked">Checked</option>
            <option value="Pending">Pending</option>
          </select>
          <select className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2 outline-none"
            onChange={(e) => setFilterOrg(e.target.value)} value={filterOrg}>
            <option value="All">Organization</option>
            {organizations.map(org => <option key={org} value={org}>{org}</option>)}
          </select>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Full name</th>
                <th className="px-6 py-5">Organizations</th>
                <th className="px-6 py-5 text-center">Ticket type</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-center">Checked in time</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedData.map((a) => (
                <tr key={a.registration_id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center font-black text-brand-700 text-xs">
                        {a.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <button
                          onClick={() => onNavigateProfile(a.email)}
                          className="text-sm font-bold text-slate-900 hover:text-brand-600 hover:underline transition-all text-left"
                        >
                          {a.full_name}
                        </button>
                        <p className="text-[10px] text-slate-400 font-bold">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-600">{a.organization || '---'}</td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                      {a.ticket_name}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {a.is_checkin ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Checked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center text-xs font-bold text-slate-500 whitespace-nowrap">
                    {a.checkin_time ? (
                      `${new Date(a.checkin_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(a.checkin_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
                    ) : (
                      '--:--'
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    {a.is_checkin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-black text-[10px] px-3 py-1.5 h-auto rounded-lg"
                        onClick={() => handleToggleCheckIn(a.registration_id, true)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Remove Check in
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-brand-700 hover:bg-brand-800 font-black text-[10px] px-4 py-1.5 h-auto rounded-lg shadow-md"
                        onClick={() => handleToggleCheckIn(a.registration_id, false)}
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                        Check-in
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-8 py-4 border-t border-slate-50 flex justify-between items-center bg-slate-50/20">
            <p className="text-[11px] font-bold text-slate-400 italic">Display {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAttendees.length)} of {filteredAttendees.length.toLocaleString()}</p>
            <div className="flex gap-1.5">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all ${currentPage === i + 1 ? 'bg-brand-700 text-white shadow-md' : 'bg-white text-slate-400 hover:text-brand-700'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendencesManagement;