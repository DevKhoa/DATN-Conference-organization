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
  Globe,
  Video,
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
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import { useNavigate } from "@tanstack/react-router";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);
const userTimezone = dayjs.tz.guess();
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Button } from "@/components/ui/button";
import {
  useMyAgendaSessionsQuery,
  type AgendaSession,
} from "@/features/sessions/services/queries";

type Session = AgendaSession & {
  displayStartJS: Date;
  displayEndJS: Date;
  displayDateOnly: string;
};

type ViewMode = "list" | "timeline";

const HOUR_HEIGHT = 160;

/** Computes side-by-side column layout for overlapping sessions. */
function computeColumnLayout(
  sessions: Session[],
): Map<number, { col: number; totalCols: number }> {
  const sorted = [...sessions].sort(
    (a, b) => a.displayStartJS.getTime() - b.displayStartJS.getTime(),
  );
  const result = new Map<number, { col: number; totalCols: number }>();

  // Build clusters of mutually-overlapping sessions
  const getVisualEnd = (s: Session) => {
    const start = s.displayStartJS;
    const end = s.displayEndJS;
    if (!isSameDay(start, end)) {
      // Span until the end of the day visually
      const startHour = start.getHours();
      const startMin = start.getMinutes();
      const minsUntilMidnight = 24 * 60 - (startHour * 60 + startMin);
      return new Date(start.getTime() + minsUntilMidnight * 60000);
    }
    return end;
  };

  const clusters: Session[][] = [];
  for (const session of sorted) {
    const sStart = session.displayStartJS;
    const sEnd = getVisualEnd(session);
    let placed = false;
    for (const cluster of clusters) {
      if (
        cluster.some((c) => {
          const cStart = c.displayStartJS;
          const cEnd = getVisualEnd(c);
          return sStart < cEnd && sEnd > cStart;
        })
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
      const sStart = session.displayStartJS;
      const sEnd = getVisualEnd(session);
      let assigned = false;
      for (let c = 0; c < cols.length; c++) {
        const lastInCol = cols[c][cols[c].length - 1];
        if (getVisualEnd(lastInCol) <= sStart) {
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
  const [useUserTimezone, setUseUserTimezone] = useState(false);

  // States for Timeline view
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const timelineRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Derived data
  const hasTimezoneDifference = useMemo(
    () => sessions.some((s) => s.timezone && s.timezone !== userTimezone),
    [sessions],
  );

  const displaySessions = useMemo<Session[]>(() => {
    return sessions
      .map((s) => {
        const startTz = dayjs.tz(s.start_time, s.timezone || userTimezone);
        const endTz = dayjs.tz(s.end_time, s.timezone || userTimezone);
        const displayStart = useUserTimezone
          ? startTz.tz(userTimezone)
          : startTz;
        const displayEnd = useUserTimezone ? endTz.tz(userTimezone) : endTz;
        return {
          ...s,
          displayStartJS: new Date(
            displayStart.year(),
            displayStart.month(),
            displayStart.date(),
            displayStart.hour(),
            displayStart.minute(),
          ),
          displayEndJS: new Date(
            displayEnd.year(),
            displayEnd.month(),
            displayEnd.date(),
            displayEnd.hour(),
            displayEnd.minute(),
          ),
          displayDateOnly: displayStart.format("YYYY-MM-DD"),
        } as Session;
      })
      .sort((a, b) => a.displayStartJS.getTime() - b.displayStartJS.getTime());
  }, [sessions, useUserTimezone]);

  const conferenceTimezones = useMemo(() => {
    const tzs = new Set<string>();
    sessions.forEach((s) => {
      if (s.timezone) tzs.add(s.timezone);
    });
    return Array.from(tzs);
  }, [sessions]);

  const conferenceTzDisplay =
    conferenceTimezones.length === 1
      ? `Conference Time (${conferenceTimezones[0]})`
      : conferenceTimezones.length > 1
        ? "Conference Time (Multiple)"
        : "Conference Time";

  const sessionCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    displaySessions.forEach((s) => {
      const d = format(s.displayStartJS, "yyyy-MM-dd");
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
    if (displaySessions.length > 0) {
      setSelectedDate(displaySessions[0].displayStartJS);
    }
  }, [sessions]);

  // --- Helpers for Timeline View ---
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const currentDaySessions = displaySessions.filter(
    (s) => format(s.displayStartJS, "yyyy-MM-dd") === selectedDateStr,
  );
  const columnLayout = useMemo(
    () => computeColumnLayout(currentDaySessions),
    [currentDaySessions],
  );
  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const getEventStyle = (
    start: Date,
    end: Date,
    col: number,
    totalCols: number,
  ) => {
    const startHour = start.getHours();
    const startMin = start.getMinutes();

    const crossesNextDay = !isSameDay(start, end);
    const diff = differenceInMinutes(end, start);

    // If it crosses to next day, extend it to the bottom of the screen (midnight)
    const durationMins = crossesNextDay
      ? 24 * 60 - (startHour * 60 + startMin)
      : diff;

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
  const groupedSessions = displaySessions.reduce(
    (acc: Record<string, Session[]>, session) => {
      const dateStr = session.displayDateOnly;
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(session);
      return acc;
    },
    {} as Record<string, Session[]>,
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

          {/* TIMEZONE TOGGLE */}
          {true && (
            <div className="flex bg-muted p-1 rounded-lg ml-auto mr-4">
              <button
                onClick={() => setUseUserTimezone(!useUserTimezone)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${useUserTimezone
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  } ${!useUserTimezone && hasTimezoneDifference ? "ring-2 ring-primary/60 relative overflow-hidden before:absolute before:inset-0 before:bg-primary/20 before:animate-pulse" : ""}`}
                title="Toggle Timezone"
              >
                <Globe
                  size={16}
                  className={
                    hasTimezoneDifference && !useUserTimezone
                      ? "text-primary/80 animate-bounce shadow-glow shrink-0"
                      : "shrink-0"
                  }
                />
                <span className="flex flex-col items-start leading-[1.1] text-left">
                  <span className="text-[10px] uppercase font-bold opacity-70 tracking-wider">
                    Viewing
                  </span>
                  <span>
                    {useUserTimezone
                      ? `My Timezone (${userTimezone})`
                      : conferenceTzDisplay}
                  </span>
                </span>
              </button>
            </div>
          )}
          {/* VIEW TOGGLE BUTTONS */}
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === "list"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
            >
              <List size={16} /> Schedule
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === "timeline"
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
                              hash: `session-${session.session_id}`,
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
                                  <span className="flex items-center flex-wrap gap-2">
                                    <span>
                                      {format(session.displayStartJS, "HH:mm")}{" "}
                                      - {format(session.displayEndJS, "HH:mm")}
                                      {!useUserTimezone && (
                                        <span className="text-[11px] ml-1 font-bold opacity-80">
                                          ({session.timezone || "UTC"})
                                        </span>
                                      )}
                                    </span>
                                    {!isSameDay(
                                      session.displayStartJS,
                                      session.displayEndJS,
                                    ) && (
                                        <span className="bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-500/20">
                                          +Multi-Day (
                                          {format(session.displayEndJS, "dd/MM")})
                                        </span>
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
                    const isNextDay = !isSameDay(
                      session.displayStartJS,
                      session.displayEndJS,
                    );
                    return (
                      <div
                        key={session.session_id}
                        className={`absolute cursor-pointer group z-20 rounded-md border-l-[3px] border hover:-translate-y-0.5 transition-all shadow-sm px-2 py-1 ${isNextDay
                            ? "border-l-purple-500 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 bg-[radial-gradient(#e9d5ff_1px,transparent_1px)] [background-size:16px_16px]"
                            : "border-l-primary border-primary/20 bg-primary/10 hover:bg-primary/15"
                          }`}
                        style={getEventStyle(
                          session.displayStartJS,
                          session.displayEndJS,
                          layout.col,
                          layout.totalCols,
                        )}
                        onClick={() => {
                          navigate({
                            to: "/conferences/$conferenceId",
                            params: { conferenceId: String(session.conf_id) },
                            hash: `session-${session.session_id}`,
                          });
                        }}
                      >
                        <div className="flex flex-col h-full relative">
                          <div className="flex items-start justify-between gap-1">
                            <span
                              className={`text-[11px] font-semibold text-foreground truncate leading-tight transition-colors ${isNextDay ? "group-hover:text-purple-600" : "group-hover:text-primary"}`}
                            >
                              {session.session_name}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">
                            {session.conference_name}
                          </div>
                          <div
                            className={`text-[10px] font-medium mt-auto pt-1 leading-tight inline-flex items-center flex-wrap gap-1 ${isNextDay ? "text-purple-600" : "text-primary"}`}
                          >
                            <span>
                              {format(session.displayStartJS, "HH:mm")}–
                              {format(session.displayEndJS, "HH:mm")}{" "}
                              {!useUserTimezone && (
                                <span className="opacity-80 font-bold ml-0.5">
                                  ({session.timezone || "UTC"})
                                </span>
                              )}
                              {isNextDay && (
                                <span className="font-bold ml-1">
                                  ({format(session.displayEndJS, "dd/MM")})
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Hover Details Card */}
                          <div className="absolute left-0 bottom-full mb-2 w-max max-w-[250px] bg-foreground text-background text-xs p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none before:content-[''] before:absolute before:top-full before:left-4 before:-ml-1 before:border-4 before:border-transparent before:border-t-foreground">
                            <div className="font-bold text-sm mb-1 leading-tight">
                              {session.session_name}
                            </div>
                            <div className="text-muted font-medium mb-3 leading-tight">
                              {session.conference_name}
                            </div>
                            <div className="flex flex-col gap-2 text-background/90">
                              <span className="flex items-center gap-1.5 flex-wrap">
                                <Clock size={12} className="text-muted" />
                                <span>
                                  {format(session.displayStartJS, "HH:mm")}–
                                  {format(session.displayEndJS, "HH:mm")}{" "}
                                  {!useUserTimezone && (
                                    <span className="opacity-80 font-bold ml-0.5">
                                      ({session.timezone || "UTC"})
                                    </span>
                                  )}
                                  {isNextDay && (
                                    <span className="font-bold ml-1">
                                      ({format(session.displayEndJS, "dd/MM")})
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className="flex items-center gap-1.5 bg-background/20 w-fit px-2 py-1 rounded">
                                <MapPin size={12} className="text-muted" />
                                {session.room_location || "TBD"}
                              </span>
                              <span className="flex items-center gap-1.5 bg-background/20 w-fit px-2 py-1 rounded">
                                <User size={12} className="text-muted" />
                                {session.chair_name}
                              </span>
                            </div>
                          </div>
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
