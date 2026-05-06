import type { TablesInsert, TablesUpdate } from "@/types/database.types";
import type { AwardCriteriaInput } from "@/features/awards/types";

export type CreateAwardTemplatePayload = {
  template: Omit<TablesInsert<"award_templates">, "template_id">;
  criteria: AwardCriteriaInput[];
};

export type UpdateAwardTemplatePayload = {
  templateId: number;
  template: Omit<TablesUpdate<"award_templates">, "template_id" | "created_at">;
  criteria: AwardCriteriaInput[];
};

export type DeleteAwardTemplatePayload = {
  templateId: number;
};

export type CreateConferenceAwardPayload = {
  award: Omit<TablesInsert<"awards">, "award_id" | "created_at">;
  sessionIds: number[];
  criteria: AwardCriteriaInput[];
};

export type UpdateConferenceAwardPayload = {
  awardId: number;
  award: Omit<TablesUpdate<"awards">, "award_id" | "conf_id" | "created_at">;
  sessionIds: number[];
  criteria: AwardCriteriaInput[];
};

export type DeleteConferenceAwardPayload = {
  awardId: number;
};
