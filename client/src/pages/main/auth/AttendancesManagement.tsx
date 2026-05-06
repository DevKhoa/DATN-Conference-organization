import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  ChevronDown,
  Ticket,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  XCircle,
  UserCheck,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Route } from "@/routes/(app)/attendances";
import { useActiveConferencesQuery } from "@/features/conferences/services/queries";
import { useSessionsByConferenceQuery } from "@/features/sessions/services/queries";
import { useTicketsBySessionQuery } from "@/features/tickets/services/queries";
import { useRegistrationsBySessionQuery } from "@/features/registrations/services/queries";
import { useToggleAttendanceMutation } from "@/features/attendances/services/mutations";
import { DefaultLayout } from "@/layouts/DefaultLayout";

const ITEMS_PER_PAGE = 10;

const AttendancesManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { conferenceId: initialConfId, sessionId: initialSessionId } =
    Route.useSearch();

  // Selection state
  const [selectedConfId, setSelectedConfId] = useState<number | null>(
    initialConfId || null,
  );
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    initialSessionId || null,
  );

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTicketType, setFilterTicketType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterOrg, setFilterOrg] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Query hooks
  const {
    data: conferences = [],
    isLoading: isLoadingConferences,
    error: conferencesError,
  } = useActiveConferencesQuery();

  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    error: sessionsError,
  } = useSessionsByConferenceQuery(selectedConfId);

  const { data: ticketStats = [] } =
    useTicketsBySessionQuery(selectedSessionId);

  const { data: attendees = [], error: attendeesError } =
    useRegistrationsBySessionQuery(selectedSessionId);

  // Mutation hook
  const toggleAttendanceMutation = useToggleAttendanceMutation();

  // Set default conference when data loads
  useEffect(() => {
    if (conferences.length > 0 && !selectedConfId) {
      setSelectedConfId(conferences[0].conf_id);
    }
  }, [conferences, selectedConfId]);

  // Set default session when sessions load or conference changes
  useEffect(() => {
    if (sessions.length > 0) {
      const isCurrentValid = sessions.some(
        (s) => s.session_id === selectedSessionId,
      );
      if (!selectedSessionId || !isCurrentValid) {
        setSelectedSessionId(sessions[0].session_id);
      }
    } else {
      setSelectedSessionId(null);
    }
  }, [sessions, selectedSessionId]);

  // Realtime subscription for attendance changes
  useEffect(() => {
    if (!selectedSessionId) return;

    const channel = supabase
      .channel("attendences_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendences",
          filter: `session_id=eq.${selectedSessionId}`,
        },
        () => {
          // React Query will handle refetching via mutation invalidation
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSessionId]);

  // Toggle check-in handler
  const handleToggleCheckIn = async (
    registrationId: number,
    currentStatus: boolean,
  ) => {
    if (!selectedSessionId) return;

    const newStatus = !currentStatus;
    const newTime = newStatus ? new Date().toISOString() : null;

    toggleAttendanceMutation.mutate({
      registration_id: registrationId,
      session_id: selectedSessionId,
      is_checkin: newStatus,
      checkin_time: newTime,
    });
  };

  // UI computed values
  const currentConf = conferences.find((c) => c.conf_id === selectedConfId);

  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const matchSearch =
        a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.organization?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTicket =
        filterTicketType === "All" ? true : a.ticket_name === filterTicketType;
      const matchStatus =
        filterStatus === "All"
          ? true
          : filterStatus === "Checked"
            ? a.is_checkin
            : !a.is_checkin;
      const matchOrg =
        filterOrg === "All" ? true : a.organization === filterOrg;

      return matchSearch && matchTicket && matchStatus && matchOrg;
    });
  }, [attendees, searchTerm, filterTicketType, filterStatus, filterOrg]);

  const totalPages = Math.ceil(filteredAttendees.length / ITEMS_PER_PAGE);
  const paginatedData = filteredAttendees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const ticketTypes = Array.from(new Set(attendees.map((a) => a.ticket_name)));
  const organizations = Array.from(
    new Set(attendees.map((a) => a.organization).filter(Boolean)),
  ) as string[];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterTicketType,
    filterStatus,
    filterOrg,
    selectedSessionId,
  ]);

  const handleNavigateBack = () => {
    navigate({
      to: "/conferences/$conferenceId",
      params: { conferenceId: String(selectedConfId) },
    });
  };

  const handleNavigateProfile = (email: string) => {
    navigate({ to: "/profile", search: { email } });
  };

  // Loading state
  const isLoading = isLoadingConferences || isLoadingSessions;
  const error = conferencesError || sessionsError || attendeesError;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load data. Please try again.</span>
        </div>
      </div>
    );
  }

  return (
    <DefaultLayout
      meta={{
        title: "Attendances Management",
      }}
    >
      <div className="min-h-screen bg-[#F8FAFC] pb-20">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              {initialConfId && (
                <button
                  onClick={handleNavigateBack}
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
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {currentConf?.conf_name || "Conference Management"}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-bold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />{" "}
                    {currentConf?.start_date
                      ? new Date(currentConf.start_date).toLocaleDateString(
                          "vi-VN",
                        )
                      : "--/--/----"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />{" "}
                    {currentConf?.location || "Chưa xác định"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Conference Selector */}
              <div className="relative min-w-[200px]">
                <select
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-brand-500"
                  onChange={(e) => setSelectedConfId(Number(e.target.value))}
                  value={selectedConfId || ""}
                >
                  {conferences.map((c) => (
                    <option key={c.conf_id} value={c.conf_id}>
                      {c.conf_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Session Selector */}
              <div className="relative min-w-[200px]">
                <select
                  className="w-full pl-4 pr-10 py-2.5 bg-brand-50 border border-brand-200 rounded-xl text-sm font-bold text-brand-700 appearance-none outline-none focus:ring-2 focus:ring-brand-500"
                  onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                  value={selectedSessionId || ""}
                  disabled={sessions.length === 0}
                >
                  {sessions.length > 0 ? (
                    sessions.map((s) => (
                      <option key={s.session_id} value={s.session_id}>
                        {s.session_name}
                      </option>
                    ))
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  SESSION REGISTRATION
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">
                    {attendees.length.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">
                    Registrants
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  SESSION CHECKED IN
                </p>
                <p className="text-3xl font-black text-slate-900">
                  {attendees.filter((a) => a.is_checkin).length}{" "}
                  <span className="text-base text-slate-400">
                    / {attendees.length}
                  </span>
                </p>
              </div>
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="#F1F5F9"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="#4F46E5"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={
                      2 *
                      Math.PI *
                      24 *
                      (1 -
                        attendees.filter((a) => a.is_checkin).length /
                          (attendees.length || 1))
                    }
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-slate-700">
                  {attendees.length > 0
                    ? Math.round(
                        (attendees.filter((a) => a.is_checkin).length /
                          attendees.length) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  TICKET DISTRIBUTION
                </p>
                <Ticket className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                {ticketStats.map((t, i) => {
                  const count = attendees.filter(
                    (a) => a.ticket_name === t.ticket_name,
                  ).length;
                  const percentage =
                    attendees.length > 0 ? (count / attendees.length) * 100 : 0;
                  return (
                    <div
                      key={t.ticket_id}
                      className={`${i % 3 === 0 ? "bg-amber-400" : i % 3 === 1 ? "bg-brand-600" : "bg-green-500"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex gap-4">
                {ticketStats.slice(0, 3).map((t, i) => (
                  <div
                    key={t.ticket_id}
                    className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${i === 0 ? "bg-amber-400" : i === 1 ? "bg-brand-600" : "bg-green-500"}`}
                    ></span>
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
            <select
              className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2 outline-none"
              onChange={(e) => setFilterTicketType(e.target.value)}
              value={filterTicketType}
            >
              <option value="All">Ticket type</option>
              {ticketTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2 outline-none"
              onChange={(e) => setFilterStatus(e.target.value)}
              value={filterStatus}
            >
              <option value="All">Status</option>
              <option value="Checked">Checked</option>
              <option value="Pending">Pending</option>
            </select>
            <select
              className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2 outline-none"
              onChange={(e) => setFilterOrg(e.target.value)}
              value={filterOrg}
            >
              <option value="All">Organization</option>
              {organizations.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
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
                  <tr
                    key={a.registration_id}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center font-black text-brand-700 text-xs">
                          {a.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <button
                            onClick={() => handleNavigateProfile(a.email)}
                            className="text-sm font-bold text-slate-900 hover:text-brand-600 hover:underline transition-all text-left"
                          >
                            {a.full_name}
                          </button>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {a.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-600">
                      {a.organization || "---"}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                        {a.ticket_name}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {a.is_checkin ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>{" "}
                          Checked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>{" "}
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center text-xs font-bold text-slate-500 whitespace-nowrap">
                      {a.checkin_time
                        ? `${new Date(a.checkin_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${new Date(a.checkin_time).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`
                        : "--:--"}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {a.is_checkin ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-black text-[10px] px-3 py-1.5 h-auto rounded-lg"
                          onClick={() =>
                            handleToggleCheckIn(a.registration_id, true)
                          }
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Remove Check in
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-brand-700 hover:bg-brand-800 font-black text-[10px] px-4 py-1.5 h-auto rounded-lg shadow-md"
                          onClick={() =>
                            handleToggleCheckIn(a.registration_id, false)
                          }
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
              <p className="text-[11px] font-bold text-slate-400 italic">
                Display {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredAttendees.length,
                )}{" "}
                of {filteredAttendees.length.toLocaleString()}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all ${currentPage === i + 1 ? "bg-brand-700 text-white shadow-md" : "bg-white text-slate-400 hover:text-brand-700"}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default AttendancesManagementPage;
