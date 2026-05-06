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
import type {
  CreateAwardTemplatePayload,
  UpdateAwardTemplatePayload,
} from "@/features/awards/services/mutations/types";
import type { AwardTemplateWithCriteria } from "@/features/awards/types";

type AwardTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AwardTemplateWithCriteria | null;
  isSubmitting: boolean;
  onCreate: (payload: CreateAwardTemplatePayload) => Promise<void>;
  onUpdate: (payload: UpdateAwardTemplatePayload) => Promise<void>;
};

type CriterionInput = {
  criteria_name: string;
  weight_pct: number;
};

const EMPTY_CRITERION: CriterionInput = {
  criteria_name: "",
  weight_pct: 0,
};

const getInitialCriteria = (template?: AwardTemplateWithCriteria | null) => {
  if (!template || template.criteria.length === 0) {
    return [
      { ...EMPTY_CRITERION },
      { ...EMPTY_CRITERION },
    ];
  }

  return template.criteria.map((criterion) => ({
    criteria_name: criterion.criteria_name,
    weight_pct: criterion.weight_pct,
  }));
};

export const AwardTemplateDialog = ({
  open,
  onOpenChange,
  template,
  isSubmitting,
  onCreate,
  onUpdate,
}: AwardTemplateDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chairPct, setChairPct] = useState(100);
  const [attendeePct, setAttendeePct] = useState(0);
  const [criteria, setCriteria] = useState<CriterionInput[]>([
    { ...EMPTY_CRITERION },
  ]);

  const isEditMode = Boolean(template);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setChairPct(template.chair_pct ?? 100);
      setAttendeePct(template.attendee_pct ?? 0);
      setCriteria(getInitialCriteria(template));
      return;
    }

    setName("");
    setDescription("");
    setChairPct(100);
    setAttendeePct(0);
    setCriteria([{ ...EMPTY_CRITERION }]);
  }, [open, template]);

  const criteriaWeightTotal = useMemo(
    () => criteria.reduce((sum, item) => sum + (Number(item.weight_pct) || 0), 0),
    [criteria],
  );

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
    const trimmedName = name.trim();
    const normalizedCriteria = criteria
      .map((item) => ({
        criteria_name: item.criteria_name.trim(),
        weight_pct: Number(item.weight_pct),
      }))
      .filter((item) => item.criteria_name.length > 0);

    if (!trimmedName) {
      toast.error("Template name is required.");
      return;
    }

    if (chairPct < 0 || chairPct > 100 || attendeePct < 0 || attendeePct > 100) {
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

    const total = normalizedCriteria.reduce((sum, item) => sum + item.weight_pct, 0);
    if (total !== 100) {
      toast.error("Total criteria weight must equal 100.");
      return;
    }

    const templatePayload = {
      name: trimmedName,
      description: description.trim() || null,
      chair_pct: chairPct,
      attendee_pct: attendeePct,
    };

    try {
      if (template) {
        await onUpdate({
          templateId: template.template_id,
          template: templatePayload,
          criteria: normalizedCriteria,
        });
        toast.success("Award template updated.");
      } else {
        await onCreate({
          template: templatePayload,
          criteria: normalizedCriteria,
        });
        toast.success("Award template created.");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save award template.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Award Template" : "Create Award Template"}
          </DialogTitle>
          <DialogDescription>
            Configure reusable weights and criteria for conference awards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Template Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Best Paper Presentation"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Template used for evaluating paper presentations."
              rows={3}
              disabled={isSubmitting}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Chair (%)</label>
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
              <label className="mb-1 block text-sm font-medium">Attendee (%)</label>
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
              Total criteria weight:{" "}
              <span
                className={
                  criteriaWeightTotal === 100 ? "font-semibold text-foreground" : "font-semibold text-destructive"
                }
              >
                {criteriaWeightTotal}%
              </span>
            </p>
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
              "Create Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
