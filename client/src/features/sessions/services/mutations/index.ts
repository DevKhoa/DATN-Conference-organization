import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  IAutoGeneratePayload,
  IAutoGenerateResponse,
  ISaveSessionPayload,
  IRecommendChairPayload,
  IRecommendChairResponse,
  IMeetCreationResponse,
  IMatchReviewPayload,
  IMatchReviewResponse,
} from "./types";
import { supabase } from "@/lib/supabase";
import { request } from "@/lib/axios";
import { formatPaperTime, formatToLocal } from "@/utils/time";
import { SessionKeys } from "../queries/keys";
import { toast } from "sonner";
import { ConferencesKeys } from "@/features/conferences/services/queries/keys";

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
              google_event_id: s.google_event_id,
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
                meet_link: s.meet_link,
                google_event_id: s.google_event_id,
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

          // Assign authors & coauthors to attendences table using user_id directly
          // (Authors/co-authors are NOT ticket holders — they must be stored via user_id,
          //  NOT via registration_id, per the attendences schema convention)
          const paperIds = s.assigned_papers.map((p) => p.paper_id);

          const { data: papersData } = await supabase
            .from("papers")
            .select("primary_author_id")
            .in("paper_id", paperIds);

          const { data: coauthorsData } = await supabase
            .from("paper_coauthors")
            .select("user_id")
            .in("paper_id", paperIds);

          const authorIds = new Set<number>();
          papersData?.forEach((p) => {
            if (p.primary_author_id) authorIds.add(p.primary_author_id);
          });
          coauthorsData?.forEach((c) => {
            if (c.user_id) authorIds.add(c.user_id);
          });

          if (authorIds.size > 0) {
            // Check which authors already have an attendence record for this session
            const { data: existingAtt } = await supabase
              .from("attendences")
              .select("user_id")
              .eq("session_id", currentDbId)
              .in("user_id", Array.from(authorIds));

            const existingUserIds = new Set(
              (existingAtt || []).map((e) => e.user_id).filter(Boolean)
            );

            const newAtts = Array.from(authorIds)
              .filter((userId) => !existingUserIds.has(userId))
              .map((userId) => ({
                session_id: currentDbId,
                user_id: userId,
                is_checkin: false,
              }));

            if (newAtts.length > 0) {
              await supabase.from("attendences").insert(newAtts);
            }
          }
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
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.ConferenceDetail, conferenceId],
        exact: false,
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

export const useMatchReviewMutation = () => {
  return useMutation({
    mutationFn: async ({ sessionId, userId }: IMatchReviewPayload) => {
      return request.post<IMatchReviewResponse>(
        `/sessions/${sessionId}/match-review`,
        { user_id: userId },
      );
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
        { email },
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

export const useUpdateMeetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      email,
    }: {
      sessionId: number;
      email: string;
    }) => {
      const data = await request.patch<IMeetCreationResponse>(
        `/sessions/${sessionId}/update-meet`,
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
      const data = await request.patch<{
        status: string;
        is_meet_active: boolean;
      }>(`/sessions/${sessionId}/toggle-meet`, undefined, {
        is_active: isActive,
      });
      return data;
    },
    onMutate: async ({ sessionId, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["conferences/detail"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: ["conferences/detail"],
      });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: ["conferences/detail"] },
        (old: any) => {
          if (!old) return old;
          // In ConferenceDetail result, the data contains { conference, sessions }
          if (old.sessions && Array.isArray(old.sessions)) {
            return {
              ...old,
              sessions: old.sessions.map((s: any) =>
                s.session_id === sessionId
                  ? { ...s, is_meet_active: isActive }
                  : s,
              ),
            };
          }
          return old;
        },
      );

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
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ExistingSessions],
      });
    },
  });
};

export const useCreateChairInvitationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      email,
      invitedBy,
      clientUrl,
    }: {
      sessionId: number;
      email: string;
      invitedBy?: number;
      clientUrl?: string;
    }) => {
      return request.post(`/sessions/${sessionId}/chair-invitations`, {
        email,
        invited_by: invitedBy,
        client_url: clientUrl,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ChairInvitations, variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ChairInvitations],
      });
    },
  });
};

export const useAcceptChairInvitationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      userId,
      email,
    }: {
      token: string;
      userId?: number;
      email?: string;
    }) => {
      return request.post(`/chair-invitations/${token}/accept`, {
        user_id: userId,
        email,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ChairInvitations, variables.token],
      });
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ChairInvitations],
      });
    },
  });
};

export const useRejectChairInvitationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      userId,
      email,
    }: {
      token: string;
      userId?: number;
      email?: string;
    }) => {
      return request.post(`/chair-invitations/${token}/reject`, {
        user_id: userId,
        email,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ChairInvitations, variables.token],
      });
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ChairInvitations],
      });
    },
  });
};

export const useCancelChairInvitationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      invitationId,
    }: {
      sessionId: number;
      invitationId: string;
    }) => {
      return request.delete(
        `/sessions/${sessionId}/chair-invitations/${invitationId}`,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ChairInvitations, variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ChairInvitations],
      });
    },
  });
};

export const useDeleteSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: number }) => {
      // Hard delete presentation order and paper assignments from session_papers table
      const { error: spError } = await supabase
        .from("session_papers")
        .delete()
        .eq("session_id", sessionId);

      if (spError) {
        throw spError;
      }

      // Soft delete the session itself
      const { error } = await (supabase as any).rpc("soft_delete_session", {
        p_session_id: sessionId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.ExistingSessions],
      });
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.ConferenceDetail],
      });
    },
  });
};

import type { SessionPaperFiles } from "../queries";

export interface SaveSessionPaperFilesPayload {
  sessionId: number;
  paperId: number;
  fileType: "pdf" | "slide" | "text";
  file?: File | null;
  url?: string | null;
  userId: number;
}

export const useSaveSessionPaperFilesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      paperId,
      fileType,
      file,
      url,
      userId,
    }: SaveSessionPaperFilesPayload) => {
      const formData = new FormData();
      formData.append("file_type", fileType);
      formData.append("user_id", String(userId));
      if (file) {
        formData.append("file", file);
      }
      if (url) {
        formData.append("url", url);
      }

      return request.post<SessionPaperFiles>(
        `/sessions/${sessionId}/papers/${paperId}/files`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.SessionPaperFiles, variables.sessionId, variables.paperId],
        exact: false,
      });
      queryClient.refetchQueries({
        queryKey: [SessionKeys.SessionPaperFiles, variables.sessionId, variables.paperId],
        exact: false,
      });
      toast.success("File uploaded successfully.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to save file.");
    }
  });
};

export const useDeleteSessionPaperFileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      paperId,
      fileType,
      userId,
    }: {
      sessionId: number;
      paperId: number;
      fileType: "pdf" | "slide" | "text";
      userId: number;
    }) => {
      return request.delete(
        `/sessions/${sessionId}/papers/${paperId}/files/${fileType}`,
        { user_id: userId }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate all queries matching this session+paper prefix (userId may vary)
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.SessionPaperFiles, variables.sessionId, variables.paperId],
        exact: false,
      });
      queryClient.refetchQueries({
        queryKey: [SessionKeys.SessionPaperFiles, variables.sessionId, variables.paperId],
        exact: false,
      });
      toast.success("File deleted successfully.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to delete file.");
    }
  });
};

