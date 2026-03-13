import React, { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Mic,
  Mail,
  Info,
  Loader2,
  Image as ImageIcon,
  ChevronRight,
  Settings,
  CheckCircle2,
  QrCode,
  X,
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

// --- INTERFACES ---

interface ConferenceDetailProps {
  conferenceId: number;
  onNavigateBack: () => void;
  onNavigateAssignSessions?: () => void;
  onNavigateAttendance?: (confId: number, sessionId: number) => void;
  onNavigateCheckinScanner?: (sessionIds: number[]) => void;
  userRoleId?: number;
}

interface Author {
  full_name: string;
}

interface Paper {
  paper_id: number;
  title: string;
  abstract: string;
  author?: Author;
}

interface SessionPaper {
  presentation_order: number;
  paper: Paper;
}

interface ChairPerson {
  user_id: number;
  full_name: string;
  email: string;
  description: string | null;
  avatar_url: string | null;
}

interface Session {
  session_id: number;
  session_name: string;
  start_time: string;
  end_time: string;
  room_location: string;
  is_ai_generated: boolean;
  chair?: ChairPerson;
  session_papers: SessionPaper[];
}

interface ConferenceData {
  conf_id: number;
  conf_name: string;
  start_date: string;
  end_date: string;
  location: string;
  description: string;
  banner_urls: string[] | null;
  status: string;
  open_for_papers: boolean;
}

// --- HELPERS ---

const isSameDay = (d1: string, d2: string) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const formatDateHeader = (isoString: string) => {
  const date = new Date(isoString);
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    day: date.getDate(),
    monthYear: date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
};

const formatTimeOnly = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDateRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
};

// --- SUB-COMPONENT: Chair Section (Handle Show More) ---

const ChairSection: React.FC<{ chair: ChairPerson }> = ({ chair }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongDescription = chair.description && chair.description.length > 150;

  return (
    <div className="mb-8 bg-slate-50/80 rounded-2xl p-5 border border-slate-100 flex flex-col sm:flex-row gap-5 transition-all hover:border-brand-200 hover:shadow-sm">
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-white p-1 shadow-sm border border-slate-100">
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-200 relative">
            {chair.avatar_url ? (
              <img
                src={chair.avatar_url}
                alt={chair.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-100 text-brand-600 font-bold text-xl">
                {chair.full_name.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-grow">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-brand-100 text-brand-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">
            Session Chair
          </span>
        </div>
        <h4 className="text-lg font-bold text-slate-900">{chair.full_name}</h4>

        <div className="mt-1 flex items-center text-sm text-slate-500 hover:text-brand-600 transition-colors w-fit">
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          <a href={`mailto:${chair.email}`}>{chair.email}</a>
        </div>

        {chair.description && (
          <div className="mt-3 text-sm text-slate-600 leading-relaxed relative">
            <p
              className={!isExpanded && isLongDescription ? "line-clamp-2" : ""}
            >
              {chair.description}
            </p>
            {isLongDescription && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 text-brand-600 font-medium text-xs flex items-center hover:underline focus:outline-none"
              >
                {isExpanded ? "Show Less" : "Read Full Bio"}
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 ml-1" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-1" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const ConferenceDetail: React.FC<ConferenceDetailProps> = ({
  conferenceId,
  onNavigateBack,
  onNavigateAssignSessions,
  onNavigateAttendance,
  onNavigateCheckinScanner,
  userRoleId = 0,
}) => {
  // --- State ---
  const [conference, setConference] = useState<ConferenceData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI State
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(
    new Set(),
  );

  // Checkin Scanner Modal State
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedSessionsForCheckin, setSelectedSessionsForCheckin] = useState<
    number[]
  >([]);

  const canEdit = userRoleId === 1 || userRoleId === 2;

  // --- Effects ---
  useEffect(() => {
    fetchData();
  }, [conferenceId]);

  useEffect(() => {
    if (!conference?.banner_urls || conference.banner_urls.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(
        (prev) => (prev + 1) % (conference.banner_urls?.length || 1),
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [conference]);

  // --- Data Fetching ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Conference
      const { data: confData, error: confError } = await supabase
        .from("conferences")
        .select("*")
        .eq("conf_id", conferenceId)
        .single();

      if (confError) throw confError;
      setConference(confData);

      // 2. Fetch Sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select(
          `
          *,
          chair:users!chair_person_id ( user_id, full_name, email, description, avatar_url ),
          session_papers (
            presentation_order,
            paper:papers (
              paper_id, title, abstract,
              author:users!primary_author_id ( full_name )
            )
          )
        `,
        )
        .eq("conf_id", conferenceId)
        .order("start_time", { ascending: true });

      if (sessionError) throw sessionError;

      const processedSessions = (sessionData || []).map((session: any) => ({
        ...session,
        session_papers: session.session_papers?.sort(
          (a: any, b: any) => a.presentation_order - b.presentation_order,
        ),
      }));

      setSessions(processedSessions);

      // Expand first session
      if (processedSessions.length > 0) {
        setExpandedSessions(new Set([processedSessions[0].session_id]));
      }
    } catch (err: any) {
      console.error("Error loading conference details:", err);
      setError("Failed to load conference details.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (id: number) => {
    const newSet = new Set(expandedSessions);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSessions(newSet);
  };

  const getBannerImage = () => {
    if (conference?.banner_urls && conference.banner_urls.length > 0) {
      return conference.banner_urls[currentBannerIndex];
    }
    return "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop";
  };

  const handleOpenCheckinScanner = () => {
    if (selectedSessionsForCheckin.length === 0 || !onNavigateCheckinScanner)
      return;

    setIsCheckinModalOpen(false);
    onNavigateCheckinScanner(selectedSessionsForCheckin);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
        <p className="text-slate-500">Loading conference details...</p>
      </div>
    );
  }

  if (error || !conference) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
          <Info className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unavailable</h2>
          <p className="text-slate-500 mb-6">
            {error || "Conference not found."}
          </p>
          <Button onClick={onNavigateBack}>Return to Conferences</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* 1. HERO / BANNER SECTION */}
      <div className="relative h-[400px] lg:h-[480px] bg-slate-900 overflow-hidden group">
        <img
          src={getBannerImage()}
          alt={conference.conf_name}
          className="w-full h-full object-cover opacity-90 transition-transform duration-[2000ms] ease-in-out hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

        {/* Navigation */}
        <div className="absolute top-6 left-4 lg:left-8 z-20 w-[95%] flex justify-between items-center">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to List</span>
          </button>

          <div className="flex items-center gap-3">
            {/* NEW: OPEN CHECKIN SCANNER (Admin/Secretariat) */}
            {canEdit && sessions.length > 0 && onNavigateCheckinScanner && (
              <Button
                onClick={() => setIsCheckinModalOpen(true)}
                variant="white-outline"
                icon={QrCode}
                className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-all font-bold"
              >
                Scan QR
              </Button>
            )}

            {/* NEW: ATTENDANCE MANAGEMENT DROPDOWN (Admin Only) */}
            {userRoleId === 1 &&
              sessions.length > 0 &&
              onNavigateAttendance && (
                <div className="relative group/attendance">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/90 cursor-pointer hover:bg-white/20 transition-all">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium">
                      Attendance management
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </div>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 opacity-0 invisible group-hover/attendance:opacity-100 group-hover/attendance:visible transition-all z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Select Session to Manage
                      </p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {sessions.map((s) => (
                        <button
                          key={s.session_id}
                          onClick={() =>
                            onNavigateAttendance(conferenceId, s.session_id)
                          }
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center justify-between group/item"
                        >
                          <span className="font-medium truncate mr-2">
                            {s.session_name}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:text-brand-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* ADMIN ACTION: Assign Sessions */}
            {canEdit && onNavigateAssignSessions && (
              <Button
                onClick={onNavigateAssignSessions}
                variant="white-outline"
                icon={Settings}
                className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20"
              >
                Assign Sessions
              </Button>
            )}
          </div>
        </div>

        {/* Title Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 z-10 max-w-7xl mx-auto">
          <div className="animate-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-500 text-white text-xs font-bold uppercase tracking-wide mb-4 shadow-lg shadow-brand-500/30">
              {conference.status} Conference
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight drop-shadow-xl tracking-tight">
              {conference.conf_name}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-slate-200 text-sm md:text-base font-medium">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                <Calendar className="w-4 h-4 text-brand-300" />
                <span>
                  {formatDateRange(conference.start_date, conference.end_date)}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                <MapPin className="w-4 h-4 text-brand-300" />
                <span>{conference.location}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Submission Status Banner */}
            <div
              className={`rounded-2xl border p-5 flex items-start sm:items-center gap-4 shadow-sm ${
                conference.open_for_papers
                  ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div
                className={`p-3 rounded-xl shrink-0 ${conference.open_for_papers ? "bg-white text-emerald-600 shadow-sm" : "bg-white text-slate-400 shadow-sm"}`}
              >
                {conference.open_for_papers ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>
              <div className="flex-grow">
                <h3
                  className={`font-bold text-base mb-1 ${conference.open_for_papers ? "text-emerald-900" : "text-slate-700"}`}
                >
                  {conference.open_for_papers
                    ? "Call for Papers is Active"
                    : "Submissions Closed"}
                </h3>
                <p
                  className={`text-sm ${conference.open_for_papers ? "text-emerald-800" : "text-slate-500"}`}
                >
                  {conference.open_for_papers
                    ? "This conference is still open for paper submissions."
                    : "This conference is no longer accepting paper submissions."}
                </p>
              </div>
            </div>

            {/* 2. DESCRIPTION & GALLERY */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-50 rounded-lg">
                  <FileText className="w-6 h-6 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  About the Conference
                </h2>
              </div>

              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed mb-8">
                {conference.description.split("\n").map((paragraph, idx) => (
                  <p key={idx} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* IMAGE GALLERY */}
              {conference.banner_urls && conference.banner_urls.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                    <ImageIcon className="w-4 h-4 mr-2 text-brand-500" />
                    Event Gallery
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {conference.banner_urls.map((url, index) => (
                      <div
                        key={index}
                        className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 cursor-pointer shadow-sm hover:shadow-md transition-all"
                      >
                        <img
                          src={url}
                          alt={`Gallery ${index}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. AGENDA / SESSIONS (TIMELINE STYLE) */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-50 rounded-lg">
                    <Clock className="w-6 h-6 text-brand-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Agenda & Sessions
                  </h2>
                </div>
                <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  {sessions.length} Sessions
                </div>
              </div>

              <div className="space-y-0 relative">
                {sessions.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                      <Calendar className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">
                      No sessions scheduled yet.
                    </p>
                  </div>
                ) : (
                  sessions.map((session, index) => {
                    const isExpanded = expandedSessions.has(session.session_id);
                    const startTime = formatTimeOnly(session.start_time);
                    const endTime = formatTimeOnly(session.end_time);

                    // Logic for Date Headers
                    const prevSession = index > 0 ? sessions[index - 1] : null;
                    const isNewDay =
                      !prevSession ||
                      !isSameDay(session.start_time, prevSession.start_time);
                    const dateInfo = formatDateHeader(session.start_time);

                    return (
                      <React.Fragment key={session.session_id}>
                        {/* --- DATE HEADER --- */}
                        {isNewDay && (
                          <div className="relative pt-4 pb-8">
                            {/* Date Badge */}
                            <div className="flex items-center gap-4 relative z-10">
                              <div className="flex flex-col items-center justify-center bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-200 w-16 h-16 shrink-0 border-4 border-slate-50">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                                  {dateInfo.weekday.substring(0, 3)}
                                </span>
                                <span className="text-xl font-extrabold">
                                  {dateInfo.day}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                  {dateInfo.weekday}
                                </h3>
                                <p className="text-slate-500 font-medium">
                                  {dateInfo.monthYear}
                                </p>
                              </div>
                              <div className="flex-grow h-px bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                            </div>
                            {/* Connecting Line Start */}
                            <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-slate-200 -z-0"></div>
                          </div>
                        )}

                        {/* --- SESSION ITEM --- */}
                        <div className="group flex gap-4 md:gap-6 relative mb-6">
                          {/* Timeline Left Column */}
                          <div className="flex flex-col items-center flex-shrink-0 w-16 md:w-16 pt-2 z-10 bg-slate-50">
                            <span
                              className={`text-sm font-bold font-mono tracking-tight ${isExpanded ? "text-brand-600" : "text-slate-500"}`}
                            >
                              {startTime}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {endTime}
                            </span>

                            {/* Dot */}
                            <div
                              className={`mt-2 w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                                isExpanded
                                  ? "bg-brand-600 border-brand-200 shadow-[0_0_0_4px_rgba(37,99,235,0.1)] scale-110"
                                  : "bg-white border-slate-300 group-hover:border-brand-400"
                              }`}
                            />
                          </div>

                          {/* Connecting Line (Vertical) */}
                          <div className="absolute left-8 top-0 bottom-[-24px] w-0.5 bg-slate-200 group-hover:bg-slate-300 transition-colors -z-0 ml-[1px]"></div>

                          {/* Content Card */}
                          <div
                            className={`flex-grow bg-white rounded-2xl transition-all duration-300 border relative z-10 ${
                              isExpanded
                                ? "shadow-lg border-brand-200 ring-1 ring-brand-100 translate-x-1"
                                : "shadow-sm border-slate-200 hover:shadow-md hover:border-slate-300"
                            }`}
                          >
                            {/* Header (Clickable) */}
                            <div
                              onClick={() => toggleSession(session.session_id)}
                              className="p-5 md:p-6 cursor-pointer"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-2">
                                  {/* Badges */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                                      <MapPin className="w-3 h-3 mr-1" />{" "}
                                      {session.room_location}
                                    </span>
                                  </div>

                                  <h3
                                    className={`text-lg md:text-xl font-bold transition-colors ${isExpanded ? "text-brand-700" : "text-slate-900 group-hover:text-brand-600"}`}
                                  >
                                    {session.session_name}
                                  </h3>
                                </div>

                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isExpanded ? "bg-brand-100 text-brand-600 rotate-180" : "bg-slate-50 text-slate-400"}`}
                                >
                                  <ChevronDown className="w-5 h-5" />
                                </div>
                              </div>

                              {/* Chair Teaser (Collapsed View) */}
                              {!isExpanded && session.chair && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 animate-in fade-in duration-300">
                                  <span className="text-xs font-semibold uppercase text-slate-400">
                                    Chair:
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {session.chair.avatar_url ? (
                                      <img
                                        src={session.chair.avatar_url}
                                        className="w-5 h-5 rounded-full object-cover"
                                        alt=""
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-[10px] flex items-center justify-center font-bold">
                                        {session.chair.full_name.charAt(0)}
                                      </div>
                                    )}
                                    <span className="font-medium text-slate-700">
                                      {session.chair.full_name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Expanded Body */}
                            {isExpanded && (
                              <div className="px-5 md:px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                                <hr className="border-slate-100 mb-6" />

                                {session.chair && (
                                  <ChairSection chair={session.chair} />
                                )}

                                {/* Papers List */}
                                <div>
                                  <h4 className="flex items-center text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
                                    <FileText className="w-4 h-4 mr-2 text-brand-500" />
                                    Presentations
                                  </h4>

                                  <div className="space-y-4">
                                    {session.session_papers &&
                                    session.session_papers.length > 0 ? (
                                      session.session_papers.map((sp, idx) => (
                                        <div
                                          key={sp.paper.paper_id}
                                          className="bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm rounded-xl p-4 transition-all duration-200 group/paper"
                                        >
                                          <div className="flex gap-4">
                                            <div className="hidden sm:flex flex-col items-center justify-center w-8 pt-1">
                                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center group-hover/paper:bg-brand-500 group-hover/paper:text-white transition-colors">
                                                {idx + 1}
                                              </div>
                                            </div>
                                            <div className="flex-grow">
                                              <h5 className="text-base font-bold text-slate-900 mb-1 group-hover/paper:text-brand-700 transition-colors">
                                                {sp.paper.title}
                                              </h5>
                                              <div className="flex items-center text-sm text-slate-600 mb-2">
                                                <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                <span className="font-medium">
                                                  {sp.paper.author?.full_name ||
                                                    "Unknown Author"}
                                                </span>
                                              </div>
                                              <p className="text-sm text-slate-500 leading-relaxed">
                                                {sp.paper.abstract}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-sm text-slate-400 italic px-4">
                                        No papers assigned yet.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Registration Card */}
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl shadow-xl p-6 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                <h3 className="text-xl font-bold mb-2 relative z-10">
                  Registration Open
                </h3>
                <p className="text-brand-100 text-sm mb-6 relative z-10">
                  Secure your spot today. Early bird discounts available until{" "}
                  {new Date(conference.start_date).toLocaleDateString()}.
                </p>

                <Button className="w-full justify-center bg-white text-brand-700 hover:bg-brand-50 border-none shadow-none font-bold">
                  Register Now <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Quick Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
                  Quick Information
                </h3>
                <ul className="space-y-4 text-sm">
                  <li className="flex items-start">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md mr-3 shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <span className="text-slate-600 pt-0.5">
                      Hybrid event supporting both in-person and virtual
                      attendance.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md mr-3 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-slate-600 pt-0.5">
                      Proceedings will be indexed in Scopus and Web of Science.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Check-in Scanner Modal */}
      {isCheckinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                <QrCode className="w-5 h-5 mr-2 text-brand-600" />
                Open Check-in Scanner
              </h3>
              <button
                onClick={() => setIsCheckinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Select the sessions you want to handle check-in for right now.
                Attendees scanning their QR code will be marked as attended for
                these sessions.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-2">
                {sessions.map((s) => (
                  <label
                    key={s.session_id}
                    className="flex items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                      checked={selectedSessionsForCheckin.includes(
                        s.session_id,
                      )}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSessionsForCheckin([
                            ...selectedSessionsForCheckin,
                            s.session_id,
                          ]);
                        } else {
                          setSelectedSessionsForCheckin(
                            selectedSessionsForCheckin.filter(
                              (id) => id !== s.session_id,
                            ),
                          );
                        }
                      }}
                    />
                    <span className="ml-3 text-sm font-medium text-slate-700">
                      {s.session_name}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setIsCheckinModalOpen(false)}
                  variant="outline"
                  className="w-full justify-center"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOpenCheckinScanner}
                  className="w-full justify-center"
                  disabled={selectedSessionsForCheckin.length === 0}
                >
                  Start Scanning
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConferenceDetail;
