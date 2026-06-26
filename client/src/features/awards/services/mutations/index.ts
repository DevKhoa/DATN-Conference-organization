import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { AwardsKeys } from "@/features/awards/services/queries/keys";
import type {
  CreateConferenceAwardPayload,
  DeleteConferenceAwardPayload,
  CreateAwardTemplatePayload,
  DeleteAwardTemplatePayload,
  UpdateConferenceAwardPayload,
  UpdateAwardTemplatePayload,
} from "./types";

export const useCreateAwardTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ template, criteria }: CreateAwardTemplatePayload) => {
      const { data: createdTemplate, error: templateError } = await supabase
        .from("award_templates")
        .insert(template)
        .select("*")
        .single();

      if (templateError) {
        throw templateError;
      }

      const criteriaRows = criteria.map((item) => ({
        template_id: createdTemplate.template_id,
        criteria_name: item.criteria_name,
        weight_pct: item.weight_pct,
      }));

      if (criteriaRows.length > 0) {
        const { error: criteriaError } = await supabase
          .from("award_template_criteria")
          .insert(criteriaRows);

        if (criteriaError) {
          throw criteriaError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [AwardsKeys.AwardTemplates],
      });
    },
  });
};

export const useUpdateAwardTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      template,
      criteria,
    }: UpdateAwardTemplatePayload) => {
      const { error: templateError } = await supabase
        .from("award_templates")
        .update(template)
        .eq("template_id", templateId);

      if (templateError) {
        throw templateError;
      }

      const { error: deleteCriteriaError } = await supabase
        .from("award_template_criteria")
        .delete()
        .eq("template_id", templateId);

      if (deleteCriteriaError) {
        throw deleteCriteriaError;
      }

      const criteriaRows = criteria.map((item) => ({
        template_id: templateId,
        criteria_name: item.criteria_name,
        weight_pct: item.weight_pct,
      }));

      if (criteriaRows.length > 0) {
        const { error: createCriteriaError } = await supabase
          .from("award_template_criteria")
          .insert(criteriaRows);

        if (createCriteriaError) {
          throw createCriteriaError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [AwardsKeys.AwardTemplates],
      });
    },
  });
};

export const useDeleteAwardTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId }: DeleteAwardTemplatePayload) => {
      const { error: deleteCriteriaError } = await supabase
        .from("award_template_criteria")
        .delete()
        .eq("template_id", templateId);

      if (deleteCriteriaError) {
        throw deleteCriteriaError;
      }

      const { error: deleteTemplateError } = await supabase
        .from("award_templates")
        .delete()
        .eq("template_id", templateId);

      if (deleteTemplateError) {
        throw deleteTemplateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [AwardsKeys.AwardTemplates],
      });
    },
  });
};

export const useCreateConferenceAwardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      award,
      sessionIds,
      criteria,
    }: CreateConferenceAwardPayload) => {
      const { data: createdAward, error: createAwardError } = await supabase
        .from("awards")
        .insert(award)
        .select("*")
        .single();

      if (createAwardError) {
        throw createAwardError;
      }

      if (sessionIds.length > 0) {
        const { error: sessionError } = await supabase
          .from("award_sessions")
          .insert(
            sessionIds.map((sessionId) => ({
              award_id: createdAward.award_id,
              session_id: sessionId,
            })),
          );

        if (sessionError) {
          throw sessionError;
        }
      }

      if (criteria.length > 0) {
        const { error: criteriaError } = await supabase
          .from("award_criteria")
          .insert(
            criteria.map((item) => ({
              award_id: createdAward.award_id,
              criteria_name: item.criteria_name,
              weight_pct: item.weight_pct,
            })),
          );

        if (criteriaError) {
          throw criteriaError;
        }
      }

      return createdAward;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [AwardsKeys.ConferenceAwards, variables.award.conf_id],
      });
    },
  });
};

export const useUpdateConferenceAwardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      awardId,
      award,
      sessionIds,
      criteria,
    }: UpdateConferenceAwardPayload) => {
      const { data: updatedAward, error: updateAwardError } = await supabase
        .from("awards")
        .update(award)
        .eq("award_id", awardId)
        .select("*")
        .single();

      if (updateAwardError) {
        throw updateAwardError;
      }

      const { error: deleteSessionsError } = await supabase
        .from("award_sessions")
        .delete()
        .eq("award_id", awardId);

      if (deleteSessionsError) {
        throw deleteSessionsError;
      }

      if (sessionIds.length > 0) {
        const { error: insertSessionsError } = await supabase
          .from("award_sessions")
          .insert(
            sessionIds.map((sessionId) => ({
              award_id: awardId,
              session_id: sessionId,
            })),
          );

        if (insertSessionsError) {
          throw insertSessionsError;
        }
      }

      const { data: existingCriteria, error: fetchCriteriaError } = await supabase
        .from("award_criteria")
        .select("*")
        .eq("award_id", awardId);

      if (fetchCriteriaError) throw fetchCriteriaError;

      const existingMap = new Map(existingCriteria.map((c) => [c.criteria_name, c]));
      const payloadMap = new Map(criteria.map((c) => [c.criteria_name, c]));

      const criteriaToDelete = existingCriteria.filter((c) => !payloadMap.has(c.criteria_name));
      const criteriaToUpdate = criteria.filter((c) => existingMap.has(c.criteria_name));
      const criteriaToInsert = criteria.filter((c) => !existingMap.has(c.criteria_name));

      if (criteriaToDelete.length > 0) {
        const idsToDelete = criteriaToDelete.map((c) => c.criteria_id);
        const { error: delErr } = await supabase
          .from("award_criteria")
          .delete()
          .in("criteria_id", idsToDelete);
        if (delErr) throw delErr;
      }

      for (const item of criteriaToUpdate) {
        const existing = existingMap.get(item.criteria_name)!;
        if (existing.weight_pct !== item.weight_pct) {
          const { error: updErr } = await supabase
            .from("award_criteria")
            .update({ weight_pct: item.weight_pct })
            .eq("criteria_id", existing.criteria_id);
          if (updErr) throw updErr;
        }
      }

      if (criteriaToInsert.length > 0) {
        const { error: insErr } = await supabase
          .from("award_criteria")
          .insert(
            criteriaToInsert.map((item) => ({
              award_id: awardId,
              criteria_name: item.criteria_name,
              weight_pct: item.weight_pct,
            })),
          );
        if (insErr) throw insErr;
      }

      return updatedAward;
    },
    onSuccess: (updatedAward) => {
      queryClient.invalidateQueries({
        queryKey: [AwardsKeys.ConferenceAwards, updatedAward.conf_id],
      });
    },
  });
};

export const useDeleteConferenceAwardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ awardId }: DeleteConferenceAwardPayload) => {
      const { data: awardRow, error: getAwardError } = await supabase
        .from("awards")
        .select("award_id, conf_id")
        .eq("award_id", awardId)
        .single();

      if (getAwardError) {
        throw getAwardError;
      }

      const { error: deleteSessionsError } = await supabase
        .from("award_sessions")
        .delete()
        .eq("award_id", awardId);

      if (deleteSessionsError) {
        throw deleteSessionsError;
      }

      const { error: deleteCriteriaError } = await supabase
        .from("award_criteria")
        .delete()
        .eq("award_id", awardId);

      if (deleteCriteriaError) {
        throw deleteCriteriaError;
      }

      const { error: deleteAwardError } = await supabase
        .from("awards")
        .delete()
        .eq("award_id", awardId);

      if (deleteAwardError) {
        throw deleteAwardError;
      }

      return awardRow;
    },
    onSuccess: (awardRow) => {
      queryClient.invalidateQueries({
        queryKey: [AwardsKeys.ConferenceAwards, awardRow.conf_id],
      });
    },
  });
};
