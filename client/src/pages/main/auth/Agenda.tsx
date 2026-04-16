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
  Loader2,
  RefreshCw,
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
import { useNavigate } from "@tanstack/react-router";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Button } from "@/components/ui/button";
import {
  useMyAgendaSessionsQuery,
  type AgendaSession,
} from "@/features/sessions/services/queries";

type Session = AgendaSession;

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

export default function MyAgendaPage() {
  const navigate = useNavigate();
  const {
    data: sessions = [],
    isLoading: loading,
    isFetching,
    error,
    refetch,
  } = useMyAgendaSessionsQuery();

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

  // Auto scroll timeline to reasonable hour
  useEffect(() => {
    if (viewMode === "timeline" && timelineRef.current) {
      timelineRef.current.scrollTop = 7 * HOUR_HEIGHT; // Cuộn tới 7h sáng
    }
  }, [sessions, viewMode]);

  useEffect(() => {
    if (sessions.length > 0) {
      setSelectedDate(parseISO(sessions[0].start_time));
    }
  }, [sessions]);

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
      <DefaultLayout
        meta={{
          title: "My Agenda",
        }}
      >
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-10 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-1">
              Loading your agenda
            </h2>
            <p className="text-sm text-muted-foreground">
              We are preparing your registered sessions.
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  if (error)
    return (
      <DefaultLayout
        meta={{
          title: "My Agenda",
        }}
      >
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="bg-card rounded-2xl border border-destructive/20 shadow-sm p-10 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Could not load your agenda
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {error instanceof Error
                ? error.message
                : "An error occurred while loading your agenda."}
            </p>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Try Again
            </Button>
          </div>
        </div>
      </DefaultLayout>
    );

  return (
    <DefaultLayout
      meta={{
        title: "My Agenda",
      }}
    >
      <div
        className={`mx-auto ${viewMode === "timeline" ? "max-w-7xl px-4 py-4 md:px-6 md:py-5 flex flex-col" : "max-w-4xl p-6"} bg-muted/30 md:bg-card md:rounded-xl shadow-sm min-h-screen transition-all duration-300 text-foreground`}
      >
        {/* --- HEADER --- */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${viewMode === "timeline" ? "mb-4" : "mb-8 border-b pb-4"}`}
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="text-primary" size={24} />
              My Agenda
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your registered conference sessions
            </p>
          </div>

          {/* VIEW TOGGLE BUTTONS */}
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <List size={16} /> Schedule
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "timeline"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <LayoutGrid size={16} /> Timeline
            </button>
          </div>
        </div>

        {/* --- LIST VIEW --- */}
        {viewMode === "list" &&
          (Object.keys(groupedSessions).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/40 rounded-lg border border-dashed border-border">
              No upcoming sessions on your agenda.
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedSessions).map(([date, daySessions]) => (
                <div key={date} className="relative">
                  <div className="sticky top-0 bg-card/90 backdrop-blur-sm py-2 z-10 mb-4">
                    <h2 className="text-lg font-bold text-primary bg-primary/10 inline-block px-4 py-1.5 rounded-full">
                      {format(parseISO(date), "EEEE, dd/MM/yyyy")}
                    </h2>
                  </div>
                  <div className="ml-6 border-l-2 border-border space-y-6">
                    {daySessions.map((session) => (
                      <div key={session.session_id} className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-primary rounded-full -left-1.75 top-2 border-2 border-card"></div>
                        <div
                          className="bg-card border border-border p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() =>
                            navigate({
                              to: "/conferences/$conferenceId",
                              params: { conferenceId: String(session.conf_id) },
                            })
                          }
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                                {session.conference_name}
                              </p>
                              <h3 className="text-lg font-semibold text-foreground mb-2">
                                {session.session_name}
                              </h3>
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Clock
                                    size={16}
                                    className="text-muted-foreground"
                                  />
                                  <span>
                                    {format(
                                      parseISO(session.start_time),
                                      "HH:mm",
                                    )}{" "}
                                    -{" "}
                                    {format(
                                      parseISO(session.end_time),
                                      "HH:mm",
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MapPin
                                    size={16}
                                    className="text-muted-foreground"
                                  />
                                  <span>{session.room_location || "TBD"}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <User
                                    size={16}
                                    className="text-muted-foreground"
                                  />
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
          <div className="flex-1 flex flex-col min-h-150">
            {/* DATE NAVIGATOR */}
            <div className="bg-card rounded-t-xl border border-border shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              {/* Left: Arrows + Date pill */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevDay}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground border border-border"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground border border-border"
                >
                  <ChevronRight size={16} />
                </button>

                <div
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl ml-1
                  ${isCurrentDay ? "bg-primary/10 ring-1 ring-primary/30" : selectedDayCount > 0 ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-muted ring-1 ring-border"}`}
                >
                  <span
                    className={`text-3xl font-bold leading-none tabular-nums ${isCurrentDay ? "text-primary" : selectedDayCount > 0 ? "text-emerald-600" : "text-foreground"}`}
                  >
                    {format(selectedDate, "dd")}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-widest ${isCurrentDay ? "text-primary/70" : selectedDayCount > 0 ? "text-emerald-400" : "text-muted-foreground"}`}
                    >
                      {format(selectedDate, "EEEE")}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {format(selectedDate, "MMMM yyyy")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 ml-1">
                    {isCurrentDay && (
                      <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full tracking-wide text-center">
                        TODAY
                      </span>
                    )}
                    {selectedDayCount > 0 && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-center ${isCurrentDay ? "bg-primary/20 text-primary" : "bg-emerald-500 text-white"}`}
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
                    className="text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                )}
                <div className="relative" ref={calendarRef}>
                  <button
                    type="button"
                    onClick={() => setShowCalendar((prev) => !prev)}
                    className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors px-3 py-1.5 rounded-lg border bg-card select-none ${showCalendar ? "text-primary border-primary/50 bg-primary/10" : "text-muted-foreground border-border hover:text-primary hover:bg-primary/10"}`}
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
                        <div className="absolute right-0 top-full mt-2 bg-card rounded-xl shadow-xl border border-border z-50 p-3 w-60">
                          <div className="flex items-center justify-between mb-2 px-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarMonth((prev) => subMonths(prev, 1))
                              }
                              className="p-1 rounded-md hover:bg-accent text-muted-foreground"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-semibold text-foreground">
                              {format(calendarMonth, "MMMM yyyy")}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarMonth((prev) => addMonths(prev, 1))
                              }
                              className="p-1 rounded-md hover:bg-accent text-muted-foreground"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 mb-1">
                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
                              (d) => (
                                <div
                                  key={d}
                                  className="text-center text-[10px] font-semibold text-muted-foreground py-0.5"
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
                                  className={`relative flex flex-col items-center justify-center rounded-md min-h-7.5 text-[11px] font-medium transition-colors ${!inMonth ? "opacity-30 pointer-events-none" : ""} ${isSelDay ? "bg-primary text-primary-foreground" : isTodayDay ? "ring-1 ring-primary/50 text-primary bg-primary/10" : count > 0 ? "hover:bg-emerald-50 text-foreground" : "hover:bg-accent text-foreground"}`}
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
              className="bg-card rounded-b-xl border-x border-b border-border shadow-sm relative overflow-y-auto overflow-x-hidden flex-1"
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
                      className={`border-t w-full ${hour % 2 === 0 ? "border-border" : "border-border/60"}`}
                    />
                  ))}
                </div>
                <div className="absolute left-0 top-0 bottom-0 w-14 border-r border-border bg-card z-10">
                  {hoursArray.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="relative"
                    >
                      <span className="absolute top-1 right-2 text-[10px] font-medium text-muted-foreground tabular-nums leading-none">
                        {hour.toString().padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>
                <div className="absolute left-14 right-2 top-0 bottom-0">
                  {currentDaySessions.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm italic select-none">
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
                        className="absolute overflow-hidden cursor-pointer group z-20 rounded-md border-l-[3px] border-l-primary border border-primary/20 bg-primary/10 hover:bg-primary/15 transition-colors shadow-sm px-2 py-1"
                        style={getEventStyle(
                          session.start_time,
                          session.end_time,
                          layout.col,
                          layout.totalCols,
                        )}
                        onClick={() => {
                          navigate({
                            to: "/conferences/$conferenceId",
                            params: { conferenceId: String(session.conf_id) },
                          });
                        }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[11px] font-semibold text-foreground truncate leading-tight group-hover:text-primary">
                            {session.session_name}
                          </span>
                          <span className="text-[10px] font-medium text-primary whitespace-nowrap bg-card/80 px-1.5 py-0.5 rounded shrink-0 leading-tight">
                            {format(parseISO(session.start_time), "HH:mm")}–
                            {format(parseISO(session.end_time), "HH:mm")}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">
                          {session.conference_name}
                        </div>
                        <div className="flex flex-wrap gap-x-2.5 gap-y-0 text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          <span className="flex items-center gap-0.5">
                            <MapPin size={8} className="shrink-0" />
                            <span className="truncate max-w-30">
                              {session.room_location || "TBD"}
                            </span>
                          </span>
                          <span className="flex items-center gap-0.5">
                            <User size={8} className="shrink-0" />
                            <span className="truncate max-w-30">
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
    </DefaultLayout>
  );
}
