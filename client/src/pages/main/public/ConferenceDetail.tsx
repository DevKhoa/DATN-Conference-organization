import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Mail,
  Info,
  Loader2,
  Image as ImageIcon,
  ChevronRight,
  Settings,
  CheckCircle2,
  QrCode,
  X,
  Ticket,
  AlertCircle,
  CreditCard,
  CheckCircle,
  Video,
  Youtube,
  Eye,
  EyeOff,
  Globe,
  Monitor,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/conferences/$conferenceId";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  useConferenceDetailQuery,
  useConferenceTicketsQuery,
} from "@/features/conferences/services/queries";
import { useMyAgendaSessionsQuery } from "@/features/sessions/services/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateRegistrationMutation } from "@/features/registrations/services/mutations";
import { useToggleMeetMutation } from "@/features/sessions/services/mutations";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type ChairDisplayPerson = {
  user_id: number;
  full_name: string | null;
  email: string | null;
  description: string | null;
  avatar_url: string | null;
};

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

const formatTimeOnly = (isoString: string | null) => {
  if (!isoString) return "N/A";

  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDateRange = (start: string | null, end: string | null) => {
  if (!start || !end) return "Date TBD";

  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
};

const formatTicketPrice = (price: number | null, currency = "VND") => {
  if (!price) return "Free";
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const stripMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s*/g, "") // Remove headings ##, ###
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // Remove **bold** and *italic*
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1") // Remove __bold__ and _italic_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove [link](url)
    .replace(/`[^`]+`/g, "") // Remove `code`
    .replace(/\n{2,}/g, " ") // Multiple newlines to space
    .replace(/\n/g, " ") // Single newlines to space
    .trim();
};

const ChairSection: React.FC<{ chair: ChairDisplayPerson }> = ({ chair }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-8 bg-muted/40 rounded-2xl p-5 border border-border flex flex-col sm:flex-row gap-5 transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="shrink-0">
        <div className="w-16 h-16 rounded-full bg-card p-1 shadow-sm border border-border">
          <div className="w-full h-full rounded-full overflow-hidden bg-muted relative">
            {chair.avatar_url ? (
              <img
                src={chair.avatar_url}
                alt={chair.full_name || "Chair"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xl">
                {(chair.full_name || "U").charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grow">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">
            Session Chair
          </span>
        </div>

        <h4 className="text-lg font-bold text-foreground">{chair.full_name}</h4>

        {chair.email && (
          <div className="mt-1 flex items-center text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            <a href={`mailto:${chair.email}`}>{chair.email}</a>
          </div>
        )}

        {chair.description && (() => {
          const cleanBio = stripMarkdown(chair.description);
          const isLongDescription = cleanBio.length > 150;
          return (
          <div className="mt-3 text-sm text-foreground leading-relaxed relative">
            <p
              className={!isExpanded && isLongDescription ? "line-clamp-2" : ""}
            >
              {cleanBio}
            </p>
            {isLongDescription && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 text-primary font-medium text-xs flex items-center hover:underline focus:outline-none"
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
          );
        })()}
      </div>
    </div>
  );
};

const ConferenceDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { conferenceId: conferenceIdParam } = Route.useParams();
  const conferenceId = Number(conferenceIdParam);
  const { checkRoles, session: authSession, roles } = useAuth();

  const {
    data: conferenceDetail,
    isLoading: conferenceLoading,
    error: conferenceQueryError,
  } = useConferenceDetailQuery(conferenceId);
  const conference = conferenceDetail?.conference ?? null;
  const sessions = conferenceDetail?.sessions ?? [];
  const error = conferenceQueryError
    ? conferenceQueryError instanceof Error
      ? conferenceQueryError.message
      : "Failed to load conference details."
    : "";

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(
    new Set(),
  );

  const { data: myAgendaSessions = [] } = useMyAgendaSessionsQuery();
  const allowedSessionIds = useMemo(() => new Set(myAgendaSessions.map((s) => s.session_id)), [myAgendaSessions]);

  const [meetToggleConfirmOpen, setMeetToggleConfirmOpen] = useState(false);
  const [pendingMeetToggle, setPendingMeetToggle] = useState<{
    sessionId: number;
    isActive: boolean;
    message: string;
    sessionName: string;
  } | null>(null);

  const checkMeetToggleConfirmation = (sessionObj: any, nextActive: boolean) => {
    if (!sessionObj.start_time || !sessionObj.end_time) return { needsConfirm: false, message: "" };

    const now = Date.now();
    const sessionStart = new Date(sessionObj.start_time).getTime();
    const sessionEnd = new Date(sessionObj.end_time).getTime();

    if (nextActive) {
      const isEarly = now < (sessionStart - 15 * 60 * 1000);
      const isLate = now > sessionEnd;
      if (isEarly || isLate) {
        return {
          needsConfirm: true,
          message: `The session "${sessionObj.session_name}" has not started yet (earlier than 15 minutes before start) or has already ended. Are you sure you want to activate the virtual room?`
        };
      }
    } else {
      const isAutoOpenWindow = now >= (sessionStart - 15 * 60 * 1000) && now <= sessionEnd;
      if (isAutoOpenWindow) {
        return {
          needsConfirm: true,
          message: `The session "${sessionObj.session_name}" is about to start or is currently ongoing. Deactivating the virtual room will prevent participants from joining. Are you sure you want to proceed?`
        };
      }
    }

    return { needsConfirm: false, message: "" };
  };

  const renderMeetButton = (session: any) => {
    if (session.meet_link === undefined) return null;


    const nowVal = Date.now();
    const sessionStart = session.start_time ? new Date(session.start_time).getTime() : 0;
    const sessionEnd = session.end_time ? new Date(session.end_time).getTime() : 0;
    const isTimeForAutoJoin = nowVal >= sessionStart - 15 * 60 * 1000 && nowVal <= sessionEnd;

    // Determine if button is active
    let isMeetBtnActive = false;
    if (!session.meet_link) {
      isMeetBtnActive = false;
    } else if (session.is_meet_active === true) {
      // Ensure the room is only active within the session time window
      isMeetBtnActive = nowVal >= sessionStart && nowVal <= sessionEnd;
    } else if (session.is_meet_active === false) {
      isMeetBtnActive = false;
    } else {
      isMeetBtnActive = isTimeForAutoJoin;
    }

    return (
      <div className="flex items-center gap-1 group/meet animate-in slide-in-from-right-2 duration-300">
        <button
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-1.5 shadow-sm border ${
            isMeetBtnActive
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white hover:shadow-indigo-200 border-transparent"
              : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
          } shrink-0`}
          onClick={(e) => {
            e.stopPropagation();
            if (isMeetBtnActive) {
              window.open(session.meet_link, "_blank");
            } else {
              toast.info("Room is not available now", {
                description: "The organizer has not opened this virtual room yet.",
              });
            }
          }}
        >
          <Video className="w-3.5 h-3.5" />
          Join Virtual Meeting
        </button>

        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextActive = !(session.is_meet_active ?? true);
              const { needsConfirm, message } = checkMeetToggleConfirmation(session, nextActive);
              if (needsConfirm) {
                setPendingMeetToggle({
                  sessionId: session.session_id,
                  isActive: nextActive,
                  message,
                  sessionName: session.session_name || "Session"
                });
                setMeetToggleConfirmOpen(true);
              } else {
                toggleMeetMutation.mutate({
                  sessionId: session.session_id,
                  isActive: nextActive,
                });
              }
            }}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 shrink-0 ${
              (session.is_meet_active ?? true)
                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200"
            }`}
            title={
              (session.is_meet_active ?? true)
                ? "Deactivate Meeting Room"
                : "Activate Meeting Room"
            }
          >
            {(session.is_meet_active ?? true) ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    );
  };

  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedSessionsForCheckin, setSelectedSessionsForCheckin] = useState<
    number[]
  >([]);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerStep, setRegisterStep] = useState<"tickets" | "checkout">(
    "tickets",
  );
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState("");
  const [isConferenceReady, setIsConferenceReady] = useState(false);

  const [paymentSuccess, setPaymentSuccess] = useState<{
    open: boolean;
    orderCode: string | null;
    ticketName: string;
    ticketType: string;
    currency: string;
    price: number | null;
    sessionDates: string[];
  }>({
    open: false,
    orderCode: null,
    ticketName: "",
    ticketType: "",
    currency: "VND",
    price: null,
    sessionDates: [],
  });

  const canEdit = checkRoles([Role.ADMIN, Role.SECRETARIAT]);
  const userEmail = authSession?.user?.email ?? "";
  const currentUserId = authSession?.user?.user_metadata?.["user_id"] as
    | number
    | undefined;
  const createRegistrationMutation = useCreateRegistrationMutation();
  const toggleMeetMutation = useToggleMeetMutation();

  const isPastEvent = useMemo(() => {
    if (!conference) return false;
    const now = Date.now();
    const endStr = conference.end_date || conference.start_date;
    if (!endStr) return false;
    const endObj = new Date(endStr);
    endObj.setHours(23, 59, 59, 999);
    return now > endObj.getTime();
  }, [conference]);

  const isOpenForSubmission = conference?.open_for_papers && !isPastEvent;

  const { data: conferenceTickets = [], isLoading: ticketsLoading } =
    useConferenceTicketsQuery(conferenceId, isRegisterModalOpen);

  const { data: hasRegistration } = useQuery({
    queryKey: ["user-conference-registration", conferenceId, currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(
          `registration_id, ticket_configs!inner ( ticket_session!inner ( sessions!inner ( conf_id ) ) )`,
        )
        .eq("user_id", currentUserId!)
        .eq("ticket_configs.ticket_session.sessions.conf_id", conferenceId!);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!currentUserId && !!conferenceId,
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

  useEffect(() => {
    if (bannerUrls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerUrls.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [bannerUrls]);

  // Detect PayOS return redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const orderCode = params.get("orderCode");
    const cancel = params.get("cancel");

    if (status === "PAID" && cancel === "false" && orderCode) {
      // Find the ticket user just purchased from available tickets
      const paidTicket = conferenceTickets.find(
        (t) => t.ticket_id !== undefined,
      );

      // Build unique session dates
      const sessionDates: string[] = [];
      if (paidTicket) {
        const dateSet = new Set<string>();
        paidTicket.sessions.forEach((s) => {
          if (s.start_time) {
            const dateStr = new Date(s.start_time).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            dateSet.add(dateStr);
          }
        });
        sessionDates.push(...dateSet);
      }

      const isFullConference =
        paidTicket &&
        sessions.length > 0 &&
        paidTicket.sessions.length === sessions.length;

      setPaymentSuccess({
        open: true,
        orderCode,
        ticketName: paidTicket?.ticket_name ?? "Conference Ticket",
        ticketType: isFullConference
          ? "Full Conference"
          : sessionDates.length === 1
            ? sessionDates[0]
            : `${sessionDates.length} days`,
        currency: paidTicket?.currency ?? "VND",
        price: paidTicket?.price ?? null,
        sessionDates,
      });

      // Clean URL params
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, [conferenceTickets, sessions]);

  useEffect(() => {
    if (sessions.length === 0) {
      setIsConferenceReady(false);
      return;
    }

    if (isConferenceReady) return;

    const firstDay = sessions[0].start_time
      ? new Date(sessions[0].start_time).toDateString()
      : "Unknown Date";
    setExpandedDays(new Set([firstDay]));
    setExpandedSessions(new Set([sessions[0].session_id]));
    setIsConferenceReady(true);
  }, [sessions, isConferenceReady]);

  const groupedSessions = useMemo(() => {
    type SessionGroupItem = (typeof sessions)[number];
    const groups: { dateStr: string; sessions: SessionGroupItem[] }[] = [];

    sessions.forEach((session) => {
      const dateStr = session.start_time
        ? new Date(session.start_time).toDateString()
        : "Unknown Date";
      let group = groups.find((g) => g.dateStr === dateStr);
      if (!group) {
        group = { dateStr, sessions: [] };
        groups.push(group);
      }
      group.sessions.push(session);
    });

    return groups;
  }, [sessions]);

  const toggleSession = (id: number) => {
    const next = new Set(expandedSessions);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSessions(next);
  };

  const toggleDay = (dateStr: string) => {
    const next = new Set(expandedDays);
    if (next.has(dateStr)) next.delete(dateStr);
    else next.add(dateStr);
    setExpandedDays(next);
  };

  const getBannerImage = () => {
    if (bannerUrls.length > 0) {
      return bannerUrls[currentBannerIndex];
    }

    return "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop";
  };

  const handleOpenCheckinScanner = () => {
    if (selectedSessionsForCheckin.length === 0) return;

    setIsCheckinModalOpen(false);
    navigate({
      to: "/checkin",
      search: { sessionIds: selectedSessionsForCheckin.join(",") },
    });
  };

  const handleOpenRegisterModal = async () => {
    setIsRegisterModalOpen(true);
    setRegisterStep("tickets");
    setSelectedTicketId(null);
    setRegisterError("");
  };

  const handleProceedToCheckout = async () => {
    if (!selectedTicketId) return;

    setRegisterError("");

    try {
      const result = await createRegistrationMutation.mutateAsync({
        ticketId: selectedTicketId,
        returnUrl: window.location.href,
      });

      window.location.href = result.checkout_url;
    } catch (err) {
      setRegisterError((err as Error).message || "An error occurred...");
    }
  };

  if (conferenceLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading conference details...</p>
      </div>
    );
  }

  if (error || !conference) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card p-8 rounded-xl shadow-sm border border-border text-center max-w-md">
          <Info className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Unavailable
          </h2>
          <p className="text-muted-foreground mb-6">
            {error || "Conference not found."}
          </p>
          <Button onClick={() => navigate({ to: "/conferences" })}>
            Return to Conferences
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DefaultLayout meta={{ title: conference.conf_name }}>
      <div className="min-h-screen bg-background font-sans pb-24 text-foreground">
        <div className="relative h-100 lg:h-120 bg-foreground overflow-hidden group">
          <img
            src={getBannerImage()}
            alt={conference.conf_name}
            className="w-full h-full object-cover opacity-90 transition-transform duration-2000 ease-in-out hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-foreground/95 via-foreground/40 to-transparent" />

          <div className="absolute top-6 left-4 right-4 lg:left-8 lg:right-8 z-20 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate({ to: "/conferences" })}
                className="flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground bg-background/10 hover:bg-background/20 backdrop-blur-md px-4 py-2 rounded-full transition-all border border-background/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to List</span>
              </button>

              <div className="flex items-center gap-2 bg-background/10 backdrop-blur-md px-4 py-2 rounded-full border border-background/10 text-primary-foreground/90 animate-in fade-in slide-in-from-left-4 duration-500">
                {conference.format_type?.toLowerCase() === "virtual" && (
                  <Monitor className="w-4 h-4 text-indigo-400" />
                )}
                {conference.format_type?.toLowerCase() === "in-person" && (
                  <MapPin className="w-4 h-4 text-emerald-400" />
                )}
                {conference.format_type?.toLowerCase() === "hybrid" && (
                  <Globe className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-widest">
                  {conference.format_type || "In-person"}
                </span>
              </div>
            </div>

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

              {roles.includes(Role.ADMIN) && sessions.length > 0 && (
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
                      {sessions.map((s) => (
                        <button
                          key={s.session_id}
                          onClick={() =>
                            navigate({
                              to: "/attendances",
                              search: {
                                conferenceId,
                                sessionId: s.session_id,
                              },
                            })
                          }
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between group/item"
                        >
                          <span className="font-medium truncate mr-2">
                            {s.session_name}
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
                      to: "/sessions/assign",
                      search: { conferenceId, sessionId: undefined },
                    })
                  }
                  variant="outline"
                  className="bg-background/10 backdrop-blur-md border-background/20 text-primary-foreground hover:bg-background/20"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Assign Sessions
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

          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 z-10 max-w-7xl mx-auto">
            <div className="animate-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide mb-4 shadow-lg shadow-primary/30">
                {conference.status} Conference
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 leading-tight drop-shadow-xl tracking-tight">
                {conference.conf_name}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-primary-foreground/80 text-sm md:text-base font-medium">
                <div className="flex items-center gap-2 bg-foreground/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-background/10">
                  <Calendar className="w-4 h-4 text-primary-foreground/70" />
                  <span>
                    {formatDateRange(
                      conference.start_date,
                      conference.end_date,
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-foreground/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-background/10">
                  <MapPin className="w-4 h-4 text-primary-foreground/70" />
                  <span>{conference.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div
                className={`rounded-2xl border p-5 flex items-start sm:items-center gap-4 shadow-sm ${
                  isOpenForSubmission
                    ? "bg-linear-to-r from-emerald-50 to-teal-50 border-emerald-100"
                    : "bg-linear-to-r from-rose-50 to-pink-50 border-rose-100"
                }`}
              >
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    isOpenForSubmission
                      ? "bg-white text-emerald-600 shadow-sm border border-emerald-100"
                      : "bg-white text-rose-600 shadow-sm border border-rose-100"
                  }`}
                >
                  {isOpenForSubmission ? (
                    <FileText className="w-6 h-6" />
                  ) : (
                    <Info className="w-6 h-6" />
                  )}
                </div>
                <div className="grow">
                  <h3
                    className={`font-bold text-base mb-1 ${
                      isOpenForSubmission ? "text-emerald-900" : "text-rose-900"
                    }`}
                  >
                    {isOpenForSubmission
                      ? "Call for Papers is Active"
                      : "Submissions Closed"}
                  </h3>
                  <p
                    className={`text-sm ${
                      isOpenForSubmission ? "text-emerald-800" : "text-rose-800"
                    }`}
                  >
                    {isOpenForSubmission
                      ? "This conference is still open for paper submissions."
                      : "This conference is no longer accepting paper submissions."}
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    About the Conference
                  </h2>
                </div>

                <div className="prose prose-slate max-w-none text-foreground/80 leading-relaxed mb-8">
                  {conference.description?.split("\n").map((paragraph, idx) => (
                    <p key={idx} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {bannerUrls.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-border">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2 text-primary" />
                      Event Gallery
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {bannerUrls.map((url, index) => (
                        <div
                          key={index}
                          className="group relative aspect-video rounded-xl overflow-hidden bg-muted cursor-pointer shadow-sm hover:shadow-md transition-all"
                        >
                          <img
                            src={url}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Agenda & Sessions
                    </h2>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full border border-border">
                    {sessions.length} Sessions
                  </div>
                </div>

                <div className="space-y-0 relative">
                  {groupedSessions.length === 0 ? (
                    <div className="bg-card p-12 text-center rounded-2xl border-2 border-dashed border-border">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        No sessions scheduled yet.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-7.25 top-8 bottom-4 w-0.5 bg-border/80 z-0 hidden sm:block" />

                      {groupedSessions.map((group) => {
                        const isDayExpanded = expandedDays.has(group.dateStr);
                        const dateInfo = formatDateHeader(
                          group.sessions[0].start_time,
                        );

                        return (
                          <div key={group.dateStr} className="mb-4 relative">
                            <div
                              className="relative pt-4 pb-4 cursor-pointer group/dayheader"
                              onClick={() => toggleDay(group.dateStr)}
                            >
                              <div className="flex items-center gap-4 relative z-10 hover:bg-accent/50 p-2 rounded-xl transition-colors -ml-2">
                                <div
                                  className={`flex flex-col items-center justify-center text-white rounded-xl shadow-lg w-16 h-16 shrink-0 border-4 border-slate-50 transition-colors ${
                                    isDayExpanded
                                      ? "bg-primary shadow-primary/20"
                                      : "bg-muted-foreground shadow-muted/20"
                                  }`}
                                >
                                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                                    {dateInfo.weekday.substring(0, 3)}
                                  </span>
                                  <span className="text-xl font-extrabold">
                                    {dateInfo.day}
                                  </span>
                                </div>
                                <div className="grow">
                                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    {dateInfo.weekday}
                                    {isDayExpanded ? (
                                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </h3>
                                  <p className="text-muted-foreground font-medium">
                                    {dateInfo.monthYear}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {isDayExpanded && (
                              <div className="relative mt-2 pb-8">
                                <div className="absolute left-7.25 top-0 bottom-12 w-0.5 bg-slate-200 z-0" />

                                {group.sessions.map((session, idx) => {
                                  const isExpanded = expandedSessions.has(
                                    session.session_id,
                                  );
                                  const startTime = formatTimeOnly(
                                    session.start_time,
                                  );
                                  const endTime = formatTimeOnly(
                                    session.end_time,
                                  );

                                  return (
                                    <div
                                      key={session.session_id}
                                      className={`group flex gap-4 md:gap-6 relative ${idx === group.sessions.length - 1 ? "mb-0" : "mb-8"}`}
                                    >
                                      <div className="flex flex-col items-center shrink-0 w-16 z-10">
                                        <div className="bg-muted py-2 flex flex-col items-center w-full">
                                          <span
                                            className={`text-sm font-bold font-mono tracking-tight ${
                                              isExpanded
                                                ? "text-primary"
                                                : "text-muted-foreground"
                                            }`}
                                          >
                                            {startTime}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground font-medium mb-3">
                                            {endTime}
                                          </span>
                                          <div
                                            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 relative bg-white ${
                                              isExpanded
                                                ? "border-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)] scale-110"
                                                : "border-border group-hover:border-primary/40"
                                            }`}
                                          >
                                            {isExpanded && (
                                              <div className="absolute inset-0.5 rounded-full bg-primary" />
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div
                                        className={`grow bg-white rounded-2xl transition-all duration-300 border relative z-10 ${
                                          isExpanded
                                            ? "shadow-lg border-primary/30 ring-1 ring-primary/20 translate-x-1"
                                            : "shadow-sm border-border hover:shadow-md hover:border-border/80"
                                        }`}
                                      >
                                        <div
                                          onClick={() =>
                                            toggleSession(session.session_id)
                                          }
                                          className="p-5 md:p-6 cursor-pointer"
                                        >
                                          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
                                            <div
                                              className={`text-lg md:text-xl font-bold transition-colors flex items-start gap-3 flex-1 min-w-[280px] ${
                                                isExpanded
                                                  ? "text-primary"
                                                  : "text-foreground group-hover:text-primary"
                                              }`}
                                            >
                                              <div className="p-2 bg-muted rounded-xl text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0 mt-0.5">
                                                {session.format_type?.toLowerCase() ===
                                                  "virtual" && (
                                                  <Monitor className="w-4 h-4" />
                                                )}
                                                {session.format_type?.toLowerCase() ===
                                                  "in-person" && (
                                                  <MapPin className="w-4 h-4" />
                                                )}
                                                {!session.format_type &&
                                                  conference.format_type?.toLowerCase() ===
                                                    "virtual" && (
                                                    <Monitor className="w-4 h-4" />
                                                  )}
                                                {!session.format_type &&
                                                  conference.format_type?.toLowerCase() !==
                                                    "virtual" && (
                                                    <MapPin className="w-4 h-4" />
                                                  )}
                                              </div>
                                              <div className="flex flex-col min-w-0">
                                                <span>
                                                  {session.session_name}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                                                  {session.room_location ||
                                                    (session.format_type ===
                                                    "virtual"
                                                      ? "Virtual Session"
                                                      : "No Location Set")}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 ml-auto transition-all">
                                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                                {session.format_type !==
                                                  "in-person" &&
                                                  (canAccessVirtual || allowedSessionIds.has(session.session_id)) && (
                                                    <>
                                                      {renderMeetButton(session)}
                                                      {session.record_video_url !==
                                                        undefined && (
                                                        <button
                                                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-1.5 shadow-sm border animate-in slide-in-from-right-2 duration-300 ${
                                                            session.record_video_url
                                                              ? "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white hover:shadow-rose-200 border-transparent"
                                                              : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                                                          } shrink-0`}
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (
                                                              session.record_video_url
                                                            ) {
                                                              window.open(
                                                                session.record_video_url,
                                                                "_blank",
                                                              );
                                                            } else {
                                                              toast.info(
                                                                "Recorded video is not available now",
                                                                {
                                                                  description:
                                                                    "The recording will be uploaded after the conference concludes.",
                                                                },
                                                              );
                                                            }
                                                          }}
                                                        >
                                                          {session.record_video_url?.includes("youtube.com") ||
                                                          session.record_video_url?.includes("youtu.be") ? (
                                                            <Youtube className="w-3.5 h-3.5" />
                                                          ) : (
                                                            <Video className="w-3.5 h-3.5" />
                                                          )}
                                                          Watch Recording
                                                        </button>
                                                      )}
                                                    </>
                                                  )}

                                                {canEdit && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigate({
                                                        to: "/sessions/assign",
                                                        search: {
                                                          conferenceId,
                                                          sessionId:
                                                            session.session_id,
                                                        },
                                                      });
                                                    }}
                                                    className="text-xs font-bold text-muted-foreground bg-muted hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg transition-colors border border-border shrink-0"
                                                  >
                                                    Edit Session
                                                  </button>
                                                )}
                                              </div>

                                              <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                  isExpanded
                                                    ? "bg-primary/10 text-primary rotate-180"
                                                    : "bg-muted text-muted-foreground"
                                                }`}
                                              >
                                                <ChevronDown className="w-5 h-5" />
                                              </div>
                                            </div>
                                          </div>

                                          {!isExpanded && session.chair && (
                                            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in duration-300">
                                              <span className="text-xs font-semibold uppercase text-muted-foreground">
                                                Chair:
                                              </span>
                                              <div className="flex items-center gap-2">
                                                {session.chair.avatar_url ? (
                                                  <img
                                                    src={
                                                      session.chair.avatar_url
                                                    }
                                                    className="w-5 h-5 rounded-full object-cover"
                                                    alt=""
                                                  />
                                                ) : (
                                                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                                                    {(
                                                      session.chair.full_name ||
                                                      "U"
                                                    ).charAt(0)}
                                                  </div>
                                                )}
                                                <span className="font-medium text-foreground">
                                                  {session.chair.full_name}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {isExpanded && (
                                          <div className="px-5 md:px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                                            <hr className="border-border mb-6" />

                                            {session.chair && (
                                              <ChairSection
                                                chair={session.chair}
                                              />
                                            )}

                                            <div>
                                              <h4 className="flex items-center text-sm font-bold text-foreground uppercase tracking-wide mb-4">
                                                <FileText className="w-4 h-4 mr-2 text-primary" />
                                                Presentations
                                              </h4>

                                              <div className="space-y-4">
                                                {session.session_papers &&
                                                session.session_papers.length >
                                                  0 ? (
                                                  session.session_papers.map(
                                                    (sp, paperIdx) => (
                                                      <div
                                                        key={sp.paper.paper_id}
                                                        className="bg-muted/40 hover:bg-card border border-transparent hover:border-border hover:shadow-sm rounded-xl p-4 transition-all duration-200 group/paper"
                                                      >
                                                        <div className="flex gap-4">
                                                          <div className="hidden sm:flex flex-col items-center justify-center w-8 pt-1">
                                                            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center group-hover/paper:bg-primary group-hover/paper:text-primary-foreground transition-colors">
                                                              {paperIdx + 1}
                                                            </div>
                                                          </div>
                                                          <div className="grow">
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                                                              <h5 className="text-base font-bold text-foreground group-hover/paper:text-primary transition-colors">
                                                                {sp.paper.title}
                                                              </h5>
                                                              {(sp.start_time ||
                                                                sp.end_time) && (
                                                                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0 whitespace-nowrap">
                                                                  {sp.start_time
                                                                    ? formatTimeOnly(
                                                                        sp.start_time,
                                                                      )
                                                                    : ""}{" "}
                                                                  -{" "}
                                                                  {sp.end_time
                                                                    ? formatTimeOnly(
                                                                        sp.end_time,
                                                                      )
                                                                    : ""}
                                                                </span>
                                                              )}
                                                            </div>
                                                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                                                              <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                                              <span className="font-medium">
                                                                {sp.paper.author
                                                                  ?.full_name ||
                                                                  "Unknown Author"}
                                                              </span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                              {
                                                                sp.paper
                                                                  .abstract
                                                              }
                                                            </p>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ),
                                                  )
                                                ) : (
                                                  <div className="text-sm text-muted-foreground italic px-4">
                                                    No papers assigned yet.
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
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
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {canEdit && (
                  <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 flex items-center">
                      <Settings className="w-4 h-4 mr-2 text-primary" />
                      Admin Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Button
                        onClick={() =>
                          navigate({
                            to: "/conferences/$conferenceId/import-papers",
                            params: { conferenceId: conferenceId.toString() },
                          })
                        }
                        className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none font-semibold transition-colors"
                        variant="outline"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Bulk Import Papers
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-2xl shadow-xl p-6 text-center border border-primary/30">
                  <h3 className="text-xl font-bold mb-2 relative z-10">
                    Registration Open
                  </h3>
                  <p className="text-primary/80 text-sm mb-6 relative z-10">
                    Secure your spot today. Early bird discounts available until{" "}
                    {conference.start_date
                      ? new Date(conference.start_date).toLocaleDateString()
                      : "N/A"}
                    .
                  </p>

                  <Button
                    onClick={handleOpenRegisterModal}
                    className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-none font-bold"
                  >
                    Register Now <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">
                    Quick Information
                  </h3>
                  <ul className="space-y-4 text-sm">
                    <li className="flex items-start">
                      <div className="p-1.5 bg-primary/10 text-primary rounded-md mr-3 shrink-0">
                        <Info className="w-4 h-4" />
                      </div>
                      <span className="text-muted-foreground pt-0.5">
                        Hybrid event supporting both in-person and virtual
                        attendance.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md mr-3 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-muted-foreground pt-0.5">
                        Proceedings will be indexed in Scopus and Web of
                        Science.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-border">
              <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  {registerStep === "tickets"
                    ? "Choose Your Ticket"
                    : "Confirm & Pay"}
                </h3>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-accent transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto grow">
                {!userEmail ? (
                  <div className="text-center py-10">
                    <AlertCircle className="w-12 h-12 mx-auto text-amber-400 mb-4" />
                    <p className="font-bold text-foreground text-lg mb-1">
                      Login Required
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Please log in to register for this conference.
                    </p>
                  </div>
                ) : ticketsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Loading available tickets...
                    </p>
                  </div>
                ) : registerStep === "tickets" ? (
                  <>
                    {conferenceTickets.length === 0 ? (
                      <div className="text-center py-10">
                        <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="font-semibold text-foreground mb-1">
                          No tickets available
                        </p>
                        <p className="text-muted-foreground text-sm">
                          There are no active tickets for this conference yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Select the ticket you would like to purchase.
                        </p>

                        {conferenceTickets.map((ticket) => {
                          const soldOut =
                            ticket.quantity_limit !== null &&
                            (ticket.sold_quantity || 0) >=
                              ticket.quantity_limit;
                          const isSelected =
                            selectedTicketId === ticket.ticket_id;
                          const remaining =
                            ticket.quantity_limit !== null
                              ? ticket.quantity_limit -
                                (ticket.sold_quantity || 0)
                              : null;

                          return (
                            <div
                              key={ticket.ticket_id}
                              onClick={() =>
                                !soldOut &&
                                setSelectedTicketId(ticket.ticket_id)
                              }
                              className={`rounded-xl border-2 p-4 transition-all ${
                                soldOut
                                  ? "border-border bg-muted/40 opacity-60 cursor-not-allowed"
                                  : isSelected
                                    ? "border-primary bg-primary/10 cursor-pointer shadow-md"
                                    : "border-border hover:border-primary/30 hover:bg-accent cursor-pointer"
                              }`}
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-3 grow min-w-0">
                                  <div
                                    className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                      isSelected
                                        ? "border-primary bg-primary"
                                        : "border-border"
                                    }`}
                                  >
                                    {isSelected && (
                                      <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="font-bold text-foreground">
                                      {ticket.ticket_name}
                                    </p>
                                    {ticket.description && (
                                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                        {ticket.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="font-extrabold text-primary text-lg">
                                    {formatTicketPrice(
                                      ticket.price,
                                      ticket.currency ?? "VND",
                                    )}
                                  </p>
                                  {soldOut ? (
                                    <span className="text-xs font-semibold text-destructive">
                                      Sold Out
                                    </span>
                                  ) : remaining !== null ? (
                                    <span className="text-xs text-muted-foreground">
                                      {remaining} left
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {ticket.sessions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                    Included Sessions
                                  </p>

                                  <div className="space-y-1.5">
                                    {ticket.sessions.map((session) => (
                                      <div
                                        key={session.session_id}
                                        className="flex items-center gap-2 text-xs text-muted-foreground"
                                      >
                                        <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                                        <span className="font-medium truncate">
                                          {session.session_name}
                                        </span>
                                        <span className="text-muted-foreground">
                                          .
                                        </span>
                                        <span className="text-muted-foreground whitespace-nowrap">
                                          {formatTimeOnly(session.start_time)}
                                        </span>
                                        {session.room_location && (
                                          <>
                                            <span className="text-muted-foreground">
                                              .
                                            </span>
                                            <span className="text-muted-foreground truncate">
                                              {session.room_location}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  (() => {
                    const ticket = conferenceTickets.find(
                      (t) => t.ticket_id === selectedTicketId,
                    );

                    return ticket ? (
                      <div className="space-y-5">
                        <div className="rounded-xl border border-border bg-muted/40 p-4">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                            Order Summary
                          </p>

                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-foreground">
                                {ticket.ticket_name}
                              </p>
                              {ticket.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {ticket.description}
                                </p>
                              )}
                            </div>
                            <p className="font-extrabold text-primary text-xl ml-4">
                              {formatTicketPrice(
                                ticket.price,
                                ticket.currency ?? "VND",
                              )}
                            </p>
                          </div>

                          {ticket.sessions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border space-y-1">
                              {ticket.sessions.map((session) => (
                                <div
                                  key={session.session_id}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                                  <span>{session.session_name}</span>
                                  <span className="text-muted-foreground">
                                    .
                                  </span>
                                  <span>
                                    {formatTimeOnly(session.start_time)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                            <CreditCard className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              Pay via PayOS
                            </p>
                            <p className="text-xs text-muted-foreground">
                              You will be redirected to PayOS secure checkout to
                              complete payment.
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                          After successful payment, a confirmation email with
                          your QR code will be sent to{" "}
                          <span className="font-medium text-foreground">
                            {userEmail}
                          </span>
                          .
                        </p>
                      </div>
                    ) : null;
                  })()
                )}

                {registerError && (
                  <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {registerError}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-border flex gap-3 shrink-0">
                {!userEmail ? (
                  <Button
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="w-full justify-center"
                  >
                    Close
                  </Button>
                ) : registerStep === "checkout" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRegisterStep("tickets")}
                      className="flex-1 justify-center"
                      disabled={createRegistrationMutation.isPending}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleProceedToCheckout}
                      className="flex-1 justify-center"
                      disabled={createRegistrationMutation.isPending}
                    >
                      {createRegistrationMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Pay with PayOS
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsRegisterModalOpen(false)}
                      className="flex-1 justify-center"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setRegisterStep("checkout")}
                      className="flex-1 justify-center"
                      disabled={
                        !selectedTicketId || conferenceTickets.length === 0
                      }
                    >
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {isCheckinModalOpen && (
          <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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

        {/* Payment Success Modal */}
        {paymentSuccess.open && (
          <div className="fixed inset-0 z-[60] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-border">
              <div className="flex flex-col items-center text-center p-8">
                {/* Animated Checkmark */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div
                    className="absolute -inset-2 rounded-full border-2 border-emerald-500/20 animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                </div>

                <h3 className="text-2xl font-extrabold text-foreground mb-1">
                  Payment Successful!
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Your registration has been confirmed.
                </p>

                {/* Ticket Details Card */}
                <div className="w-full rounded-xl border border-border bg-muted/40 p-5 text-left space-y-3 mb-6">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Conference
                    </p>
                    <p className="font-bold text-foreground text-lg leading-tight">
                      {conference?.conf_name}
                    </p>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        Ticket
                      </p>
                      <p className="font-semibold text-foreground">
                        {paymentSuccess.ticketName}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                        {paymentSuccess.ticketType}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        Amount
                      </p>
                      <p className="font-extrabold text-primary text-lg">
                        {formatTicketPrice(
                          paymentSuccess.price,
                          paymentSuccess.currency,
                        )}
                      </p>
                    </div>
                  </div>

                  {paymentSuccess.sessionDates.length > 0 && (
                    <>
                      <div className="h-px bg-border" />
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Schedule
                        </p>
                        <div className="space-y-1">
                          {paymentSuccess.sessionDates.map((d) => (
                            <div
                              key={d}
                              className="flex items-center gap-2 text-sm text-foreground"
                            >
                              <Calendar className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                              <span>{d}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-5">
                  A confirmation email with your QR check-in code has been sent
                  to your inbox.
                </p>

                <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPaymentSuccess((p) => ({ ...p, open: false }))
                    }
                    className="flex-1 justify-center"
                  >
                    Stay Here
                  </Button>
                  <Button
                    onClick={() => navigate({ to: "/" })}
                    className="flex-1 justify-center"
                  >
                    Go to Homepage
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog open={meetToggleConfirmOpen} onOpenChange={setMeetToggleConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>
                {pendingMeetToggle?.message}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMeetToggleConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (pendingMeetToggle) {
                    toggleMeetMutation.mutate({
                      sessionId: pendingMeetToggle.sessionId,
                      isActive: pendingMeetToggle.isActive,
                    });
                    setMeetToggleConfirmOpen(false);
                  }
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DefaultLayout>
  );
};

export default ConferenceDetailPage;
