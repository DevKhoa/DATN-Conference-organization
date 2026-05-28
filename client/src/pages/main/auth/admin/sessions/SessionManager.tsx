import React, { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  X,
  Zap,
  Layers,
  FileText,
  GripVertical,
  Search as SearchIcon,
  ChevronDown,
  ChevronUp,
  Video,
  Youtube,
  Link as LinkIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import useAuth from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  SimpleDateTimePicker,
  SimpleTimePicker,
} from "@/components/ui/date-time-picker";
import {
  useAutoGenerateSessionsMutation,
  useSaveSessionsMutation,
  useDeleteMeetMutation,
  useCreateMeetMutation,
  useUpdateMeetMutation,
  useDeleteSessionMutation,
} from "@/features/sessions/services/mutations";
import { useExistingSessionsQuery } from "@/features/sessions/services/queries";
import { LocalSession, SessionPaperDetail } from "@/features/sessions/types";
import { useAcceptedPapersQuery } from "@/features/papers/services/queries";
import { useConferenceDetailQuery } from "@/features/conferences/services/queries";
import { formatToLocal } from "@/utils/time";

const isOnlineMeetingLink = (url: string): boolean => {
  if (!url) return true;
  const pattern =
    /^(https?:\/\/)?([a-zA-Z0-9-]+\.)*(meet\.google\.com|zoom\.us|zoom\.com|zoom\.com\.cn|teams\.microsoft\.com|teams\.live\.com|webex\.com|skype\.com|meet\.jit\.si|discord\.gg|discord\.com)\b/i;
  return pattern.test(url.trim());
};

const SessionManagerPage = ({
  conferenceId,
  initialSessionId,
}: {
  conferenceId: string;
  initialSessionId?: string;
}) => {
  const navigate = useNavigate();
  const conferenceIdNum = Number(conferenceId);
  const sessionIdNum = Number(initialSessionId);

  // Query hooks
  const {
    data: acceptedPapers = [],
    isLoading: isLoadingPapers,
    error: papersError,
  } = useAcceptedPapersQuery(conferenceIdNum);

  const { data: existingSessions = [], isLoading: isLoadingExistingSessions } =
    useExistingSessionsQuery(conferenceIdNum, sessionIdNum);

  const { data: conferenceData } = useConferenceDetailQuery(conferenceIdNum);
  const isOnlineConference =
    conferenceData?.conference?.format_type === "virtual";

  // Mutation hooks
  const autoGenerateMutation = useAutoGenerateSessionsMutation();
  const saveSessionsMutation = useSaveSessionsMutation();
  const deleteSessionMutation = useDeleteSessionMutation();
  const deleteMeetMutation = useDeleteMeetMutation();
  const createMeetMutation = useCreateMeetMutation();
  const updateMeetMutation = useUpdateMeetMutation();

  const { session: authSession } = useAuth();
  const currentUserEmail = authSession?.user?.email;

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [authorConflictWarnings, setAuthorConflictWarnings] = useState<
    string[]
  >([]);

  // Create Meet Logic
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [generatingMeetId, setGeneratingMeetId] = useState<string | null>(null);
  const [deletingMeetId, setDeletingMeetId] = useState<string | null>(null);

  const [sessions, setSessions] = useState<LocalSession[]>([]);

  // Drag & Drop State
  const [draggedPaperId, setDraggedPaperId] = useState<number | null>(null);
  const [dragOverSessionId, setDragOverSessionId] = useState<string | null>(
    null,
  );

  const [autoConfig, setAutoConfig] = useState({
    n_session: 3,
    min_paper: 2,
    max_paper: 5,
  });

  const [paperSearchQuery, setPaperSearchQuery] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<
    Record<string, boolean>
  >({});
  const [hiddenPresentations, setHiddenPresentations] = useState<
    Record<string, boolean>
  >({});

  const [hasLoadedSessions, setHasLoadedSessions] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<LocalSession | null>(
    null,
  );

  const BASE_API_URL = import.meta.env.VITE_API_BASE_URL as string;

  // Fetch existing sessions if editing
  React.useEffect(() => {
    if (existingSessions.length > 0 && !hasLoadedSessions) {
      setSessions(existingSessions);
      setHasLoadedSessions(true);
    }
  }, [existingSessions, hasLoadedSessions]);

  const addEmptySession = () => {
    const defaultFormat =
      conferenceData?.conference?.format_type === "hybrid"
        ? "in-person"
        : conferenceData?.conference?.format_type || "in-person";
    const newSession: LocalSession = {
      temp_id: Math.random().toString(36).substr(2, 9),
      session_name: "New Session",
      start_time: "",
      end_time: "",
      room_location: defaultFormat === "virtual" ? "Virtual" : "",
      is_ai_generated: false,
      assigned_papers: [],
      format_type: defaultFormat,
    };
    setSessions([...sessions, newSession]);
  };

  const updateSession = (id: string, field: keyof LocalSession, value: any) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.temp_id !== id) return s;
        const updated = { ...s, [field]: value };
        // Auto-set room_location when format_type changes
        if (field === "format_type") {
          if (value === "virtual") {
            updated.room_location = "Virtual";
          } else if (s.room_location === "Virtual") {
            // Clear auto-set value when switching away from virtual
            updated.room_location = "";
          }
        }
        return updated;
      }),
    );
  };

  const removeSession = (session: LocalSession) => {
    setSessionToDelete(session);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;

    if (sessionToDelete.db_id) {
      try {
        await deleteSessionMutation.mutateAsync({
          sessionId: sessionToDelete.db_id,
        });
        setSuccessMsg("Session deleted successfully.");
      } catch (err: any) {
        setError("Failed to delete session: " + err.message);
        setDeleteConfirmOpen(false);
        return;
      }
    }
    setSessions((prev) =>
      prev.filter((s) => s.temp_id !== sessionToDelete.temp_id),
    );
    setDeleteConfirmOpen(false);
  };

  const updateSessionPaper = (
    sessionId: string,
    paperId: number,
    field: keyof SessionPaperDetail,
    value: string,
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.temp_id !== sessionId) return s;
        return {
          ...s,
          assigned_papers: s.assigned_papers.map((p) =>
            p.paper_id === paperId ? { ...p, [field]: value } : p,
          ),
        };
      }),
    );
  };

  const removePaperFromSession = (sessionId: string, paperId: number) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.temp_id !== sessionId) return s;
        return {
          ...s,
          assigned_papers: s.assigned_papers.filter(
            (p) => p.paper_id !== paperId,
          ),
        };
      }),
    );
  };

  const toggleExpand = (tempId: string) => {
    setExpandedSessions((prev) => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const toggleHidden = (tempId: string) => {
    setHiddenPresentations((prev) => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, paperId: number) => {
    setDraggedPaperId(paperId);
    e.dataTransfer.setData("paperId", paperId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedPaperId(null);
    setDragOverSessionId(null);
  };

  const handleDragOver = (e: React.DragEvent, sessionId: string) => {
    e.preventDefault(); // Cần thiết để cho phép drop
    e.dataTransfer.dropEffect = "move";
    if (dragOverSessionId !== sessionId) {
      setDragOverSessionId(sessionId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, sessionId: string) => {
    e.preventDefault();
    if (dragOverSessionId === sessionId) {
      setDragOverSessionId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSessionId: string) => {
    e.preventDefault();
    setDragOverSessionId(null);
    const paperId = parseInt(e.dataTransfer.getData("paperId"), 10);

    if (!isNaN(paperId)) {
      // Auto-unhide presentations when dropping
      setHiddenPresentations((prev) => ({ ...prev, [targetSessionId]: false }));

      // Auto-expand if more than 5 papers
      const targetSession = sessions.find((s) => s.temp_id === targetSessionId);
      if (targetSession && targetSession.assigned_papers.length >= 5) {
        setExpandedSessions((prev) => ({ ...prev, [targetSessionId]: true }));
      }

      setSessions((prev) =>
        prev.map((s) => {
          if (s.temp_id !== targetSessionId) {
            return {
              ...s,
              assigned_papers: s.assigned_papers.filter(
                (p) => p.paper_id !== paperId,
              ),
            };
          }
          if (!s.assigned_papers.some((p) => p.paper_id === paperId)) {
            return {
              ...s,
              assigned_papers: [
                ...s.assigned_papers,
                { paper_id: paperId, start_time: "", end_time: "" },
              ],
            };
          }
          return s;
        }),
      );
    }
  };
  // -----------------------------

  const handleAutoGenerate = async () => {
    if (acceptedPapers.length === 0) {
      setError("No accepted papers to generate sessions from.");
      return;
    }
    setError("");

    try {
      const payload = {
        paper_ids: acceptedPapers.map((p) => p.paper_id),
        n_session: autoConfig.n_session,
        min_paper: autoConfig.min_paper,
        max_paper: autoConfig.max_paper,
        only_accepted_papers: true,
      };

      const result = await autoGenerateMutation.mutateAsync(payload);

      const paperMap = new Map<string, number>();
      acceptedPapers.forEach((p) =>
        paperMap.set(p.title.trim().toLowerCase(), p.paper_id),
      );

      const newSessions: LocalSession[] = result.sessions.map((aiS) => {
        const mappedIds: number[] = [];
        if (aiS.papers && Array.isArray(aiS.papers)) {
          aiS.papers.forEach((title: string) => {
            const pid = paperMap.get(title.trim().toLowerCase());
            if (pid) mappedIds.push(pid);
          });
        }

        return {
          temp_id: Math.random().toString(36).substr(2, 9),
          db_id: aiS.session_id || aiS.id,
          session_name:
            aiS.name?.replace("AI Generated", "Grouped") || "Grouped Session",
          start_time: "",
          end_time: "",
          room_location:
            conferenceData?.conference?.format_type === "virtual"
              ? "Virtual"
              : "",
          is_ai_generated: true,
          assigned_papers: mappedIds.map((id) => ({
            paper_id: id,
            start_time: "",
            end_time: "",
          })),
          format_type:
            conferenceData?.conference?.format_type === "hybrid"
              ? "in-person"
              : conferenceData?.conference?.format_type || "in-person",
        };
      });

      setSessions(newSessions);
      setSuccessMsg(
        `Successfully grouped into ${newSessions.length} sessions. Please verify Time & Location.`,
      );
    } catch (err: any) {
      const backendErrorMessage =
        err.response?.data?.detail ||
        err.message ||
        "An unknown error occurred.";
      setError("Auto-schedule failed: " + backendErrorMessage);
    }
  };

  const handleCreateMeetLink = async (session: LocalSession) => {
    if (!session.db_id) {
      setError(
        "Please save the session to the database before creating a Meet link.",
      );
      return;
    }
    if (!session.start_time || !session.end_time) {
      setError(
        "Please set the start and end times before creating a Meet link.",
      );
      return;
    }
    const localStart = new Date(formatToLocal(session.start_time));
    const localEnd = new Date(formatToLocal(session.end_time));
    if (localStart >= localEnd) {
      setError("Start time must be before end time.");
      return;
    }
    if (!currentUserEmail) {
      setError("Current user email not found.");
      return;
    }

    setGeneratingMeetId(session.temp_id);
    setError("");
    setSuccessMsg("");

    try {
      // Kiểm tra trạng thái liên kết tài khoản Google từ profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_refresh_token")
        .eq("email", currentUserEmail)
        .single();

      if (!profile || !profile.google_refresh_token) {
        setShowAuthModal(true);
        setGeneratingMeetId(null);
        return;
      }

      const data = await createMeetMutation.mutateAsync({
        sessionId: session.db_id,
        email: currentUserEmail,
      });

      // Success
      updateSession(session.temp_id, "meet_link", data.meet_link);
      updateSession(session.temp_id, "google_event_id", data.event_id);
      setSuccessMsg("Google Meet link created successfully!");
    } catch (err: any) {
      // Check for specific error about linked account
      const detail = err.response?.data?.detail || "";
      if (
        (err.response?.status === 400 || err.response?.status === 500) &&
        (detail.includes("linked") ||
          detail.includes("refresh token") ||
          detail.includes("liên kết"))
      ) {
        setShowAuthModal(true);
      } else {
        const cleanMessage = err.message?.replace(/^\d+:\s*/, "");
        setError("Meet Creation Error: " + cleanMessage);
      }
    } finally {
      setGeneratingMeetId(null);
    }
  };

  const handleRemoveMeetLink = async (session: LocalSession) => {
    if (!session.db_id) {
      // If it's not saved yet, just clear it locally
      updateSession(session.temp_id, "meet_link", "");
      updateSession(session.temp_id, "google_event_id", null);
      return;
    }

    setDeletingMeetId(session.temp_id);
    setError("");
    setSuccessMsg("");

    try {
      if (!currentUserEmail) throw new Error("Missing user email");
      await deleteMeetMutation.mutateAsync({
        sessionId: session.db_id,
        email: currentUserEmail,
      });
      updateSession(session.temp_id, "meet_link", "");
      updateSession(session.temp_id, "google_event_id", null);
      setSuccessMsg("Google Meet link removed successfully!");
    } catch (err: any) {
      const cleanMessage = err.message?.replace(/^\d+:\s*/, "");
      setError("Meet Deletion Error: " + cleanMessage);
    } finally {
      setDeletingMeetId(null);
    }
  };

  const handleRemoveArchiveLink = async (session: LocalSession) => {
    if (!session.db_id) {
      updateSession(session.temp_id, "record_video_url", "");
      return;
    }

    try {
      const { error } = await supabase
        .from("sessions")
        .update({ record_video_url: null })
        .eq("session_id", session.db_id);

      if (error) throw error;

      updateSession(session.temp_id, "record_video_url", "");
      setSuccessMsg("Archive video link removed successfully!");
    } catch (err: any) {
      setError("Error removing archive video link: " + err.message);
    }
  };

  const handleStartGoogleAuthPopup = async () => {
    if (!currentUserEmail) return;
    setIsAuthorizing(true);

    // Open popup synchronously to avoid gesture expiration
    const width = 500;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    // Open a blank page first
    const authWindow = window.open(
      "",
      "GoogleAuth",
      `width=${width},height=${height},top=${top},left=${left}`,
    );

    if (!authWindow) {
      setError("Popup blocked. Please allow popups.");
      setIsAuthorizing(false);
      return;
    }

    try {
      const authUrlRes = await fetch(
        `${BASE_API_URL}/sessions/google-auth-url?email=${encodeURIComponent(currentUserEmail)}`,
      );
      const authUrlData = await authUrlRes.json();

      if (authUrlData.auth_url) {
        // Redirect the already-opened popup
        authWindow.location.href = authUrlData.auth_url;

        // Mechanism 1: postMessage (Traditional)
        const messageListener = (event: MessageEvent) => {
          if (event.data?.type === "google-auth-success") {
            cleanup();
          }
        };
        window.addEventListener("message", messageListener);

        // Mechanism 2: localStorage Polling (Ultra-robust to avoid reloads)
        const pollInterval = setInterval(() => {
          const status = localStorage.getItem("google-auth-status");
          if (status && status.startsWith("success_")) {
            localStorage.removeItem("google-auth-status");
            cleanup();
          }
        }, 1000);

        function cleanup() {
          window.removeEventListener("message", messageListener);
          clearInterval(pollInterval);
          setShowAuthModal(false);
          setSuccessMsg(
            "Authorization successful! You can now create Meet links.",
          );
          if (authWindow && !authWindow.closed) authWindow.close();
        }
      } else {
        authWindow.close();
        setError("Could not initialize authorization flow.");
      }
    } catch (e: any) {
      if (authWindow) authWindow.close();
      const cleanMsg = e.message?.replace(/^\d+:\s*/, "");
      setError("Authorization Error: " + (cleanMsg || "Unknown reason."));
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleSaveSessions = async () => {
    // Reset previous status messages
    setError("");
    setSuccessMsg("");
    setAuthorConflictWarnings([]);

    for (const s of sessions) {
      console.log("raw start:", s.start_time);
      console.log("raw end:", s.end_time);
      console.log("formatted start:", formatToLocal(s.start_time));
      console.log("formatted end:", formatToLocal(s.end_time));
      console.log("parsed start:", dayjs(formatToLocal(s.start_time)).format());
      console.log("parsed end:", dayjs(formatToLocal(s.end_time)).format());
    }
    // 1. STRICT VALIDATION: Missing fields, Time Format, Start > End, Conference Boundary, Paper Time Overlaps
    for (const s of sessions) {
      if (
        !s.session_name ||
        !s.start_time ||
        !s.end_time ||
        (!isOnlineConference && !s.room_location)
      ) {
        setError(
          `Please fill in all details for session: ${s.session_name}${!isOnlineConference ? " (including location)" : ""}`,
        );
        return;
      }

      if (s.meet_link && !isOnlineMeetingLink(s.meet_link)) {
        setError(
          `Invalid meeting link for session "${s.session_name}". Only Google Meet, Zoom, MS Teams, Webex, Skype, Jitsi, or Discord links are allowed.`,
        );
        return;
      }

      const localStart = formatToLocal(s.start_time);
      const localEnd = formatToLocal(s.end_time);

      if (!dayjs(localStart).isValid() || !dayjs(localEnd).isValid()) {
        setError(`Invalid date format for session ${s.session_name}.`);
        return;
      }

      const sessionStart = dayjs(localStart);
      const sessionEnd = dayjs(localEnd);

      // CONSTRAINT 1: Session Start Date > End Date (prevent save)
      if (!sessionStart.isBefore(sessionEnd)) {
        setError(
          `Invalid time for session "${s.session_name}": Start time must be strictly before the end time.`,
        );
        return;
      }

      // NEW CONSTRAINT: Time selected for start_time must not be in the past
      if (sessionStart.isBefore(dayjs())) {
        setError(
          `Invalid time for session "${s.session_name}": Start time cannot be in the past.`,
        );
        return;
      }

      // NEW CONSTRAINT: Session must be on the same day
      if (!sessionStart.isSame(sessionEnd, "day")) {
        setError(
          `Session "${s.session_name}" must start and end on the same day.`,
        );
        return;
      }

      // Check conference boundaries (strictly within)
      if (
        conferenceData?.conference?.start_date &&
        conferenceData?.conference?.end_date
      ) {
        const confStart = dayjs(conferenceData.conference.start_date).startOf(
          "day",
        );
        const confEnd = dayjs(conferenceData.conference.end_date).endOf("day");

        if (!sessionStart.isAfter(confStart) || !sessionEnd.isBefore(confEnd)) {
          setError(
            `Session "${s.session_name}" must be strictly within the conference dates (${confStart.format("MMM D, YYYY")} - ${confEnd.format("MMM D, YYYY")}).`,
          );
          return;
        }
      }

      // NEW CONSTRAINT: Overlap with other sessions (same room, same day)
      for (const other of sessions) {
        if (s.temp_id === other.temp_id) continue;
        if (!other.start_time || !other.end_time) continue;

        if (s.room_location === other.room_location) {
          const otherStart = dayjs(formatToLocal(other.start_time));
          const otherEnd = dayjs(formatToLocal(other.end_time));

          if (sessionStart.isSame(otherStart, "day")) {
            // Overlap condition: S1.start < S2.end && S2.start < S1.end
            if (
              sessionStart.isBefore(otherEnd) &&
              otherStart.isBefore(sessionEnd)
            ) {
              setError(
                `Session "${s.session_name}" overlaps with session "${other.session_name}" in the same room on the same day.`,
              );
              return;
            }
          }
        }
      }

      // CONSTRAINT 3: Paper time in the same session
      const parseTime = (t: string) =>
        t.includes("T")
          ? dayjs(t)
          : dayjs(
              `${sessionStart.format("YYYY-MM-DD")}T${t.length === 5 ? t + ":00" : t}`,
            );

      for (let i = 0; i < s.assigned_papers.length; i++) {
        const p1 = s.assigned_papers[i];
        if (!p1.start_time || !p1.end_time) continue; // Skip if paper time is not set yet

        const p1Start = parseTime(p1.start_time);
        const p1End = parseTime(p1.end_time);

        // Ensure Paper Start < End
        if (!p1Start.isBefore(p1End)) {
          setError(
            `In session "${s.session_name}", Paper #${i + 1} has an invalid time: Start time must be before end time.`,
          );
          return;
        }

        // Ensure Paper time is within Session time
        if (p1Start.isBefore(sessionStart) || p1End.isAfter(sessionEnd)) {
          setError(
            `In session "${s.session_name}", Paper #${i + 1} presentation time must be within the session time limits.`,
          );
          return;
        }

        // Ensure sequential ordering based on presentation order
        if (i > 0) {
          const prevPaper = s.assigned_papers[i - 1];
          if (prevPaper.end_time) {
            const prevEnd = parseTime(prevPaper.end_time);
            if (p1Start.isBefore(prevEnd)) {
              setError(
                `In session "${s.session_name}", Paper #${i + 1} must start after or exactly when Paper #${i} ends.`,
              );
              return;
            }
          }
        }
      }
    }

    // ── Author schedule conflict check (warning only — does not block save) ──
    // Build a map of paper_id → paper title from acceptedPapers for display
    const paperTitleMap = new Map<number, string>(
      acceptedPapers.map((p) => [p.paper_id, p.title]),
    );

    // Collect all papers that have a presentation time set in the current sessions
    type PaperTimeEntry = {
      paper_id: number;
      sessionName: string;
      sessionTempId: string;
      start: dayjs.Dayjs;
      end: dayjs.Dayjs;
    };
    const paperTimeEntries: PaperTimeEntry[] = [];
    for (const s of sessions) {
      if (!s.start_time || !s.end_time) continue;
      const sessionStart = dayjs(formatToLocal(s.start_time));
      const parseTime = (t: string) =>
        t.includes("T")
          ? dayjs(t)
          : dayjs(
              `${sessionStart.format("YYYY-MM-DD")}T${t.length === 5 ? t + ":00" : t}`,
            );
      for (const p of s.assigned_papers) {
        if (!p.start_time || !p.end_time) continue;
        paperTimeEntries.push({
          paper_id: p.paper_id,
          sessionName: s.session_name,
          sessionTempId: s.temp_id,
          start: parseTime(p.start_time),
          end: parseTime(p.end_time),
        });
      }
    }

    const newAuthorWarnings: string[] = [];

    if (paperTimeEntries.length > 0) {
      // Get primary_author_id for all involved papers
      const involvedPaperIds = [
        ...new Set(paperTimeEntries.map((e) => e.paper_id)),
      ];
      const { data: papersData } = await supabase
        .from("papers")
        .select("paper_id, primary_author_id")
        .in("paper_id", involvedPaperIds);

      // Build map: author → list of paper_ids they authored (among involved papers)
      const authorPaperMap = new Map<number, number[]>();
      for (const row of papersData || []) {
        if (!row.primary_author_id) continue;
        const list = authorPaperMap.get(row.primary_author_id) ?? [];
        list.push(row.paper_id);
        authorPaperMap.set(row.primary_author_id, list);
      }

      // For each author that has more than one paper with a time, check cross-session overlap
      for (const [, paperIds] of authorPaperMap.entries()) {
        if (paperIds.length < 2) continue;
        const authorEntries = paperTimeEntries.filter((e) =>
          paperIds.includes(e.paper_id),
        );
        // Check every pair
        for (let i = 0; i < authorEntries.length; i++) {
          for (let j = i + 1; j < authorEntries.length; j++) {
            const a = authorEntries[i];
            const b = authorEntries[j];
            if (a.sessionTempId === b.sessionTempId) continue; // same session, already handled above
            // Overlap: a.start < b.end AND b.start < a.end
            if (a.start.isBefore(b.end) && b.start.isBefore(a.end)) {
              const titleA =
                paperTitleMap.get(a.paper_id) ?? `Paper #${a.paper_id}`;
              const titleB =
                paperTitleMap.get(b.paper_id) ?? `Paper #${b.paper_id}`;
              newAuthorWarnings.push(
                `Author conflict: "${titleA}" (${a.sessionName}, ${a.start.format("HH:mm")}–${a.end.format("HH:mm")}) overlaps with "${titleB}" (${b.sessionName}, ${b.start.format("HH:mm")}–${b.end.format("HH:mm")}).`,
              );
            }
          }
        }
      }
    }

    // Pass all validations
    setError("");
    setAuthorConflictWarnings(newAuthorWarnings);

    const updateMeetSessionIds: number[] = [];
    const manualMeetWarningSessionNames: string[] = [];
    let hasTimeChangedAny = false;
    for (const s of sessions) {
      if (s.db_id) {
        const originalSession = existingSessions.find(
          (es) => es.db_id === s.db_id,
        );
        if (originalSession) {
          const originalStart = formatToLocal(originalSession.start_time);
          const originalEnd = formatToLocal(originalSession.end_time);
          const localStart = formatToLocal(s.start_time);
          const localEnd = formatToLocal(s.end_time);
          const hasTimeChanged =
            !dayjs(localStart).isSame(dayjs(originalStart)) ||
            !dayjs(localEnd).isSame(dayjs(originalEnd));

          if (hasTimeChanged) {
            hasTimeChangedAny = true;
            if (
              s.format_type === "virtual" &&
              s.meet_link &&
              originalSession.meet_link
            ) {
              if (originalSession.google_event_id) {
                updateMeetSessionIds.push(s.db_id);
              } else {
                manualMeetWarningSessionNames.push(s.session_name);
              }
            }
          }
        }
      }
    }

    try {
      // 1. Save the sessions
      const result = await saveSessionsMutation.mutateAsync({
        conferenceId: conferenceIdNum,
        sessions: sessions.map((s) => {
          return {
            temp_id: s.temp_id,
            db_id: s.db_id,
            session_name: s.session_name,
            start_time: formatToLocal(s.start_time),
            end_time: formatToLocal(s.end_time),
            room_location: s.room_location,
            is_ai_generated: s.is_ai_generated,
            assigned_papers: s.assigned_papers,
            meet_link: s.meet_link,
            google_event_id: s.google_event_id,
            record_video_url: s.record_video_url,
            format_type: s.format_type,
          };
        }),
      });

      // 2. Update existing meet links/calendar events for those sessions
      const newlyUpdatedMeetLinks: Record<number, string> = {};
      const newlyUpdatedEventIds: Record<number, string> = {};
      for (const sessionId of updateMeetSessionIds) {
        if (currentUserEmail) {
          const data = await updateMeetMutation.mutateAsync({
            sessionId,
            email: currentUserEmail,
          });
          newlyUpdatedMeetLinks[sessionId] = data.meet_link;
          newlyUpdatedEventIds[sessionId] = data.event_id;
        }
      }

      // 3. Update sessions with the saved db_ids and updated meet links/event IDs
      const updatedSessions = sessions.map((s) => {
        const saved = result.savedSessions.find(
          (ss) => ss.temp_id === s.temp_id,
        );
        const newDbId = saved ? saved.db_id : s.db_id;
        let meetLink = s.meet_link;
        let googleEventId = s.google_event_id;
        if (newDbId && updateMeetSessionIds.includes(newDbId)) {
          meetLink = newlyUpdatedMeetLinks[newDbId] || s.meet_link;
          googleEventId = newlyUpdatedEventIds[newDbId] || s.google_event_id;
        }
        return saved
          ? {
              ...s,
              db_id: saved.db_id,
              meet_link: meetLink,
              google_event_id: googleEventId,
            }
          : { ...s, meet_link: meetLink, google_event_id: googleEventId };
      });

      setSessions(updatedSessions);
      let successMessage = "Sessions saved!";
      if (updateMeetSessionIds.length > 0) {
        successMessage = "Sessions saved and calendar event times updated!";
      }
      if (manualMeetWarningSessionNames.length > 0) {
        successMessage += ` Note: Manually update Meet link(s) for "${manualMeetWarningSessionNames.join('", "')}" due to time changes.`;
      }
      if (hasTimeChangedAny) {
        successMessage +=
          " Remember to notify participants of schedule changes.";
      }
      setSuccessMsg(successMessage);
    } catch (err: any) {
      setError("Failed to save or update meetings: " + err.message);
    }
  };

  if (isLoadingPapers || isLoadingExistingSessions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <Loader2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (papersError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">
            Error Loading Data
          </h2>
          <p className="text-slate-600 mt-2">Failed to load papers.</p>
          <Button
            id="btn-error-go-back"
            onClick={() =>
              navigate({
                to: "/conferences/$conferenceId",
                params: { conferenceId },
              })
            }
            className="mt-6"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DefaultLayout meta={{ title: "Session Manager" }}>
      <div className="min-h-screen bg-slate-50/50 font-sans pb-24">
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                id="btn-back-conferences"
                onClick={() =>
                  navigate({
                    to: "/conferences/$conferenceId",
                    params: { conferenceId },
                  })
                }
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Session Manager
                  </h1>
                  {conferenceData?.conference?.format_type && (
                    <span
                      className={`px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                        conferenceData.conference.format_type === "virtual"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : conferenceData.conference.format_type === "hybrid"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {conferenceData.conference.format_type === "virtual"
                        ? "Virtual"
                        : conferenceData.conference.format_type === "hybrid"
                          ? "Hybrid"
                          : "In-person"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                    Structure Sessions
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                id="btn-save-sessions"
                onClick={handleSaveSessions}
                disabled={
                  sessions.length === 0 || saveSessionsMutation.isPending
                }
                className="shadow-sm"
              >
                {saveSessionsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 shrink-0" />{" "}
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3 border border-emerald-100 animate-in fade-in slide-in-from-top-4">
              <CheckCircle className="w-5 h-5 shrink-0" />{" "}
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}

          {authorConflictWarnings.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="font-semibold text-amber-800">
                    Author schedule conflict
                    {authorConflictWarnings.length > 1 ? "s" : ""} detected
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Sessions were saved, but the following presentations may
                    create scheduling conflicts for the same author. Consider
                    adjusting the presentation times.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {authorConflictWarnings.map((warning, idx) => (
                      <li
                        key={idx}
                        className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: Tools & Papers */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Quick Auto-Schedule Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-base font-bold text-slate-800 flex items-center mb-5">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg mr-3">
                    <Zap className="w-4 h-4" />
                  </div>
                  Auto-Schedule
                </h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label
                      htmlFor="input-auto-n-session"
                      className="text-sm font-medium text-slate-600"
                    >
                      Total Sessions
                    </label>
                    <input
                      id="input-auto-n-session"
                      type="number"
                      min="1"
                      className="w-16 p-1.5 border border-slate-200 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={autoConfig.n_session}
                      onChange={(e) =>
                        setAutoConfig({
                          ...autoConfig,
                          n_session: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label
                        htmlFor="input-auto-min-paper"
                        className="block text-xs font-medium text-slate-500 mb-1"
                      >
                        Min Papers
                      </label>
                      <input
                        id="input-auto-min-paper"
                        type="number"
                        min="1"
                        className="w-full p-1.5 border border-slate-200 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={autoConfig.min_paper}
                        onChange={(e) =>
                          setAutoConfig({
                            ...autoConfig,
                            min_paper: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label
                        htmlFor="input-auto-max-paper"
                        className="block text-xs font-medium text-slate-500 mb-1"
                      >
                        Max Papers
                      </label>
                      <input
                        id="input-auto-max-paper"
                        type="number"
                        min="1"
                        className="w-full p-1.5 border border-slate-200 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={autoConfig.max_paper}
                        onChange={(e) =>
                          setAutoConfig({
                            ...autoConfig,
                            max_paper: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button
                  id="btn-auto-generate"
                  onClick={handleAutoGenerate}
                  disabled={autoGenerateMutation.isPending}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5"
                >
                  {autoGenerateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Layers className="w-4 h-4 mr-2" />
                  )}
                  {autoGenerateMutation.isPending
                    ? "Processing..."
                    : "Group Papers"}
                </Button>
              </div>

              {/* Unassigned Papers Pool */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-150">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Accepted Papers
                    </h4>
                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {acceptedPapers.length}
                    </span>
                  </div>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="input-search-papers"
                      type="text"
                      placeholder="Search papers by title or author..."
                      className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={paperSearchQuery}
                      onChange={(e) => setPaperSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {acceptedPapers
                    .filter(
                      (p) =>
                        !paperSearchQuery ||
                        p.title
                          .toLowerCase()
                          .includes(paperSearchQuery.toLowerCase()) ||
                        p.author_name
                          ?.toLowerCase()
                          .includes(paperSearchQuery.toLowerCase()),
                    )
                    .map((p) => {
                      const isAssigned = sessions.some((s) =>
                        s.assigned_papers.some(
                          (ap) => ap.paper_id === p.paper_id,
                        ),
                      );
                      return (
                        <div
                          key={p.paper_id}
                          id={`paper-item-${p.paper_id}`}
                          draggable={!isAssigned}
                          onDragStart={(e) => handleDragStart(e, p.paper_id)}
                          onDragEnd={handleDragEnd}
                          className={`p-4 rounded-xl border transition-all ${
                            isAssigned
                              ? "bg-slate-50 border-transparent opacity-50"
                              : "bg-white border-slate-200 shadow-sm cursor-grab hover:shadow-md hover:border-indigo-300 active:cursor-grabbing"
                          } ${draggedPaperId === p.paper_id ? "opacity-50 scale-95" : ""}`}
                        >
                          <div className="flex items-start gap-2">
                            {!isAssigned && (
                              <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900 text-sm line-clamp-2 leading-tight mb-1.5">
                                {p.title}
                              </p>
                              <p className="text-xs text-slate-500 font-medium">
                                {p.author_name}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {acceptedPapers.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      No papers available.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Session Editor */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Workspace</h2>
                <button
                  id="btn-add-blank-session"
                  onClick={addEmptySession}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Blank Session
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 text-center px-6">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">
                    No sessions created yet
                  </h3>
                  <p className="text-slate-500 text-sm max-w-sm">
                    Use the Auto-Schedule tool on the left to group papers
                    quickly, or start from scratch by adding a blank session.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sessions.map((session, idx) => (
                    <div
                      key={session.temp_id}
                      id={`session-card-${session.temp_id}`}
                      className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md ${
                        dragOverSessionId === session.temp_id
                          ? "border-indigo-400 ring-4 ring-indigo-50 scale-[1.01]"
                          : "border-slate-200"
                      }`}
                      onDragOver={(e) => handleDragOver(e, session.temp_id)}
                      onDragLeave={(e) => handleDragLeave(e, session.temp_id)}
                      onDrop={(e) => handleDrop(e, session.temp_id)}
                    >
                      {/* Session Header */}
                      <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100 flex flex-col xl:flex-row gap-5 items-start">
                        <div className="grow space-y-4 w-full">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Session Index */}
                              <div className="bg-slate-200 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                                {idx + 1}
                              </div>

                              {/* Format Selection / Info */}
                              {conferenceData?.conference?.format_type ===
                              "hybrid" ? (
                                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateSession(
                                        session.temp_id,
                                        "format_type",
                                        "in-person",
                                      );
                                    }}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                                      session.format_type === "in-person"
                                        ? "bg-white text-emerald-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                  >
                                    In-person
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateSession(
                                        session.temp_id,
                                        "format_type",
                                        "virtual",
                                      );
                                    }}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                                      session.format_type === "virtual"
                                        ? "bg-white text-indigo-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                  >
                                    Virtual
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    session.format_type === "virtual"
                                      ? "bg-indigo-50 text-indigo-600"
                                      : "bg-emerald-50 text-emerald-600"
                                  }`}
                                >
                                  {session.format_type === "virtual"
                                    ? "Virtual"
                                    : "In-person"}
                                </span>
                              )}
                            </div>
                            <input
                              id={`input-session-name-${idx + 1}`}
                              type="text"
                              className="font-bold text-lg bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full pb-1 transition-colors"
                              value={session.session_name}
                              onChange={(e) =>
                                updateSession(
                                  session.temp_id,
                                  "session_name",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter Session Title..."
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 xl:ml-11">
                            <div className="relative group">
                              <SimpleDateTimePicker
                                id={`datetime-start-session-${idx + 1}`}
                                placeholder="Start Time"
                                value={session.start_time || ""}
                                onChange={(val) =>
                                  updateSession(
                                    session.temp_id,
                                    "start_time",
                                    val,
                                  )
                                }
                              />
                            </div>
                            <div className="relative group">
                              <SimpleDateTimePicker
                                id={`datetime-end-session-${idx + 1}`}
                                placeholder="End Time"
                                value={session.end_time || ""}
                                onChange={(val) =>
                                  updateSession(
                                    session.temp_id,
                                    "end_time",
                                    val,
                                  )
                                }
                              />
                            </div>
                            <div className="relative group">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                              <input
                                id={`input-session-room-${idx + 1}`}
                                type="text"
                                placeholder={
                                  session.format_type === "virtual"
                                    ? "Room / Hall (Optional for Online)"
                                    : "Room / Hall"
                                }
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                value={session.room_location}
                                onChange={(e) =>
                                  updateSession(
                                    session.temp_id,
                                    "room_location",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>

                          {/* MEET & YOUTUBE LINKS - Only show if session is virtual */}
                          {session.format_type === "virtual" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:ml-11">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">
                                  Virtual Room (Meet)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative group w-full">
                                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                                    <input
                                      type="text"
                                      placeholder="https://meet.google.com/..."
                                      className={`w-full pl-9 pr-16 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all ${
                                        session.meet_link &&
                                        !isOnlineMeetingLink(session.meet_link)
                                          ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                                          : "border-slate-200 focus:border-indigo-500"
                                      }`}
                                      value={session.meet_link || ""}
                                      onChange={(e) => {
                                        updateSession(
                                          session.temp_id,
                                          "meet_link",
                                          e.target.value,
                                        );
                                        updateSession(
                                          session.temp_id,
                                          "google_event_id",
                                          null,
                                        );
                                      }}
                                    />
                                    {session.meet_link && (
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white pl-1 rounded-r-lg">
                                        <a
                                          href={
                                            session.meet_link.startsWith("http")
                                              ? session.meet_link
                                              : `https://${session.meet_link}`
                                          }
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-slate-100"
                                          title="Open link"
                                        >
                                          <LinkIcon className="w-3.5 h-3.5" />
                                        </a>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveMeetLink(session);
                                          }}
                                          disabled={
                                            deletingMeetId === session.temp_id
                                          }
                                          className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 disabled:opacity-50"
                                          title="Remove link"
                                        >
                                          {deletingMeetId ===
                                          session.temp_id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {!session.meet_link && (
                                    <Button
                                      onClick={() =>
                                        handleCreateMeetLink(session)
                                      }
                                      disabled={
                                        generatingMeetId === session.temp_id
                                      }
                                      variant="outline"
                                      title="Auto-generate Meet link"
                                      className="px-3 shrink-0 text-indigo-700 border-indigo-200 bg-white hover:bg-indigo-50 rounded-xl"
                                    >
                                      {generatingMeetId === session.temp_id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Zap className="w-4 h-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                                {session.meet_link &&
                                  !isOnlineMeetingLink(session.meet_link) && (
                                    <p className="text-red-500 text-xs pl-1">
                                      Only Google Meet, Zoom, MS Teams, Webex,
                                      Skype, Jitsi, or Discord links are
                                      allowed.
                                    </p>
                                  )}
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">
                                  Archive Video (YouTube / Drive)
                                </label>
                                <div className="relative group">
                                  {session.record_video_url?.includes(
                                    "youtube.com",
                                  ) ||
                                  session.record_video_url?.includes(
                                    "youtu.be",
                                  ) ? (
                                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors pointer-events-none" />
                                  ) : (
                                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors pointer-events-none" />
                                  )}
                                  <input
                                    type="text"
                                    placeholder="YouTube or Google Drive URL"
                                    className="w-full pl-9 pr-16 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-all"
                                    value={session.record_video_url || ""}
                                    onChange={(e) => {
                                      updateSession(
                                        session.temp_id,
                                        "record_video_url",
                                        e.target.value,
                                      );
                                    }}
                                  />
                                  {session.record_video_url && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white pl-1 rounded-r-lg">
                                      <a
                                        href={
                                          session.record_video_url.startsWith(
                                            "http",
                                          )
                                            ? session.record_video_url
                                            : `https://${session.record_video_url}`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded-md hover:bg-slate-100"
                                        title="Open link"
                                      >
                                        <LinkIcon className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveArchiveLink(session);
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                                        title="Remove link"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {session.record_video_url &&
                                  !session.record_video_url.match(
                                    /^(https?\:\/\/)?(www\.youtube\.com|youtu\.be|drive\.google\.com)\/.+$/,
                                  ) && (
                                    <span className="text-xs text-red-500 mt-1 block pl-1">
                                      Invalid YouTube or Google Drive URL
                                    </span>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeSession(session)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors sm:mt-1 shrink-0"
                          disabled={deleteSessionMutation.isPending}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Papers List inside Session */}
                      <div
                        className={`transition-all duration-300 ${dragOverSessionId === session.temp_id ? "bg-indigo-50/20" : ""}`}
                      >
                        <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/30">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-400" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                              Presentations ({session.assigned_papers.length})
                            </p>
                          </div>
                          {session.assigned_papers.length > 0 && (
                            <button
                              id={`btn-toggle-hidden-${session.temp_id}`}
                              onClick={() => toggleHidden(session.temp_id)}
                              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase"
                            >
                              {hiddenPresentations[session.temp_id] ? (
                                <>
                                  Show <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  Hide <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {!hiddenPresentations[session.temp_id] && (
                          <div className="p-6 pt-2">
                            {session.assigned_papers.length === 0 ? (
                              <div className="py-10 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-white/50 group/drop">
                                <FileText className="w-8 h-8 text-slate-200 mx-auto mb-3 group-hover/drop:text-indigo-200 transition-colors" />
                                <p className="text-sm text-slate-400 font-medium px-4">
                                  Drag & drop papers from the sidebar to assign
                                  them to this session
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(() => {
                                  const isExpanded =
                                    expandedSessions[session.temp_id] ||
                                    session.assigned_papers.length <= 5;
                                  const papersToShow = isExpanded
                                    ? session.assigned_papers
                                    : session.assigned_papers.slice(0, 5);

                                  return (
                                    <>
                                      {papersToShow.map((ap, pIdx) => {
                                        const p = acceptedPapers.find(
                                          (acc) => acc.paper_id === ap.paper_id,
                                        );
                                        return p ? (
                                          <div
                                            key={ap.paper_id}
                                            id={`session-${session.temp_id}-assigned-paper-${ap.paper_id}`}
                                            className="group flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200"
                                            draggable
                                            onDragStart={(e) =>
                                              handleDragStart(e, ap.paper_id)
                                            }
                                            onDragEnd={handleDragEnd}
                                          >
                                            <div className="flex items-start gap-4 overflow-hidden cursor-grab active:cursor-grabbing w-full lg:w-auto grow group">
                                              <div className="mt-1 bg-slate-50 text-slate-400 p-1.5 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors">
                                                <GripVertical className="w-4 h-4 shrink-0" />
                                              </div>
                                              <div className="grow min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-indigo-600 font-bold text-xs uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
                                                    Paper #{pIdx + 1}
                                                  </span>
                                                  <span className="text-[10px] font-medium text-slate-400">
                                                    ID: {p.paper_id}
                                                  </span>
                                                </div>
                                                <h4 className="font-semibold text-slate-800 text-sm line-clamp-2 pr-2 leading-snug">
                                                  {p.title}
                                                </h4>
                                                {p.author_name && (
                                                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                                    By: {p.author_name}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                              <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <SimpleTimePicker
                                                  id={`time-start-session-${idx + 1}-paper-${ap.paper_id}`}
                                                  placeholder="Start"
                                                  className="w-24 h-8 text-[11px]!"
                                                  value={ap.start_time || ""}
                                                  onChange={(val) =>
                                                    updateSessionPaper(
                                                      session.temp_id,
                                                      ap.paper_id,
                                                      "start_time",
                                                      val,
                                                    )
                                                  }
                                                />
                                                <span className="text-slate-300">
                                                  -
                                                </span>
                                                <SimpleTimePicker
                                                  id={`time-end-session-${idx + 1}-paper-${ap.paper_id}`}
                                                  placeholder="End"
                                                  className="w-24 h-8 text-[11px]!"
                                                  value={ap.end_time || ""}
                                                  onChange={(val) =>
                                                    updateSessionPaper(
                                                      session.temp_id,
                                                      ap.paper_id,
                                                      "end_time",
                                                      val,
                                                    )
                                                  }
                                                />
                                              </div>
                                              <div className="w-px h-6 bg-slate-200 mx-1 hidden lg:block" />
                                              <button
                                                id={`btn-remove-paper-${ap.paper_id}`}
                                                onClick={() =>
                                                  removePaperFromSession(
                                                    session.temp_id,
                                                    ap.paper_id,
                                                  )
                                                }
                                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                                                title="Remove paper"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        ) : null;
                                      })}

                                      {session.assigned_papers.length > 5 && (
                                        <div className="pt-2 flex justify-center">
                                          <button
                                            id={`btn-toggle-expand-${session.temp_id}`}
                                            onClick={() =>
                                              toggleExpand(session.temp_id)
                                            }
                                            className="group flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all shadow-sm active:scale-95"
                                          >
                                            {expandedSessions[
                                              session.temp_id
                                            ] ? (
                                              <>
                                                Show Less{" "}
                                                <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                                              </>
                                            ) : (
                                              <>
                                                Show{" "}
                                                {session.assigned_papers
                                                  .length - 5}{" "}
                                                More Papers{" "}
                                                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Auth Modal UI */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Connect to Google Calendar
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              You need to authorize the system to access your Google Calendar to
              automatically create Meet events. A popup window will open for you
              to complete the authorization.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowAuthModal(false)}
                disabled={isAuthorizing}
              >
                Cancel
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleStartGoogleAuthPopup}
                disabled={isAuthorizing}
              >
                {isAuthorizing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Video className="w-4 h-4 mr-2" />
                )}
                Connect Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the session "
              {sessionToDelete?.session_name}" from the database? This action
              cannot be undone.
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
              onClick={handleConfirmDelete}
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
    </DefaultLayout>
  );
};

export default SessionManagerPage;
