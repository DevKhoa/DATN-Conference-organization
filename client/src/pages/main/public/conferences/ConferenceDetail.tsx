import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  MapPin,
  Layers,
  QrCode,
  Ticket,
  Trophy,
  Users,
  X,
  Settings,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import { useAwardLeaderboardQuery } from "@/features/awards/services/queries";
import { useConferenceDetailQuery } from "@/features/conferences/services/queries";
import { useAcceptedPapersQuery } from "@/features/papers/services/queries";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Route } from "@/routes/conferences/$conferenceId";
import { supabase } from "@/lib/supabase";
import {
  useToggleMeetMutation,
  useDeleteSessionMutation,
} from "@/features/sessions/services/mutations";
import { ConferenceSessionDisplay } from "./components/ConferenceSessionDisplay";
import { ConferenceRegistrationPanel } from "./components/ConferenceRegistrationPanel";
import { ConferenceAwardsLeaderboard } from "./components/ConferenceAwardsLeaderboard";

const formatDateHeader = (isoString: string | null) => {
  if (!isoString) {
    return {
      weekday: "Unknown",
      day: 0,
      monthYear: "Unknown",
    };
  }

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

const formatDateRange = (start: string | null, end: string | null) => {
  if (!start || !end) return "Date TBD";

  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
};

const ConferenceDetailPage = () => {
  const navigate = useNavigate();
  const { conferenceId: conferenceIdParam } = Route.useParams();
  const conferenceId = Number(conferenceIdParam);
  const { checkRoles } = useAuth();

  const {
    data: conferenceDetail,
    isLoading,
    error,
  } = useConferenceDetailQuery(conferenceId);
  const { data: acceptedPapers = [], isLoading: isLoadingAcceptedPapers } =
    useAcceptedPapersQuery(conferenceId);
  const { data: leaderboardRows = [], isLoading: isLoadingLeaderboard } =
    useAwardLeaderboardQuery(conferenceId);

  const conference = conferenceDetail?.conference ?? null;
  const sessions = conferenceDetail?.sessions ?? [];
  const canEdit = checkRoles([Role.ADMIN, Role.SECRETARIAT]);
  const toggleMeetMutation = useToggleMeetMutation();
  const deleteSessionMutation = useDeleteSessionMutation();

  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(
    new Set(),
  );
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedSessionsForCheckin, setSelectedSessionsForCheckin] = useState<
    number[]
  >([]);

  const { data: hasRegistration } = useQuery({
    queryKey: ["conference-detail-registration", conferenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(
          `registration_id, ticket_configs!inner ( ticket_session!inner ( sessions!inner ( conf_id ) ) )`,
        )
        .eq("ticket_configs.ticket_session.sessions.conf_id", conferenceId);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!conferenceId,
  });

  const canAccessVirtual = canEdit || !!hasRegistration;
  const canManageAttendance = checkRoles([Role.ADMIN]);

  const bannerUrls = useMemo(() => {
    if (!conference?.banner_urls || !Array.isArray(conference.banner_urls)) {
      return [] as string[];
    }

    return conference.banner_urls.filter(
      (url): url is string => typeof url === "string",
    );
  }, [conference?.banner_urls]);

  const groupedSessions = useMemo(() => {
    type SessionGroupItem = (typeof sessions)[number];
    const groups: { dateStr: string; sessions: SessionGroupItem[] }[] = [];

    sessions.forEach((session) => {
      const dateStr = session.start_time
        ? new Date(session.start_time).toDateString()
        : "Unknown Date";
      let group = groups.find((item) => item.dateStr === dateStr);
      if (!group) {
        group = { dateStr, sessions: [] };
        groups.push(group);
      }
      group.sessions.push(session);
    });

    return groups;
  }, [sessions]);
  const leaderboardByAward = useMemo(() => {
    const grouped = new Map<string, typeof leaderboardRows>();

    leaderboardRows.forEach((row) => {
      const awardName = row.award_name || "Unnamed Award";
      const values = grouped.get(awardName) || [];
      values.push(row);
      grouped.set(awardName, values);
    });

    return Array.from(grouped.entries()).map(([awardName, rows]) => ({
      awardName,
      rows: rows.slice(0, 5),
    }));
  }, [leaderboardRows]);

  const toggleDay = (dateStr: string) => {
    const next = new Set(expandedDays);
    if (next.has(dateStr)) next.delete(dateStr);
    else next.add(dateStr);
    setExpandedDays(next);
  };

  const toggleSession = (id: number) => {
    const next = new Set(expandedSessions);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSessions(next);
  };

  const checkinMutation = null; // not implemented yet

  const handleOpenCheckinScanner = () => {
    if (selectedSessionsForCheckin.length === 0) return;

    setIsCheckinModalOpen(false);
    navigate({
      to: "/checkin",
      search: { sessionIds: selectedSessionsForCheckin.join(",") },
    });
  };

  if (isLoading) {
    return (
      <DefaultLayout meta={{ title: "Conference Detail" }}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading conference details...</p>
        </div>
      </DefaultLayout>
    );
  }

  if (error || !conference) {
    return (
      <DefaultLayout meta={{ title: "Conference Detail" }}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <Info className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-bold text-foreground">
              Unavailable
            </h2>
            <p className="mb-6 text-muted-foreground">
              {error
                ? error instanceof Error
                  ? error.message
                  : "Failed to load conference details."
                : "Conference not found."}
            </p>
            <Button onClick={() => navigate({ to: "/conferences" })}>
              Return to Conferences
            </Button>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout meta={{ title: conference.conf_name }}>
      <div className="min-h-screen bg-background pb-24 text-foreground">
        <div className="relative overflow-hidden bg-foreground">
          {bannerUrls.length > 0 && (
            <img
              src={bannerUrls[0]}
              alt="Conference Banner"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-foreground/95 via-foreground/60 to-foreground/40" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                className="bg-background/10 text-primary-foreground backdrop-blur-md hover:bg-background/20"
                onClick={() => navigate({ to: "/conferences" })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Button>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {canEdit && sessions.length > 0 && (
                  <Button
                    onClick={() => setIsCheckinModalOpen(true)}
                    variant="outline"
                    className="bg-background/10 backdrop-blur-md border-background/20 text-primary-foreground hover:bg-primary/10 hover:border-primary/30 font-bold"
                  >
                    <QrCode className="w-4 h-4 mr-1" />
                    Scan QR
                  </Button>
                )}

                {canManageAttendance && sessions.length > 0 && (
                  <div className="relative group/attendance">
                    <div className="flex items-center gap-2 bg-background/10 backdrop-blur-md px-4 py-2 rounded-full border border-background/10 text-primary-foreground/90 cursor-pointer hover:bg-background/20 transition-all">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium">Attendance</span>
                      <ChevronDown className="w-4 h-4" />
                    </div>

                    <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl shadow-xl border border-border py-2 opacity-0 invisible group-hover/attendance:opacity-100 group-hover/attendance:visible transition-all z-50">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          Select Session
                        </p>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {sessions.map((session) => (
                          <button
                            key={session.session_id}
                            onClick={() =>
                              navigate({
                                to: "/attendances",
                                search: {
                                  conferenceId,
                                  sessionId: session.session_id,
                                },
                              })
                            }
                            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between group/item"
                          >
                            <span className="font-medium truncate mr-2">
                              {session.session_name}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/item:text-primary transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {canEdit && sessions.length > 0 && (
                  <div className="relative group/chairs">
                    <div className="flex items-center gap-2 bg-background/10 backdrop-blur-md px-4 py-2 rounded-full border border-background/10 text-primary-foreground/90 cursor-pointer hover:bg-background/20 transition-all">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">Manage Chairs</span>
                      <ChevronDown className="w-4 h-4" />
                    </div>

                    <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl shadow-xl border border-border py-2 opacity-0 invisible group-hover/chairs:opacity-100 group-hover/chairs:visible transition-all z-50">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          Select Session
                        </p>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {sessions.map((session) => (
                          <button
                            key={session.session_id}
                            onClick={() =>
                              navigate({
                                to: "/conferences/$conferenceId/sessions/$sessionId/chairs",
                                params: {
                                  conferenceId: String(conferenceId),
                                  sessionId: String(session.session_id),
                                },
                              })
                            }
                            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between group/item"
                          >
                            <span className="font-medium truncate mr-2">
                              {session.session_name}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/item:text-primary transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {canEdit && (
                  <Button
                    onClick={() =>
                      navigate({
                        to: "/conferences/$conferenceId/sessions",
                        params: {
                          conferenceId: String(conferenceId),
                        },
                      })
                    }
                    variant="outline"
                    className="bg-background/10 backdrop-blur-md border-background/20 text-primary-foreground hover:bg-background/20"
                  >
                    <Layers className="w-4 h-4 mr-1" />
                    Session Manager
                  </Button>
                )}

                {canEdit && (
                  <Button
                    onClick={() =>
                      navigate({
                        to: "/tickets",
                        search: { conferenceId },
                      })
                    }
                    variant="outline"
                    className="bg-background/10 backdrop-blur-md border-background/20 text-primary-foreground hover:bg-background/20"
                  >
                    <Ticket className="w-4 h-4 mr-1" />
                    Tickets
                  </Button>
                )}

                {canEdit && (
                  <Button
                    onClick={() =>
                      navigate({
                        to: "/notifications/create",
                        search: {
                          conferenceId,
                          conferenceName: conference.conf_name,
                        },
                      })
                    }
                    variant="outline"
                    className="bg-background/10 backdrop-blur-md border-background/20 text-primary-foreground hover:bg-background/20"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Create Notification
                  </Button>
                )}

                {canEdit && (
                  <Button
                    onClick={() =>
                      navigate({
                        to: "/conferences/$conferenceId/import-papers",
                        params: { conferenceId: conferenceId.toString() },
                      })
                    }
                    variant="outline"
                    className="bg-background/10 backdrop-blur-md border-background/20 text-primary-foreground hover:bg-background/20"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Import Papers
                  </Button>
                )}
              </div>
            </div>

            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                {conference.status} Conference
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground md:text-5xl">
                {conference.conf_name}
              </h1>
              <div className="mt-4 flex flex-col gap-3 text-sm text-primary-foreground/80 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 rounded-lg border border-background/10 bg-foreground/30 px-3 py-1.5 backdrop-blur-sm">
                  <Calendar className="h-4 w-4 text-primary-foreground/70" />
                  <span>
                    {formatDateRange(
                      conference.start_date,
                      conference.end_date,
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-background/10 bg-foreground/30 px-3 py-1.5 backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-primary-foreground/70" />
                  <span>{conference.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-2">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Info className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    About the Conference
                  </h2>
                </div>

                <div className="prose prose-slate mb-8 max-w-none text-foreground/80">
                  {conference.description
                    ?.split("\n")
                    .map((paragraph, index) => (
                      <p key={index} className="mb-4">
                        {paragraph}
                      </p>
                    ))}
                </div>

                {bannerUrls.length > 0 && (
                  <div className="border-t border-border pt-8">
                    <h3 className="mb-4 flex items-center text-sm font-bold uppercase tracking-wide text-foreground">
                      <Calendar className="mr-2 h-4 w-4 text-primary" />
                      Event Gallery
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {bannerUrls.map((url, index) => (
                        <div
                          key={index}
                          className="group relative aspect-video overflow-hidden rounded-xl bg-muted shadow-sm transition-all hover:shadow-md"
                        >
                          <img
                            src={url}
                            alt={`Gallery ${index + 1}`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Agenda & Sessions
                    </h2>
                  </div>
                  <div className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                    {sessions.length} Sessions
                  </div>
                </div>

                <div className="space-y-0 relative">
                  {groupedSessions.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
                      <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-muted-foreground">
                        No sessions scheduled yet.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-7.25 top-8 bottom-4 z-0 hidden w-0.5 bg-border/80 sm:block" />
                      {groupedSessions.map((group) => {
                        const isDayExpanded = expandedDays.has(group.dateStr);
                        const dateInfo = formatDateHeader(
                          group.sessions[0].start_time,
                        );

                        return (
                          <div key={group.dateStr} className="relative mb-4">
                            <button
                              className="relative -ml-2 cursor-pointer rounded-xl p-2 pt-4 pb-4 text-left transition-colors hover:bg-accent/50"
                              onClick={() => toggleDay(group.dateStr)}
                            >
                              <div className="relative z-10 flex items-center gap-4">
                                <div
                                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border-4 border-slate-50 text-white shadow-lg transition-colors ${isDayExpanded ? "bg-primary shadow-primary/20" : "bg-muted-foreground shadow-muted/20"}`}
                                >
                                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                                    {dateInfo.weekday.substring(0, 3)}
                                  </span>
                                  <span className="text-xl font-extrabold">
                                    {dateInfo.day}
                                  </span>
                                </div>
                                <div className="grow">
                                  <h3 className="flex items-center gap-2 text-xl font-bold text-foreground">
                                    {dateInfo.weekday}
                                    {isDayExpanded ? (
                                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </h3>
                                  <p className="font-medium text-muted-foreground">
                                    {dateInfo.monthYear}
                                  </p>
                                </div>
                              </div>
                            </button>

                            {isDayExpanded && (
                              <div className="relative mt-2 pb-8">
                                <div className="absolute left-7.25 top-0 bottom-12 z-0 w-0.5 bg-slate-200" />

                                {group.sessions.map((session) => {
                                  const isExpanded = expandedSessions.has(
                                    session.session_id,
                                  );
                                  return (
                                    <ConferenceSessionDisplay
                                      key={session.session_id}
                                      conferenceFormatType={
                                        conference.format_type
                                      }
                                      canAccessVirtual={canAccessVirtual}
                                      canEdit={canEdit}
                                      session={session}
                                      isExpanded={isExpanded}
                                      onToggle={() =>
                                        toggleSession(session.session_id)
                                      }
                                      onEdit={() =>
                                        navigate({
                                          to: "/conferences/$conferenceId/sessions/$sessionId",
                                          params: {
                                            conferenceId: String(conferenceId),
                                            sessionId: String(
                                              session.session_id,
                                            ),
                                          },
                                        })
                                      }
                                      onNavigateToChairs={() =>
                                        navigate({
                                          to: "/conferences/$conferenceId/sessions/$sessionId/chairs",
                                          params: {
                                            conferenceId: String(conferenceId),
                                            sessionId: String(
                                              session.session_id,
                                            ),
                                          },
                                        })
                                      }
                                      onToggleMeet={(payload) =>
                                        toggleMeetMutation.mutate(payload)
                                      }
                                      onDelete={() => {
                                        setSessionToDelete({
                                          id: session.session_id,
                                          name: session.session_name!,
                                        });
                                        setDeleteConfirmOpen(true);
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Accepted Papers
                    </h2>
                  </div>
                  <div className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                    {acceptedPapers.length} Papers
                  </div>
                </div>

                {isLoadingAcceptedPapers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading accepted papers...
                  </div>
                ) : acceptedPapers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    No accepted papers yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">
                            Title
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Author
                          </th>
                          <th className="px-4 py-3 text-right font-semibold">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptedPapers.map((paper) => (
                          <tr
                            key={paper.paper_id}
                            className="border-t border-border hover:bg-accent/30"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              {paper.title}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {paper.author_name || "Unknown Author"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate({
                                    to: "/papers/$paperId",
                                    params: {
                                      paperId: String(paper.paper_id),
                                    },
                                  })
                                }
                              >
                                View Detail
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                <ConferenceRegistrationPanel
                  conferenceId={conferenceId}
                  conferenceName={conference.conf_name}
                  conferenceStartDate={conference.start_date}
                />

                <ConferenceAwardsLeaderboard
                  leaderboard={leaderboardByAward}
                  isLoading={isLoadingLeaderboard}
                />

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
                    Quick Information
                  </h3>
                  <ul className="space-y-4 text-sm">
                    <li className="flex items-start">
                      <div className="mr-3 shrink-0 rounded-md bg-primary/10 p-1.5 text-primary">
                        <Info className="h-4 w-4" />
                      </div>
                      <span className="pt-0.5 text-muted-foreground">
                        Multi-chair sessions are displayed directly in the
                        agenda.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-3 shrink-0 rounded-md bg-emerald-50 p-1.5 text-emerald-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="pt-0.5 text-muted-foreground">
                        Session chair cards now render every assigned chair.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Session</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the session "
                {sessionToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (sessionToDelete) {
                    deleteSessionMutation.mutate({
                      sessionId: sessionToDelete.id,
                    });
                    setDeleteConfirmOpen(false);
                  }
                }}
                disabled={deleteSessionMutation.isPending}
              >
                {deleteSessionMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isCheckinModalOpen && (
          <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Dialog
              open={deleteConfirmOpen}
              onOpenChange={setDeleteConfirmOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Session</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete the session "
                    {sessionToDelete?.name}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (sessionToDelete) {
                        deleteSessionMutation.mutate({
                          sessionId: sessionToDelete.id,
                        });
                        setDeleteConfirmOpen(false);
                      }
                    }}
                    disabled={deleteSessionMutation.isPending}
                  >
                    {deleteSessionMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-border">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold text-foreground flex items-center">
                  <QrCode className="w-5 h-5 mr-2 text-primary" />
                  Open Check-in Scanner
                </h3>
                <button
                  onClick={() => setIsCheckinModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-accent transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Select sessions to handle check-in now. Scanned attendees will
                  be marked as attended for selected sessions.
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-2">
                  {sessions.map((session) => (
                    <label
                      key={session.session_id}
                      className="flex items-center p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary rounded border-input focus:ring-ring cursor-pointer"
                        checked={selectedSessionsForCheckin.includes(
                          session.session_id,
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSessionsForCheckin([
                              ...selectedSessionsForCheckin,
                              session.session_id,
                            ]);
                          } else {
                            setSelectedSessionsForCheckin(
                              selectedSessionsForCheckin.filter(
                                (id) => id !== session.session_id,
                              ),
                            );
                          }
                        }}
                      />
                      <span className="ml-3 text-sm font-medium text-foreground">
                        {session.session_name}
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
    </DefaultLayout>
  );
};

export default ConferenceDetailPage;
