import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  MapPin,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import { useConferenceDetailQuery } from "@/features/conferences/services/queries";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Route } from "@/routes/conferences/$conferenceId";
import { supabase } from "@/lib/supabase";
import { useToggleMeetMutation } from "@/features/sessions/services/mutations";
import { ConferenceSessionDisplay } from "./components/ConferenceSessionDisplay";

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

  const conference = conferenceDetail?.conference ?? null;
  const sessions = conferenceDetail?.sessions ?? [];
  const canEdit = checkRoles([Role.ADMIN, Role.SECRETARIAT]);
  const toggleMeetMutation = useToggleMeetMutation();

  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(
    new Set(),
  );

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
        <div className="relative overflow-hidden rounded-b-[2rem] lg:rounded-b-[3rem] border-b border-white/10 shadow-2xl">
          <div className="absolute inset-0 bg-slate-950" />
          {bannerUrls.length > 0 && (
            <div className="absolute inset-0">
              <img
                src={bannerUrls[0]}
                alt=""
                className="h-full w-full object-cover opacity-40"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
          
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-12 pb-20 sm:px-6 lg:px-8 lg:pt-16 lg:pb-28">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                className="bg-white/10 border-white/10 text-white backdrop-blur-md hover:bg-white/20"
                onClick={() => navigate({ to: "/conferences" })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Button>

              {canEdit && (
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/10 text-white backdrop-blur-md hover:bg-white/20"
                  onClick={() =>
                    navigate({
                      to: "/sessions",
                      search: { conferenceId, sessionId: undefined },
                    })
                  }
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Sessions
                </Button>
              )}
            </div>

            <div className="max-w-4xl mb-4">
              <div className="mb-4 inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                {conference.status} Conference
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl drop-shadow-sm">
                {conference.conf_name}
              </h1>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/80 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {formatDateRange(
                      conference.start_date,
                      conference.end_date,
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{conference.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-8">
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
                                          to: "/sessions",
                                          search: {
                                            conferenceId,
                                            sessionId: session.session_id,
                                          },
                                        })
                                      }
                                      onToggleMeet={(payload) =>
                                        toggleMeetMutation.mutate(payload)
                                      }
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
            </div>

            <aside className="w-full shrink-0 lg:w-80">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
                  <h3 className="mb-2 text-xl font-bold">
                    Conference Overview
                  </h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Use the agenda to review session details and inspect
                    assigned chairs.
                  </p>
                  <Button
                    onClick={() => navigate({ to: "/conferences" })}
                    className="w-full justify-center"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Conferences
                  </Button>
                </div>

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
      </div>
    </DefaultLayout>
  );
};

export default ConferenceDetailPage;
