import type { Database, Tables } from "@/types/database.types";

export type AwardTemplate = Tables<"award_templates">;
export type AwardTemplateCriteria = Tables<"award_template_criteria">;
export type Award = Tables<"awards">;
export type AwardCriteria = Tables<"award_criteria">;
export type AwardSession = Tables<"award_sessions">;
export type SessionBase = Pick<Tables<"sessions">, "session_id" | "session_name">;
export type ConferenceBase = Pick<Tables<"conferences">, "conf_id" | "conf_name">;

export type AwardTemplateWithCriteria = AwardTemplate & {
  criteria: AwardTemplateCriteria[];
};

export type AwardCriteriaInput = Pick<
  AwardTemplateCriteria,
  "criteria_name" | "weight_pct"
>;

export type AwardWithSessions = Award & {
  session_ids: number[];
  sessions: SessionBase[];
  criteria: AwardCriteria[];
  conference_name?: string;
};

export type AwardLeaderboardRow =
  Database["public"]["Views"]["award_leaderboard_view"]["Row"];
