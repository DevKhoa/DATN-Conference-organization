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
  Search,
  UserCheck,
  GripVertical,
  Search as SearchIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Route } from "@/routes/(app)/sessions.assign";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  SimpleDateTimePicker,
  SimpleTimePicker,
} from "@/components/ui/date-time-picker";
import {
  useAutoGenerateSessionsMutation,
  useSaveSessionsMutation,
  useRecommendChairMutation,
  useFinalizeChairsMutation,
} from "@/features/sessions/services/mutations";
import { useExistingSessionsQuery } from "@/features/sessions/services/queries";
import { LocalSession, SessionPaperDetail } from "@/features/sessions/types";
import { useAcceptedPapersQuery } from "@/features/papers/services/queries";
import { ChairCandidate } from "@/features/users/services/queries/types";
import { useChairCandidatesQuery } from "@/features/users/services/queries";
import { formatToLocal } from "@/utils/time";

dayjs.extend(customParseFormat);

const AssignSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { conferenceId, sessionId: initialSessionId } = Route.useSearch();

  // Query hooks
  const {
    data: acceptedPapers = [],
    isLoading: isLoadingPapers,
    error: papersError,
  } = useAcceptedPapersQuery(conferenceId);

  const { data: availableChairs = [], isLoading: isLoadingChairs } =
    useChairCandidatesQuery();

  const { data: existingSessions = [], isLoading: isLoadingExistingSessions } =
    useExistingSessionsQuery(conferenceId, initialSessionId!);

  // Mutation hooks
  const autoGenerateMutation = useAutoGenerateSessionsMutation();
  const saveSessionsMutation = useSaveSessionsMutation();
  const recommendChairMutation = useRecommendChairMutation();
  const finalizeChairsMutation = useFinalizeChairsMutation();

  const [step, setStep] = useState<"CREATE" | "CHAIRS">("CREATE");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  const [recommendingFor, setRecommendingFor] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<
    Record<string, ChairCandidate[]>
  >({});
  const [paperSearchQuery, setPaperSearchQuery] = useState("");
  const [chairSearchQueries, setChairSearchQueries] = useState<
    Record<string, string>
  >({});
  const [expandedSessions, setExpandedSessions] = useState<
    Record<string, boolean>
  >({});
  const [hiddenPresentations, setHiddenPresentations] = useState<
    Record<string, boolean>
  >({});

  // Fetch existing sessions if editing
  React.useEffect(() => {
    if (existingSessions.length > 0) {
      setSessions(existingSessions);
    }
  }, [existingSessions]);

  const addEmptySession = () => {
    const newSession: LocalSession = {
      temp_id: Math.random().toString(36).substr(2, 9),
      session_name: "New Session",
      start_time: "",
      end_time: "",
      room_location: "",
      is_ai_generated: false,
      assigned_papers: [],
    };
    setSessions([...sessions, newSession]);
  };

  const updateSession = (id: string, field: keyof LocalSession, value: any) => {
    setSessions((prev) =>
      prev.map((s) => (s.temp_id === id ? { ...s, [field]: value } : s)),
    );
  };

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.temp_id !== id));
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
          room_location: "",
          is_ai_generated: true,
          assigned_papers: mappedIds.map((id) => ({
            paper_id: id,
            start_time: "",
            end_time: "",
          })),
        };
      });

      setSessions(newSessions);
      setSuccessMsg(
        `Successfully grouped into ${newSessions.length} sessions. Please verify Time & Location.`,
      );
    } catch (err: any) {
      setError("Auto-schedule failed: " + err.message);
    }
  };

  const handleSaveSessions = async () => {
    for (const s of sessions) {
      if (!s.session_name || !s.start_time || !s.end_time || !s.room_location) {
        setError(`Please fill in all details for session: ${s.session_name}`);
        return;
      }
      const localStart = formatToLocal(s.start_time);
      const localEnd = formatToLocal(s.end_time);
      if (!dayjs(localStart).isValid() || !dayjs(localEnd).isValid()) {
        setError(`Invalid date format for session ${s.session_name}.`);
        return;
      }
    }

    setError("");

    try {
      const result = await saveSessionsMutation.mutateAsync({
        conferenceId,
        sessions: sessions.map((s) => {
          return {
            temp_id: s.temp_id,
            db_id: s.db_id,
            session_name: s.session_name,
            start_time: s.start_time,
            end_time: s.end_time,
            room_location: s.room_location,
            is_ai_generated: s.is_ai_generated,
            assigned_papers: s.assigned_papers,
          };
        }),
      });

      // Update sessions with the saved db_ids
      const updatedSessions = sessions.map((s) => {
        const saved = result.savedSessions.find(
          (ss) => ss.temp_id === s.temp_id,
        );
        return saved ? { ...s, db_id: saved.db_id } : s;
      });

      setSessions(updatedSessions);
      setStep("CHAIRS");
      setSuccessMsg(
        "Sessions structured successfully! Moving to chair assignment.",
      );
    } catch (err) {
      setError("Failed to save to database: " + err.message);
    }
  };

  const handleRecommendChair = async (session: LocalSession) => {
    if (!session.db_id) return;
    setRecommendingFor(session.temp_id);

    try {
      const data = await recommendChairMutation.mutateAsync({
        sessionId: session.db_id,
        limit: 5,
        threshold: 0.1,
      });

      if (data.recommended_chairs) {
        setRecommendations((prev) => ({
          ...prev,
          [session.temp_id]: data.recommended_chairs,
        }));
      }
    } catch (e) {
      setError("Failed to fetch candidate suggestions.");
    } finally {
      setRecommendingFor(null);
    }
  };

  const handleFinalize = async () => {
    try {
      await finalizeChairsMutation.mutateAsync({
        sessions: sessions.map((s) => ({
          db_id: s.db_id,
          chair_person_id: s.chair_person_id,
        })),
      });

      setSuccessMsg("All configurations finalized and saved!");
      setTimeout(() => navigate({ to: "/conferences" }), 1500);
    } catch (e) {
      setError("Failed to update chairs.");
    }
  };

  if (isLoadingPapers || isLoadingChairs || isLoadingExistingSessions) {
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
            onClick={() => navigate({ to: "/conferences" })}
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
                onClick={() => navigate({ to: "/conferences" })}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Session Manager
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${step === "CREATE" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    1. Structure
                  </span>
                  <span className="text-slate-300">-</span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${step === "CHAIRS" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    2. Assign Chairs
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {step === "CREATE" && (
                <Button
                  onClick={handleSaveSessions}
                  disabled={
                    sessions.length === 0 ||
                    saveSessionsMutation.isPending ||
                    finalizeChairsMutation.isPending
                  }
                  className="shadow-sm"
                >
                  {saveSessionsMutation.isPending ||
                  finalizeChairsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save & Continue
                </Button>
              )}
              {step === "CHAIRS" && (
                <Button
                  onClick={handleFinalize}
                  disabled={
                    saveSessionsMutation.isPending ||
                    finalizeChairsMutation.isPending
                  }
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-md"
                >
                  {saveSessionsMutation.isPending ||
                  finalizeChairsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Finalize Setup
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />{" "}
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3 border border-emerald-100 animate-in fade-in slide-in-from-top-4">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />{" "}
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}

          {/* --- STEP 1: CREATE SESSIONS --- */}
          {step === "CREATE" && (
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
                      <span className="text-sm font-medium text-slate-600">
                        Total Sessions
                      </span>
                      <input
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
                        <span className="block text-xs font-medium text-slate-500 mb-1">
                          Min Papers
                        </span>
                        <input
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
                        <span className="block text-xs font-medium text-slate-500 mb-1">
                          Max Papers
                        </span>
                        <input
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[600px]">
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
                  <h2 className="text-lg font-bold text-slate-800">
                    Workspace
                  </h2>
                  <button
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
                        className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
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
                          <div className="flex-grow space-y-4 w-full">
                            <div className="flex items-center gap-3">
                              <div className="bg-slate-200 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                                {idx + 1}
                              </div>
                              <input
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
                                  type="text"
                                  placeholder="Room / Hall"
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
                          </div>
                          <button
                            onClick={() => removeSession(session.temp_id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors sm:mt-1 shrink-0"
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
                                    Drag & drop papers from the sidebar to
                                    assign them to this session
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
                                            (acc) =>
                                              acc.paper_id === ap.paper_id,
                                          );
                                          return p ? (
                                            <div
                                              key={ap.paper_id}
                                              className="group flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200"
                                              draggable
                                              onDragStart={(e) =>
                                                handleDragStart(e, ap.paper_id)
                                              }
                                              onDragEnd={handleDragEnd}
                                            >
                                              <div className="flex items-start gap-4 overflow-hidden cursor-grab active:cursor-grabbing w-full lg:w-auto flex-grow group">
                                                <div className="mt-1 bg-slate-50 text-slate-400 p-1.5 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors">
                                                  <GripVertical className="w-4 h-4 shrink-0" />
                                                </div>
                                                <div className="flex-grow min-w-0">
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
                                              <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                  <SimpleTimePicker
                                                    placeholder="Start"
                                                    className="w-16 h-8 !text-[11px]"
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
                                                    placeholder="End"
                                                    className="w-16 h-8 !text-[11px]"
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
          )}

          {/* --- STEP 2: ASSIGN CHAIRS --- */}
          {step === "CHAIRS" && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
              {/* ... [Phần Assign Chairs giữ nguyên giao diện như cũ] ... */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-indigo-900 mb-1">
                    Final Step: Assign Chair Persons
                  </h3>
                  <p className="text-sm text-indigo-700/80">
                    Your sessions are structured. Now, select a chair for each
                    session manually, or use our suggestion system to find the
                    best match based on paper topics.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {sessions.map((session, idx) => (
                  <div
                    key={session.db_id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row gap-8 hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">
                          Session {idx + 1}
                        </span>
                        {/* Format lại hiển thị giờ nếu có */}
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{" "}
                          {session.start_time
                            ? new Date(session.start_time).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-6">
                        {session.session_name}
                      </h3>

                      <div className="relative max-w-md">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Select Chair
                        </label>
                        <div className="relative group">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search chair by name..."
                            className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                            value={
                              // Hiển thị tên chair đã chọn nếu query trống và đã chọn
                              chairSearchQueries[session.temp_id] !== undefined
                                ? chairSearchQueries[session.temp_id]
                                : session.chair_person_id
                                  ? availableChairs.find(
                                      (c) =>
                                        c.user_id === session.chair_person_id,
                                    )?.full_name || ""
                                  : ""
                            }
                            onChange={(e) => {
                              setChairSearchQueries({
                                ...chairSearchQueries,
                                [session.temp_id]: e.target.value,
                              });
                              // Nếu người dùng chủ động xóa trống, thì gỡ chair đang chọn
                              if (e.target.value === "") {
                                updateSession(
                                  session.temp_id,
                                  "chair_person_id",
                                  null,
                                );
                              }
                            }}
                            onFocus={() => {
                              // Khi Focus, tự động clear Tên đang hiển thị để search cái mới
                              if (
                                session.chair_person_id &&
                                chairSearchQueries[session.temp_id] ===
                                  undefined
                              ) {
                                setChairSearchQueries({
                                  ...chairSearchQueries,
                                  [session.temp_id]: "",
                                });
                              }
                            }}
                          />

                          {/* Autocomplete Dropdown */}
                          {chairSearchQueries[session.temp_id] !==
                            undefined && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                              {availableChairs.filter((c) =>
                                c.full_name
                                  .toLowerCase()
                                  .includes(
                                    chairSearchQueries[
                                      session.temp_id
                                    ].toLowerCase(),
                                  ),
                              ).length === 0 ? (
                                <div className="p-3 text-sm text-slate-500 text-center">
                                  No chairs found
                                </div>
                              ) : (
                                availableChairs
                                  .filter((c) =>
                                    c.full_name
                                      .toLowerCase()
                                      .includes(
                                        chairSearchQueries[
                                          session.temp_id
                                        ].toLowerCase(),
                                      ),
                                  )
                                  .map((c) => (
                                    <div
                                      key={c.user_id}
                                      className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center group transition-colors"
                                      onMouseDown={(e) => {
                                        e.preventDefault(); // Ngăn input mất focus ngay lập tức
                                        updateSession(
                                          session.temp_id,
                                          "chair_person_id",
                                          c.user_id,
                                        );
                                        // Clear query, giữ trạng thái undefined để hiện tên
                                        const newQ = { ...chairSearchQueries };
                                        delete newQ[session.temp_id];
                                        setChairSearchQueries(newQ);
                                      }}
                                    >
                                      <div>
                                        <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">
                                          {c.full_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {c.organization}
                                        </div>
                                      </div>
                                      {session.chair_person_id ===
                                        c.user_id && (
                                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                                      )}
                                    </div>
                                  ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Selected Badge */}
                        {session.chair_person_id &&
                          chairSearchQueries[session.temp_id] === undefined && (
                            <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium animate-in fade-in transition-all">
                              <UserCheck className="w-4 h-4" />
                              {
                                availableChairs.find(
                                  (c) => c.user_id === session.chair_person_id,
                                )?.full_name
                              }
                              <button
                                className="ml-1 text-indigo-400 hover:text-indigo-600"
                                onClick={() =>
                                  updateSession(
                                    session.temp_id,
                                    "chair_person_id",
                                    null,
                                  )
                                }
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="md:w-[350px] border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 flex flex-col">
                      {!recommendations[session.temp_id] ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                          <Search className="w-6 h-6 text-slate-300 mb-3" />
                          <p className="text-sm text-slate-500 mb-4">
                            Need help finding a chair?
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => handleRecommendChair(session)}
                            disabled={!!recommendingFor}
                            className="w-full bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          >
                            {recommendingFor === session.temp_id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <UserCheck className="w-4 h-4 mr-2" />
                            )}
                            Suggest Matches
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Top Matches
                            </p>
                            <button
                              onClick={() => {
                                const newRecs = { ...recommendations };
                                delete newRecs[session.temp_id];
                                setRecommendations(newRecs);
                              }}
                              className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              Clear
                            </button>
                          </div>

                          <div className="space-y-2">
                            {recommendations[session.temp_id].map((rec) => (
                              <div
                                key={rec.user_id}
                                onClick={() =>
                                  updateSession(
                                    session.temp_id,
                                    "chair_person_id",
                                    rec.user_id,
                                  )
                                }
                                className={`p-3 rounded-xl cursor-pointer border transition-all ${session.chair_person_id === rec.user_id ? "bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500" : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-semibold text-sm text-slate-900">
                                    {rec.full_name}
                                  </span>
                                  {rec.similarity_score && (
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                                      Match:{" "}
                                      {(rec.similarity_score * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {rec.organization}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default AssignSessionsPage;
