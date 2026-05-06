import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { AwardsKeys } from "./keys";
import type {
  AwardLeaderboardRow,
  AwardTemplateWithCriteria,
  AwardWithSessions,
} from "@/features/awards/types";

export const fetchAwardTemplates = async (): Promise<
  AwardTemplateWithCriteria[]
> => {
  const [
    { data: templates, error: templatesError },
    { data: criteria, error: criteriaError },
  ] = await Promise.all([
    supabase
      .from("award_templates")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("award_template_criteria")
      .select("*")
      .order("criteria_id", { ascending: true }),
  ]);

  if (templatesError) {
    throw templatesError;
  }

  if (criteriaError) {
    throw criteriaError;
  }

  const criteriaByTemplateId = new Map<number, typeof criteria>();
  (criteria || []).forEach((item) => {
    const templateCriteria = criteriaByTemplateId.get(item.template_id) || [];
    templateCriteria.push(item);
    criteriaByTemplateId.set(item.template_id, templateCriteria);
  });

  return (templates || []).map((template) => ({
    ...template,
    criteria: criteriaByTemplateId.get(template.template_id) || [],
  }));
};

export const useAwardTemplatesQuery = () => {
  return useQuery({
    queryKey: [AwardsKeys.AwardTemplates],
    queryFn: fetchAwardTemplates,
  });
};

export const fetchConferenceAwards = async (
  conferenceId: number,
): Promise<AwardWithSessions[]> => {
  const [
    { data: awards, error: awardsError },
    { data: awardSessions, error: awardSessionsError },
    { data: awardCriteria, error: awardCriteriaError },
    { data: sessions, error: sessionsError },
    { data: conference, error: conferenceError },
  ] = await Promise.all([
    supabase
      .from("awards")
      .select("*")
      .eq("conf_id", conferenceId)
      .order("created_at", { ascending: false }),
    supabase.from("award_sessions").select("award_id, session_id"),
    supabase.from("award_criteria").select("*"),
    supabase
      .from("sessions")
      .select("session_id, session_name")
      .eq("conf_id", conferenceId),
    supabase
      .from("conferences")
      .select("conf_id, conf_name")
      .eq("conf_id", conferenceId)
      .single(),
  ]);

  if (awardsError) {
    throw awardsError;
  }
  if (awardSessionsError) {
    throw awardSessionsError;
  }
  if (awardCriteriaError) {
    throw awardCriteriaError;
  }
  if (sessionsError) {
    throw sessionsError;
  }
  if (conferenceError) {
    throw conferenceError;
  }

  const sessionMap = new Map(
    (sessions || []).map((session) => [session.session_id, session]),
  );
  const sessionIdsByAwardId = new Map<number, number[]>();
  const criteriaByAwardId = new Map<number, typeof awardCriteria>();

  (awardSessions || []).forEach((item) => {
    const values = sessionIdsByAwardId.get(item.award_id) || [];
    values.push(item.session_id);
    sessionIdsByAwardId.set(item.award_id, values);
  });
  (awardCriteria || []).forEach((item) => {
    const values = criteriaByAwardId.get(item.award_id) || [];
    values.push(item);
    criteriaByAwardId.set(item.award_id, values);
  });

  return (awards || []).map((award) => {
    const sessionIds = sessionIdsByAwardId.get(award.award_id) || [];
    const criteria = criteriaByAwardId.get(award.award_id) || [];
    const linkedSessions = sessionIds
      .map((sessionId) => sessionMap.get(sessionId))
      .filter((session): session is NonNullable<typeof session> => Boolean(session));

    return {
      ...award,
      session_ids: sessionIds,
      sessions: linkedSessions,
      criteria,
      conference_name: conference.conf_name || undefined,
    };
  });
};

export const useConferenceAwardsQuery = (conferenceId: number | null) => {
  return useQuery({
    queryKey: [AwardsKeys.ConferenceAwards, conferenceId],
    queryFn: conferenceId ? () => fetchConferenceAwards(conferenceId) : undefined,
    enabled: Boolean(conferenceId),
  });
};

export const fetchAwardLeaderboard = async (
  conferenceId: number,
): Promise<AwardLeaderboardRow[]> => {
  const { data, error } = await supabase
    .from("award_leaderboard_view")
    .select("*")
    .eq("conf_id", conferenceId)
    .order("award_name", { ascending: true })
    .order("average_score", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as AwardLeaderboardRow[];
};

export const useAwardLeaderboardQuery = (conferenceId: number | null) => {
  return useQuery({
    queryKey: [AwardsKeys.AwardLeaderboard, conferenceId],
    queryFn: conferenceId ? () => fetchAwardLeaderboard(conferenceId) : undefined,
    enabled: Boolean(conferenceId),
  });
};
