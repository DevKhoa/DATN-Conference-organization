import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  IAutoGeneratePayload,
  IAutoGenerateResponse,
  ISaveSessionPayload,
  ISaveSessionResponse,
  IRecommendChairPayload,
  IRecommendChairResponse,
  IFinalizeChairsPayload,
  IMeetCreationResponse,
} from "./types";
import { supabase } from "@/lib/supabase";
import { request } from "@/lib/axios";
import { formatPaperTime, formatToLocal } from "@/utils/time";
import { SessionKeys } from "../queries/keys";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conferenceId, sessions }: ISaveSessionPayload) => {
      const savePromises = sessions.map(async (s) => {
        let currentDbId = s.db_id;
        const localStart = formatToLocal(s.start_time);
        const localEnd = formatToLocal(s.end_time);

        if (currentDbId) {
          const { error: uError } = await supabase
            .from("sessions")
            .update({
              session_name: s.session_name,
              start_time: localStart,
              end_time: localEnd,
              room_location: s.room_location,
              format_type: s.format_type,
              conf_id: conferenceId,
              meet_link: s.meet_link,
              record_video_url: s.record_video_url,
            })
            .eq("session_id", currentDbId);

          if (uError) throw uError;

          const { error: delError } = await supabase
            .from("session_papers")
            .delete()
            .eq("session_id", currentDbId);
          if (delError) throw delError;
        } else {
          const { data: sData, error: sError } = await supabase
            .from("sessions")
            .insert([
              {
                conf_id: conferenceId,
                session_name: s.session_name,
                start_time: localStart,
                end_time: localEnd,
                room_location: s.room_location,
                format_type: s.format_type,
                is_ai_generated: s.is_ai_generated,
                chair_person_id: null,
                meet_link: s.meet_link,
                record_video_url: s.record_video_url,
              },
            ])
            .select()
            .single();

          if (sError) throw sError;
          currentDbId = sData.session_id;
        }

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

        return { temp_id: s.temp_id, db_id: currentDbId! };
      });

      const results = await Promise.all(savePromises);
      return { savedSessions: results };
    },
    onSuccess: (_, { conferenceId }) => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ExistingSessions, conferenceId],
      });
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.SessionsByConference, conferenceId],
      });
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessions }: IFinalizeChairsPayload) => {
      const updatePromises = sessions.map(async (s) => {
        if (s.db_id && s.chair_person_id) {
          const { error } = await supabase
            .from("sessions")
            .update({ chair_person_id: s.chair_person_id })
            .eq("session_id", s.db_id);

          if (error) throw error;
        }
      });

      await Promise.all(updatePromises);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ExistingSessions],
      });
    },
  });
};

export const useDeleteMeetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      email,
    }: {
      sessionId: number;
      email: string;
    }) => {
      const data = await request.delete<{ status: string; message: string }>(
        `/sessions/${sessionId}/meet`,
        { params: { email } },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ExistingSessions],
      });
    },
  });
};

export const useCreateMeetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      email,
    }: {
      sessionId: number;
      email: string;
    }) => {
      const data = await request.post<IMeetCreationResponse>(
        `/sessions/${sessionId}/create-meet`,
        { session_id: sessionId, email },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ExistingSessions],
      });
    },
  });
};

export const useToggleMeetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      isActive,
    }: {
      sessionId: number;
      isActive: boolean;
    }) => {
      const data = await request.patch<{ status: string; is_meet_active: boolean }>(
        `/sessions/${sessionId}/toggle-meet`,
        undefined,
        { is_active: isActive }
      );
      return data;
    },
    onMutate: async ({ sessionId, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["conferences/detail"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ["conferences/detail"] });

      // Optimistically update
      queryClient.setQueriesData({ queryKey: ["conferences/detail"] }, (old: any) => {
        if (!old) return old;
        // In ConferenceDetail result, the data contains { conference, sessions }
        if (old.sessions && Array.isArray(old.sessions)) {
          return {
            ...old,
            sessions: old.sessions.map((s: any) =>
              s.session_id === sessionId ? { ...s, is_meet_active: isActive } : s
            ),
          };
        }
        return old;
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      toast.error("Failed to update meeting status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conferences/detail"] });
      queryClient.invalidateQueries({ queryKey: [SessionKeys.ExistingSessions] });
    },
  });
};
