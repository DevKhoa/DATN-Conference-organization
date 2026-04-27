import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  MapPin,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  LayoutGrid,
} from "lucide-react";
import {
  format,
  parseISO,
  differenceInMinutes,
  addDays,
  subDays,
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";
import { supabase } from "../lib/supabase";

interface Session {
  session_id: number;
  session_name: string;
  start_time: string;
  end_time: string;
  room_location: string;
  conference_name: string;
  conf_id: number;
  chair_name: string;
}

interface MyAgendaProps {
  onNavigateConferenceDetail?: (confId: number) => void;
}

type ViewMode = "list" | "timeline";

const HOUR_HEIGHT = 72;

/** Computes side-by-side column layout for overlapping sessions. */
function computeColumnLayout(
  sessions: Session[],
): Map<number, { col: number; totalCols: number }> {
  const sorted = [...sessions].sort(
    (a, b) =>
      parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime(),
  );
  const result = new Map<number, { col: number; totalCols: number }>();

  // Build clusters of mutually-overlapping sessions
  const clusters: Session[][] = [];
  for (const session of sorted) {
    const s = parseISO(session.start_time);
    const e = parseISO(session.end_time);
    let placed = false;
    for (const cluster of clusters) {
      if (
        cluster.some(
          (c) => s < parseISO(c.end_time) && e > parseISO(c.start_time),
        )
      ) {
        cluster.push(session);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([session]);
  }

  for (const cluster of clusters) {
    // Greedy column assignment within each cluster
    const cols: Session[][] = [];
    for (const session of cluster) {
      const s = parseISO(session.start_time);
      let assigned = false;
      for (let c = 0; c < cols.length; c++) {
        if (parseISO(cols[c][cols[c].length - 1].end_time) <= s) {
          cols[c].push(session);
          assigned = true;
          break;
        }
      }
      if (!assigned) cols.push([session]);
    }
    const totalCols = cols.length;
    cols.forEach((col, colIdx) =>
      col.forEach((s) => result.set(s.session_id, { col: colIdx, totalCols })),
    );
  }
  return result;
}

export default function MyAgenda({
  onNavigateConferenceDetail,
}: MyAgendaProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for View Toggle
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // States for Timeline view
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const timelineRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Derived data
  const sessionCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => {
      const d = format(parseISO(s.start_time), "yyyy-MM-dd");
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [sessions]);

  // Handle click outside for custom calendar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setCalendarMonth(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    fetchAgenda();
  }, []);

  // Auto scroll timeline to reasonable hour
  useEffect(() => {
    if (viewMode === "timeline" && timelineRef.current) {
      timelineRef.current.scrollTop = 7 * HOUR_HEIGHT; // Cuộn tới 7h sáng
    }
  }, [sessions, viewMode]);

  const fetchAgenda = async () => {
    try {
      setLoading(true);

      // 1. Lấy thông tin từ Local Storage
      const userStr = localStorage.getItem("conf_user");
      if (!userStr) {
        throw new Error("You are not logged in or your session has expired.");
      }

      const user = JSON.parse(userStr);

      // 2. Phân quyền
      const isAdmin = user.roleId === 1 || user.roleId === 2;
      let sessionIdsAllowed: number[] = [];

      // 3. Nếu là user thường, tiến hành dò vé
      if (!isAdmin) {
        if (!user.email) {
          throw new Error("No email found in login data.");
        }

        // Lấy user_id từ bảng users dựa vào email
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("user_id")
          .eq("email", user.email)
          .single();

        if (userError || !userData) {
          throw new Error("Your account was not found in the system.");
        }

        const dbUserId = userData.user_id;

        // Lấy danh sách ticket_id từ bảng registrations
        const { data: registrations, error: regError } = await supabase
          .from("registrations")
          .select("ticket_id")
          .eq("user_id", dbUserId);

        if (regError) throw regError;

        if (!registrations || registrations.length === 0) {
          setSessions([]); // Không mua vé nào cả
          return;
        }

        const ticketIds = registrations.map((r) => r.ticket_id);

        // Lấy danh sách session_id từ ticket_session
        const { data: ticketSessions, error: tsError } = await supabase
          .from("ticket_session")
          .select("session_id")
          .in("ticket_id", ticketIds);

        if (tsError) throw tsError;

        if (!ticketSessions || ticketSessions.length === 0) {
          setSessions([]);
          return;
        }

        sessionIdsAllowed = ticketSessions.map((ts) => ts.session_id);
      }

      // 4. Query bảng sessions cho cả Admin lẫn User thường
      let query = supabase
        .from("sessions")
        .select(
          `
          session_id,
          session_name,
          start_time,
          end_time,
          room_location,
          conferences!inner(conf_id, conf_name),
          session_chairs(profiles(full_name))
        `,
        )
        .order("start_time", { ascending: true });

      // Áp dụng bộ lọc phiên nếu là user thường
      if (!isAdmin && sessionIdsAllowed.length > 0) {
        query = query.in("session_id", sessionIdsAllowed);
      }

      const { data: rawSessions, error: sessionError } = await query;
      if (sessionError) throw sessionError;

      // 5. Format dữ liệu trả về
      const formattedSessions: Session[] = rawSessions.map((s: any) => ({
        session_id: s.session_id,
        session_name: s.session_name,
        start_time: s.start_time,
        end_time: s.end_time,
        room_location: s.room_location,
        conference_name: s.conferences?.conf_name || "Unknown",
        conf_id: s.conferences?.conf_id ?? 0,
        chair_name: s.session_chairs?.map((c: any) => c.profiles?.full_name).filter(Boolean).join(", ") || "Unassigned",
      }));

      setSessions(formattedSessions);

      // Auto-select the first day with sessions for timeline view
      if (formattedSessions.length > 0) {
        setSelectedDate(parseISO(formattedSessions[0].start_time));
      }
    } catch (err: any) {
      console.error("Error loading My Agenda:", err);
      setError(err.message || "An error occurred while loading your agenda.");
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers for Timeline View ---
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const currentDaySessions = sessions.filter(
    (s) => format(parseISO(s.start_time), "yyyy-MM-dd") === selectedDateStr,
  );
  const columnLayout = useMemo(
    () => computeColumnLayout(currentDaySessions),
    [currentDaySessions],
  );
  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const getEventStyle = (
    startTime: string,
    endTime: string,
    col: number,
    totalCols: number,
  ) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const durationMins = differenceInMinutes(end, start);
    const top = startHour * HOUR_HEIGHT + (startMin / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMins / 60) * HOUR_HEIGHT, 30);
    const GAP = 2;
    const widthPct = 100 / totalCols;
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: `calc(${col * widthPct}% + ${GAP}px)`,
      right: `calc(${(totalCols - col - 1) * widthPct}% + ${GAP}px)`,
      width: undefined,
    };
  };
  const handlePrevDay = () => setSelectedDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate((prev) => addDays(prev, 1));
  const handleGoToday = () => setSelectedDate(new Date());

  const isCurrentDay = isToday(selectedDate);
  const selectedDayCount = sessionCountByDate[selectedDateStr] || 0;

  // --- Helpers for List View ---
  const groupedSessions = sessions.reduce(
    (acc: Record<string, Session[]>, session) => {
      const dateStr = format(parseISO(session.start_time), "yyyy-MM-dd");
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(session);
      return acc;
    },
    {},
  );

  // --- Render ---
  if (loading)
    return (
      <div className="p-8 flex justify-center text-gray-500">
        Loading agenda...
      </div>
    );
  if (error)
    return (
      <div className="p-8 flex justify-center text-red-500 items-center gap-2">
        <AlertCircle size={20} /> {error}
      </div>
    );

  return (
    <div
      className={`mx-auto ${viewMode === "timeline" ? "max-w-7xl px-4 py-4 md:px-6 md:py-5 flex flex-col" : "max-w-4xl p-6"} bg-gray-50 md:bg-white md:rounded-xl shadow-sm min-h-screen transition-all duration-300`}
    >
      {/* --- HEADER --- */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${viewMode === "timeline" ? "mb-4" : "mb-8 border-b pb-4"}`}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" size={24} />
            My Agenda
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Your registered conference sessions
          </p>
        </div>

        {/* VIEW TOGGLE BUTTONS */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === "list"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
              }`}
          >
            <List size={16} /> Schedule
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === "timeline"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
              }`}
          >
            <LayoutGrid size={16} /> Timeline
          </button>
        </div>
      </div>

      {/* --- LIST VIEW --- */}
      {viewMode === "list" &&
        (Object.keys(groupedSessions).length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
            No upcoming sessions on your agenda.
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedSessions).map(([date, daySessions]) => (
              <div key={date} className="relative">
                <div className="sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10 mb-4">
                  <h2 className="text-lg font-bold text-blue-700 bg-blue-50 inline-block px-4 py-1.5 rounded-full">
                    {format(parseISO(date), "EEEE, dd/MM/yyyy")}
                  </h2>
                </div>
                <div className="ml-6 border-l-2 border-gray-200 space-y-6">
                  {daySessions.map((session) => (
                    <div key={session.session_id} className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-2 border-2 border-white"></div>
                      <div
                        className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() =>
                          onNavigateConferenceDetail?.(session.conf_id)
                        }
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                              {session.conference_name}
                            </p>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {session.session_name}
                            </h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <Clock size={16} className="text-gray-400" />
                                <span>
                                  {format(
                                    parseISO(session.start_time),
                                    "HH:mm",
                                  )}{" "}
                                  -{" "}
                                  {format(parseISO(session.end_time), "HH:mm")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin size={16} className="text-gray-400" />
                                <span>{session.room_location || "TBD"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <User size={16} className="text-gray-400" />
                                <span>Chair: {session.chair_name}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* --- TIMELINE VIEW --- */}
      {viewMode === "timeline" && (
        <div className="flex-1 flex flex-col min-h-[600px]">
          {/* DATE NAVIGATOR */}
          <div className="bg-white rounded-t-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Arrows + Date pill */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 border border-gray-200"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextDay}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 border border-gray-200"
              >
                <ChevronRight size={16} />
              </button>

              <div
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl ml-1
                  ${isCurrentDay ? "bg-blue-50 ring-1 ring-blue-200" : selectedDayCount > 0 ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-gray-50 ring-1 ring-gray-200"}`}
              >
                <span
                  className={`text-3xl font-bold leading-none tabular-nums ${isCurrentDay ? "text-blue-600" : selectedDayCount > 0 ? "text-emerald-600" : "text-gray-800"}`}
                >
                  {format(selectedDate, "dd")}
                </span>
                <div className="flex flex-col leading-tight">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-widest ${isCurrentDay ? "text-blue-400" : selectedDayCount > 0 ? "text-emerald-400" : "text-gray-400"}`}
                  >
                    {format(selectedDate, "EEEE")}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {format(selectedDate, "MMMM yyyy")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 ml-1">
                  {isCurrentDay && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full tracking-wide text-center">
                      TODAY
                    </span>
                  )}
                  {selectedDayCount > 0 && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-center ${isCurrentDay ? "bg-blue-100 text-blue-700" : "bg-emerald-500 text-white"}`}
                    >
                      {selectedDayCount} session
                      {selectedDayCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Today button + Custom calendar picker */}
            <div className="flex items-center gap-2">
              {!isCurrentDay && (
                <button
                  onClick={handleGoToday}
                  className="text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Today
                </button>
              )}
              <div className="relative" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setShowCalendar((prev) => !prev)}
                  className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors px-3 py-1.5 rounded-lg border bg-white select-none ${showCalendar ? "text-blue-600 border-blue-400 bg-blue-50" : "text-gray-600 border-gray-200 hover:text-blue-600 hover:bg-blue-50"}`}
                >
                  <CalendarIcon size={13} />
                  <span>{format(selectedDate, "dd/MM/yyyy")}</span>
                </button>

                {showCalendar &&
                  (() => {
                    const firstDay = startOfMonth(calendarMonth);
                    const lastDay = endOfMonth(calendarMonth);
                    const days = eachDayOfInterval({
                      start: firstDay,
                      end: lastDay,
                    });
                    const startOffset = getDay(firstDay);
                    const cells: (Date | null)[] = [
                      ...Array(startOffset).fill(null),
                      ...days,
                    ];
                    return (
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-3 w-60">
                        <div className="flex items-center justify-between mb-2 px-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth((prev) => subMonths(prev, 1))
                            }
                            className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-xs font-semibold text-gray-700">
                            {format(calendarMonth, "MMMM yyyy")}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth((prev) => addMonths(prev, 1))
                            }
                            className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 mb-1">
                          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
                            (d) => (
                              <div
                                key={d}
                                className="text-center text-[10px] font-semibold text-gray-400 py-0.5"
                              >
                                {d}
                              </div>
                            ),
                          )}
                        </div>
                        <div className="grid grid-cols-7 gap-y-0.5">
                          {cells.map((day, i) => {
                            if (!day) return <div key={`e-${i}`} />;
                            const ds = format(day, "yyyy-MM-dd");
                            const count = sessionCountByDate[ds] || 0;
                            const isSelDay = isSameDay(day, selectedDate);
                            const isTodayDay = isToday(day);
                            const inMonth = isSameMonth(day, calendarMonth);
                            return (
                              <button
                                key={ds}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(day);
                                  setShowCalendar(false);
                                }}
                                className={`relative flex flex-col items-center justify-center rounded-md min-h-[30px] text-[11px] font-medium transition-colors ${!inMonth ? "opacity-30 pointer-events-none" : ""} ${isSelDay ? "bg-blue-600 text-white" : isTodayDay ? "ring-1 ring-blue-400 text-blue-600 bg-blue-50" : count > 0 ? "hover:bg-emerald-50 text-gray-700" : "hover:bg-gray-100 text-gray-700"}`}
                              >
                                <span className="leading-none">
                                  {day.getDate()}
                                </span>
                                {count > 0 && !isSelDay && (
                                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </div>
          </div>

          {/* TIMELINE GRID */}
          <div
            ref={timelineRef}
            className="bg-white rounded-b-xl border-x border-b border-gray-200 shadow-sm relative overflow-y-auto overflow-x-hidden flex-1"
          >
            <div
              className="relative"
              style={{ height: `${24 * HOUR_HEIGHT}px`, minWidth: "480px" }}
            >
              <div className="absolute left-14 right-0 top-0 bottom-0 pointer-events-none">
                {hoursArray.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className={`border-t w-full ${hour % 2 === 0 ? "border-gray-200" : "border-gray-100/60"}`}
                  />
                ))}
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-14 border-r border-gray-100 bg-white z-10">
                {hoursArray.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="relative"
                  >
                    <span className="absolute top-1 right-2 text-[10px] font-medium text-gray-400 tabular-nums leading-none">
                      {hour.toString().padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute left-14 right-2 top-0 bottom-0">
                {currentDaySessions.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm italic select-none">
                    No sessions scheduled for this day.
                  </div>
                )}
                {currentDaySessions.map((session) => {
                  const layout = columnLayout.get(session.session_id) ?? {
                    col: 0,
                    totalCols: 1,
                  };
                  return (
                    <div
                      key={session.session_id}
                      className="absolute overflow-hidden cursor-pointer group z-20 rounded-md border-l-[3px] border-l-blue-500 border border-blue-100 bg-blue-50/90 hover:bg-blue-100 transition-colors shadow-sm px-2 py-1"
                      style={getEventStyle(
                        session.start_time,
                        session.end_time,
                        layout.col,
                        layout.totalCols,
                      )}
                      onClick={() =>
                        onNavigateConferenceDetail?.(session.conf_id)
                      }
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[11px] font-semibold text-gray-900 truncate leading-tight group-hover:text-blue-700">
                          {session.session_name}
                        </span>
                        <span className="text-[10px] font-medium text-blue-600 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded flex-shrink-0 leading-tight">
                          {format(parseISO(session.start_time), "HH:mm")}–
                          {format(parseISO(session.end_time), "HH:mm")}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5 leading-tight">
                        {session.conference_name}
                      </div>
                      <div className="flex flex-wrap gap-x-2.5 gap-y-0 text-[10px] text-gray-500 mt-0.5 leading-tight">
                        <span className="flex items-center gap-0.5">
                          <MapPin size={8} className="flex-shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {session.room_location || "TBD"}
                          </span>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <User size={8} className="flex-shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {session.chair_name}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
