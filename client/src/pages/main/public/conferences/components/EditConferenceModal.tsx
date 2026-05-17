import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Save,
  Tag,
  Video,
  X,
} from "lucide-react";
import TimezoneSelect from "react-timezone-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateConferenceMutation } from "@/features/conferences/services/mutations";
import { supabase } from "@/lib/supabase";
import type { ConferenceDetail } from "@/features/conferences/types";

interface EditConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  conference: ConferenceDetail;
}

interface AffectedSession {
  session_id: number;
  session_name: string | null;
  hasSoldTickets: boolean;
}

function isBeforeStart(startDate: string | null): boolean {
  if (!startDate) return true;
  return new Date() < new Date(startDate);
}

export const EditConferenceModal: React.FC<EditConferenceModalProps> = ({
  isOpen,
  onClose,
  conference,
}) => {
  const updateMutation = useUpdateConferenceMutation();
  const canEdit = isBeforeStart(conference.start_date);

  // ── Form state ──────────────────────────────────────────────────
  const [confName, setConfName] = useState(conference.conf_name || "");
  const [description, setDescription] = useState(conference.description || "");
  const [location, setLocation] = useState(conference.location || "");
  const [startDate, setStartDate] = useState(
    conference.start_date?.substring(0, 10) || "",
  );
  const [endDate, setEndDate] = useState(
    conference.end_date?.substring(0, 10) || "",
  );
  const [status, setStatus] = useState(conference.status || "DRAFT");
  const [isActive, setIsActive] = useState(conference.is_active ?? false);
  const [openForPapers, setOpenForPapers] = useState(
    conference.open_for_papers ?? true,
  );
  const [formatType, setFormatType] = useState(
    conference.format_type || "in-person",
  );
  const [timezone, setTimezone] = useState(conference.timezone || "UTC");
  const [maxChairs, setMaxChairs] = useState(
    conference.max_chairs_per_session ?? 1,
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(() =>
    Array.isArray(conference.keywords) ? (conference.keywords as string[]) : [],
  );

  const [error, setError] = useState("");
  const [affectedSessions, setAffectedSessions] = useState<AffectedSession[]>([]);
  const [endDateWarningConfirmed, setEndDateWarningConfirmed] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [pendingTimezone, setPendingTimezone] = useState("");

  // ── Reset when conference changes ────────────────────────────────
  useEffect(() => {
    setConfName(conference.conf_name || "");
    setDescription(conference.description || "");
    setLocation(conference.location || "");
    setStartDate(conference.start_date?.substring(0, 10) || "");
    setEndDate(conference.end_date?.substring(0, 10) || "");
    setStatus(conference.status || "DRAFT");
    setIsActive(conference.is_active ?? false);
    setOpenForPapers(conference.open_for_papers ?? true);
    setFormatType(conference.format_type || "in-person");
    setTimezone(conference.timezone || "UTC");
    setMaxChairs(conference.max_chairs_per_session ?? 1);
    setKeywords(
      Array.isArray(conference.keywords) ? (conference.keywords as string[]) : [],
    );
    setError("");
    setAffectedSessions([]);
    setEndDateWarningConfirmed(false);
  }, [conference, isOpen]);

  // Reset warning confirmation when end date changes
  useEffect(() => {
    setAffectedSessions([]);
    setEndDateWarningConfirmed(false);
  }, [endDate]);

  // ── Keyword helpers ──────────────────────────────────────────────
  const handleKeywordAdd = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim()))
        setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };
  const removeKeyword = (tag: string) =>
    setKeywords(keywords.filter((k) => k !== tag));

  // ── Timezone ─────────────────────────────────────────────────────
  const handleTimezoneChange = (sel: any) => {
    const tzValue = typeof sel === "string" ? sel : sel.value;
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tzValue !== browserTz) {
      setPendingTimezone(tzValue);
      setShowTimezoneModal(true);
    } else {
      setTimezone(tzValue);
    }
  };

  // ── End-date reduction validation ────────────────────────────────
  const validateEndDateReduction = async (): Promise<boolean> => {
    const oldEnd = conference.end_date?.substring(0, 10) || "";
    if (!endDate || endDate >= oldEnd) return true; // no reduction, skip

    setValidating(true);
    setError("");
    setAffectedSessions([]);

    try {
      // 1. Find sessions whose end_time falls after the new end date
      const newEndCutoff = `${endDate}T23:59:59`;
      const { data: sessionRows, error: sessErr } = await supabase
        .from("sessions")
        .select("session_id, session_name")
        .eq("conf_id", conference.conf_id)
        .gt("end_time", newEndCutoff);

      if (sessErr) throw sessErr;
      if (!sessionRows || sessionRows.length === 0) return true;

      const sessionIds = sessionRows.map((s) => s.session_id);

      // 2. Find ticket_ids linked to those sessions
      const { data: ticketSessionRows, error: tsErr } = await supabase
        .from("ticket_session")
        .select("ticket_id, session_id")
        .in("session_id", sessionIds);

      if (tsErr) throw tsErr;

      const ticketIds = [...new Set((ticketSessionRows || []).map((r) => r.ticket_id))];

      // 3. Check which tickets have sold registrations
      let soldTicketIds = new Set<number>();
      if (ticketIds.length > 0) {
        const { data: regRows, error: regErr } = await supabase
          .from("registrations")
          .select("ticket_id")
          .in("ticket_id", ticketIds);

        if (regErr) throw regErr;
        soldTicketIds = new Set((regRows || []).map((r) => r.ticket_id));
      }

      // 4. Map back: which session_ids have sold tickets?
      const sessionTicketMap = new Map<number, boolean>();
      for (const ts of ticketSessionRows || []) {
        const existing = sessionTicketMap.get(ts.session_id) ?? false;
        sessionTicketMap.set(ts.session_id, existing || soldTicketIds.has(ts.ticket_id));
      }

      const affected: AffectedSession[] = sessionRows.map((s) => ({
        session_id: s.session_id,
        session_name: s.session_name,
        hasSoldTickets: sessionTicketMap.get(s.session_id) ?? false,
      }));

      const hasBlocked = affected.some((s) => s.hasSoldTickets);

      if (hasBlocked) {
        setAffectedSessions(affected);
        setError(
          "Cannot reduce end date: tickets have already been sold for sessions that fall after the new end date.",
        );
        return false;
      }

      if (affected.length > 0) {
        setAffectedSessions(affected);
        // warn but don't block — user must confirm
        return false; // pause submit until confirmed
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed.");
      return false;
    } finally {
      setValidating(false);
    }
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!confName || !startDate || !endDate) {
      setError("Conference name, start date and end date are required.");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError("Start date must be before end date.");
      return;
    }

    // Check end date reduction
    const oldEnd = conference.end_date?.substring(0, 10) || "";
    const isReducing = endDate < oldEnd;

    if (isReducing && !endDateWarningConfirmed) {
      const ok = await validateEndDateReduction();
      if (!ok) return; // either blocked or needs confirmation
    }

    try {
      await updateMutation.mutateAsync({
        conferenceId: conference.conf_id,
        conf_name: confName,
        description,
        location,
        start_date: startDate,
        end_date: endDate,
        status,
        is_active: isActive,
        open_for_papers: openForPapers,
        format_type: formatType,
        timezone,
        max_chairs_per_session: maxChairs,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update conference.");
    }
  };

  const loading = updateMutation.isPending || validating;
  const hasBlockedSession = affectedSessions.some((s) => s.hasSoldTickets);
  const hasWarnOnly =
    affectedSessions.length > 0 && !hasBlockedSession && !endDateWarningConfirmed;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Conference
              {!canEdit && (
                <span className="text-xs font-normal bg-red-100 text-red-600 border border-red-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {!canEdit ? (
            <div className="py-8 text-center space-y-3">
              <Lock className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-slate-600 font-medium">
                This conference has already started and cannot be edited.
              </p>
              <p className="text-slate-400 text-sm">
                Only conferences that haven't started can be modified.
              </p>
              <Button variant="outline" onClick={onClose} className="mt-2">
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Affected sessions warning */}
              {affectedSessions.length > 0 && (
                <div
                  className={`p-4 rounded-lg border text-sm space-y-3 ${
                    hasBlockedSession
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {hasBlockedSession
                      ? "Cannot reduce end date — sold tickets exist"
                      : "Warning: sessions will fall outside conference dates"}
                  </div>
                  <ul className="space-y-1.5 pl-6 list-disc text-xs">
                    {affectedSessions.map((s) => (
                      <li key={s.session_id} className="flex items-center gap-2">
                        <span className="font-medium">
                          {s.session_name || `Session #${s.session_id}`}
                        </span>
                        {s.hasSoldTickets ? (
                          <span className="inline-flex items-center bg-red-100 text-red-700 border border-red-200 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                            Tickets Sold — Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                            No Tickets — Warn Only
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!hasBlockedSession && (
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={endDateWarningConfirmed}
                        onChange={(e) =>
                          setEndDateWarningConfirmed(e.target.checked)
                        }
                        className="rounded"
                      />
                      <span className="text-xs font-medium">
                        I understand some sessions will fall outside the new end date
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Conference Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={confName}
                  onChange={(e) => setConfName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                    placeholder="Detailed description..."
                  />
                </div>
              </div>

              {/* Format & Timezone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Format <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <select
                      value={formatType}
                      onChange={(e) => setFormatType(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="in-person">In-person</option>
                      <option value="virtual">Virtual</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Timezone <span className="text-red-500">*</span>
                  </label>
                  <TimezoneSelect
                    value={timezone}
                    onChange={handleTimezoneChange}
                    classNamePrefix="react-select"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  {endDate < (conference.end_date?.substring(0, 10) || "") && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Reducing end date — will be validated on save
                    </p>
                  )}
                </div>
              </div>

              {/* Max chairs & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Max Chairs Per Session{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="number"
                      min={1}
                      required
                      value={maxChairs || ""}
                      onChange={(e) => setMaxChairs(parseInt(e.target.value) || 1)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. London, UK or Virtual"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Keywords
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordAdd}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Type keyword and press Enter..."
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((k, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100"
                    >
                      {k}
                      <button
                        type="button"
                        onClick={() => removeKeyword(k)}
                        className="ml-2 hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2 border-t border-slate-100">
                <label className="flex items-center cursor-pointer relative group">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  <span className="ml-3 text-sm font-medium text-slate-700">
                    Publish Conference
                  </span>
                </label>
                <label className="flex items-center cursor-pointer relative group">
                  <input
                    type="checkbox"
                    checked={openForPapers}
                    onChange={(e) => setOpenForPapers(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  <span className="ml-3 text-sm font-medium text-slate-700">
                    Accepting Papers
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || hasBlockedSession || (hasWarnOnly && !endDateWarningConfirmed)}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {hasWarnOnly && !endDateWarningConfirmed
                    ? "Confirm to Save"
                    : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Timezone confirmation modal */}
      {showTimezoneModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Confirm Timezone Change
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              The selected timezone (<strong>{pendingTimezone}</strong>) differs
              from your system timezone (
              <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong>
              ). Apply this timezone for the conference?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowTimezoneModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setTimezone(pendingTimezone);
                  setShowTimezoneModal(false);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
