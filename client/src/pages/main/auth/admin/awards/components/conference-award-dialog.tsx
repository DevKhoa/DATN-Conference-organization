import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreateConferenceAwardPayload,
  UpdateConferenceAwardPayload,
} from "@/features/awards/services/mutations/types";
import type {
  AwardCriteriaInput,
  AwardTemplateWithCriteria,
  AwardWithSessions,
} from "@/features/awards/types";
import type { Conference } from "@/features/conferences/types";
import type { Session } from "@/features/sessions/types";

type ConferenceAwardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  award?: AwardWithSessions | null;
  conferences: Conference[];
  sessions: Session[];
  templates: AwardTemplateWithCriteria[];
  selectedConferenceId: number | null;
  isSubmitting: boolean;
  onConferenceChange: (conferenceId: number) => void;
  onCreate: (payload: CreateConferenceAwardPayload) => Promise<unknown>;
  onUpdate: (payload: UpdateConferenceAwardPayload) => Promise<unknown>;
};

type CriterionInput = AwardCriteriaInput;

const EMPTY_CRITERION: CriterionInput = {
  criteria_name: "",
  weight_pct: 0,
};

const parseDateTimeLocal = (value: string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
};

export const ConferenceAwardDialog = ({
  open,
  onOpenChange,
  award,
  conferences,
  sessions,
  templates,
  selectedConferenceId,
  isSubmitting,
  onConferenceChange,
  onCreate,
  onUpdate,
}: ConferenceAwardDialogProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedConferenceIdLocal, setSelectedConferenceIdLocal] =
    useState<string>(selectedConferenceId ? String(selectedConferenceId) : "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chairPct, setChairPct] = useState(100);
  const [attendeePct, setAttendeePct] = useState(0);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [criteria, setCriteria] = useState<CriterionInput[]>([
    { ...EMPTY_CRITERION },
  ]);

  const isEditMode = Boolean(award);
  const criteriaWeightTotal = useMemo(
    () =>
      criteria.reduce((sum, item) => sum + (Number(item.weight_pct) || 0), 0),
    [criteria],
  );

  const isAllSessionsSelected = useMemo(() => {
    if (sessions.length === 0) return false;
    return sessions.every((session) =>
      selectedSessionIds.includes(session.session_id),
    );
  }, [sessions, selectedSessionIds]);

  useEffect(() => {
    if (!open) return;

    if (award) {
      setSelectedConferenceIdLocal(String(award.conf_id));
      setSelectedTemplateId("");
      setName(award.name);
      setDescription(award.description || "");
      setChairPct(award.chair_pct ?? 100);
      setAttendeePct(award.attendee_pct ?? 0);
      setOpenTime(parseDateTimeLocal(award.open_time));
      setCloseTime(parseDateTimeLocal(award.close_time));
      setSelectedSessionIds(award.session_ids);
      setCriteria(
        award.criteria.length > 0
          ? award.criteria.map((item) => ({
              criteria_name: item.criteria_name,
              weight_pct: item.weight_pct,
            }))
          : [{ ...EMPTY_CRITERION }],
      );
      onConferenceChange(award.conf_id);
      return;
    }

    setSelectedConferenceIdLocal(
      selectedConferenceId ? String(selectedConferenceId) : "",
    );
    setSelectedTemplateId("");
    setName("");
    setDescription("");
    setChairPct(100);
    setAttendeePct(0);
    setOpenTime("");
    setCloseTime("");
    setSelectedSessionIds([]);
    setCriteria([{ ...EMPTY_CRITERION }]);
  }, [award, open, onConferenceChange, selectedConferenceId]);

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(
      (item) => item.template_id === Number(templateId),
    );
    if (!template) return;

    setName(template.name);
    setDescription(template.description || "");
    setChairPct(template.chair_pct ?? 100);
    setAttendeePct(template.attendee_pct ?? 0);
    setCriteria(
      template.criteria.length > 0
        ? template.criteria.map((item) => ({
            criteria_name: item.criteria_name,
            weight_pct: item.weight_pct,
          }))
        : [{ ...EMPTY_CRITERION }],
    );
  };

  const handleToggleSession = (sessionId: number) => {
    setSelectedSessionIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId],
    );
  };

  const handleToggleAllSessions = () => {
    if (isAllSessionsSelected) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(sessions.map((session) => session.session_id));
    }
  };

  const handleCriterionChange = (
    index: number,
    key: keyof CriterionInput,
    value: string,
  ) => {
    setCriteria((current) =>
      current.map((item, idx) => {
        if (idx !== index) return item;
        if (key === "weight_pct") {
          return {
            ...item,
            weight_pct: Number(value),
          };
        }
        return {
          ...item,
          [key]: value,
        };
      }),
    );
  };

  const handleAddCriterion = () => {
    setCriteria((current) => [...current, { ...EMPTY_CRITERION }]);
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria((current) => current.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    const conferenceId = Number(selectedConferenceIdLocal);
    const trimmedName = name.trim();
    const normalizedCriteria = criteria
      .map((item) => ({
        criteria_name: item.criteria_name.trim(),
        weight_pct: Number(item.weight_pct),
      }))
      .filter((item) => item.criteria_name.length > 0);

    if (!conferenceId) {
      toast.error("Conference is required.");
      return;
    }
    if (!trimmedName) {
      toast.error("Award name is required.");
      return;
    }
    if (
      chairPct < 0 ||
      chairPct > 100 ||
      attendeePct < 0 ||
      attendeePct > 100
    ) {
      toast.error("Chair/Attendee weight must be between 0 and 100.");
      return;
    }
    if (chairPct + attendeePct !== 100) {
      toast.error("Chair % and Attendee % must total 100.");
      return;
    }
    if (normalizedCriteria.length === 0) {
      toast.error("At least one criterion is required.");
      return;
    }
    if (normalizedCriteria.some((item) => item.weight_pct <= 0)) {
      toast.error("Each criterion weight must be greater than 0.");
      return;
    }
    const criteriaTotal = normalizedCriteria.reduce(
      (sum, item) => sum + item.weight_pct,
      0,
    );
    if (criteriaTotal !== 100) {
      toast.error("Total criteria weight must equal 100.");
      return;
    }
    if (selectedSessionIds.length === 0) {
      toast.error("Select at least one target session.");
      return;
    }
    if (openTime && closeTime && new Date(openTime) >= new Date(closeTime)) {
      toast.error("Open time must be before close time.");
      return;
    }

    const awardPayload = {
      name: trimmedName,
      description: description.trim() || null,
      chair_pct: chairPct,
      attendee_pct: attendeePct,
      open_time: openTime ? new Date(openTime).toISOString() : null,
      close_time: closeTime ? new Date(closeTime).toISOString() : null,
    };

    try {
      if (award) {
        await onUpdate({
          awardId: award.award_id,
          award: awardPayload,
          sessionIds: selectedSessionIds,
          criteria: normalizedCriteria,
        });
        toast.success("Conference award updated.");
      } else {
        await onCreate({
          award: {
            ...awardPayload,
            conf_id: conferenceId,
          },
          sessionIds: selectedSessionIds,
          criteria: normalizedCriteria,
        });
        toast.success("Conference award created.");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save conference award.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Conference Award" : "Create Conference Award"}
          </DialogTitle>
          <DialogDescription>
            Define award instances for a conference and link them to target
            sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Conference
              </label>
              <Select
                value={selectedConferenceIdLocal}
                onValueChange={(value) => {
                  setSelectedConferenceIdLocal(value);
                  onConferenceChange(Number(value));
                  setSelectedSessionIds([]);
                }}
                disabled={isSubmitting || isEditMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select conference" />
                </SelectTrigger>
                <SelectContent>
                  {conferences.map((conference) => (
                    <SelectItem
                      key={conference.conf_id}
                      value={String(conference.conf_id)}
                    >
                      {conference.conf_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Apply Template
              </label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleApplyTemplate}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem
                      key={template.template_id}
                      value={String(template.template_id)}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Award Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Best Paper Presentation"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={isSubmitting}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Chair (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={chairPct}
                onChange={(event) => setChairPct(Number(event.target.value))}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Attendee (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={attendeePct}
                onChange={(event) => setAttendeePct(Number(event.target.value))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Open Time
              </label>
              <Input
                type="datetime-local"
                value={openTime}
                onChange={(event) => setOpenTime(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Close Time
              </label>
              <Input
                type="datetime-local"
                value={closeTime}
                onChange={(event) => setCloseTime(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Criteria</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCriterion}
                disabled={isSubmitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Criterion
              </Button>
            </div>

            <div className="space-y-2">
              {criteria.map((criterion, index) => (
                <div key={index} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-8">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Name
                    </label>
                    <Input
                      value={criterion.criteria_name}
                      onChange={(event) =>
                        handleCriterionChange(
                          index,
                          "criteria_name",
                          event.target.value,
                        )
                      }
                      placeholder="Content of the presentation"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Weight %
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={criterion.weight_pct}
                      onChange={(event) =>
                        handleCriterionChange(
                          index,
                          "weight_pct",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveCriterion(index)}
                      disabled={isSubmitting || criteria.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Total criteria weight: {criteriaWeightTotal}%
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                Target Sessions
              </label>
              {sessions.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleAllSessions}
                  disabled={isSubmitting}
                  className="h-8 px-2 text-xs"
                >
                  {isAllSessionsSelected ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>

            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sessions available for selected conference.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const checked = selectedSessionIds.includes(
                    session.session_id,
                  );

                  return (
                    <label
                      key={session.session_id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/30"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleSession(session.session_id)}
                        disabled={isSubmitting}
                      />
                      <span>
                        {session.session_name ||
                          `Session #${session.session_id}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Create Award"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
