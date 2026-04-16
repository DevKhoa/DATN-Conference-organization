import { useMutation } from "@tanstack/react-query";
import type {
  IAutoGeneratePayload,
  IAutoGenerateResponse,
  ISaveSessionPayload,
  ISaveSessionResponse,
  IRecommendChairPayload,
  IRecommendChairResponse,
  IFinalizeChairsPayload,
} from "./types";
import { supabase } from "@/lib/supabase";
import { request } from "@/lib/axios";
import { formatPaperTime, formatToLocal } from "@/utils/time";

export const useAutoGenerateSessionsMutation = () => {
  return useMutation({
    mutationFn: async (payload: IAutoGeneratePayload) => {
      const data = await request.post<IAutoGenerateResponse>(
        "/sessions/auto-generate",
        payload,
      );

      if (!data.sessions) {
        throw new Error("Service response invalid");
      }

      return data;
    },
  });
};

export const useSaveSessionsMutation = () => {
  return useMutation({
    mutationFn: async ({ conferenceId, sessions }: ISaveSessionPayload) => {
      const savedSessions: ISaveSessionResponse["savedSessions"] = [];

      for (const s of sessions) {
        let currentDbId = s.db_id;

        const localStart = formatToLocal(s.start_time);
        const localEnd = formatToLocal(s.end_time);

        if (currentDbId) {
          // Update existing session
          const { error: uError } = await supabase
            .from("sessions")
            .update({
              session_name: s.session_name,
              start_time: localStart,
              end_time: localEnd,
              room_location: s.room_location,
              conf_id: conferenceId,
            })
            .eq("session_id", currentDbId);

          if (uError) throw uError;

          // Delete existing session papers
          const { error: delError } = await supabase
            .from("session_papers")
            .delete()
            .eq("session_id", currentDbId);
          if (delError) throw delError;
        } else {
          // Insert new session
          const { data: sData, error: sError } = await supabase
            .from("sessions")
            .insert([
              {
                conf_id: conferenceId,
                session_name: s.session_name,
                start_time: localStart,
                end_time: localEnd,
                room_location: s.room_location,
                is_ai_generated: s.is_ai_generated,
                chair_person_id: null,
              },
            ])
            .select()
            .single();

          if (sError) throw sError;
          currentDbId = sData.session_id;
        }

        // Insert session papers
        if (s.assigned_papers.length > 0) {
          const paperInserts = s.assigned_papers.map((p, idx) => ({
            session_id: currentDbId,
            paper_id: p.paper_id,
            presentation_order: idx + 1,
            start_time: p.start_time
              ? formatPaperTime(p.start_time, localStart)
              : null,
            end_time: p.end_time
              ? formatPaperTime(p.end_time, localStart)
              : null,
          }));
          const { error: pError } = await supabase
            .from("session_papers")
            .insert(paperInserts);
          if (pError) throw pError;
        }

        savedSessions.push({ temp_id: s.temp_id, db_id: currentDbId! });
      }

      return { savedSessions };
    },
  });
};

export const useRecommendChairMutation = () => {
  return useMutation({
    mutationFn: async ({
      sessionId,
      limit = 5,
      threshold = 0.1,
    }: IRecommendChairPayload) => {
      const data = await request.post<IRecommendChairResponse>(
        `/sessions/${sessionId}/recommend-chair`,
        undefined,
        { limit, threshold },
      );

      return data;
    },
  });
};

export const useFinalizeChairsMutation = () => {
  return useMutation({
    mutationFn: async ({ sessions }: IFinalizeChairsPayload) => {
      for (const s of sessions) {
        if (s.db_id && s.chair_person_id) {
          const { error } = await supabase
            .from("sessions")
            .update({ chair_person_id: s.chair_person_id })
            .eq("session_id", s.db_id);

          if (error) throw error;
        }
      }

      return { success: true };
    },
  });
};
