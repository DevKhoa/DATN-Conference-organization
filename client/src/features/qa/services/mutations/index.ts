import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/axios";
import { QAKeys } from "@/features/qa/services/queries/keys";
import type { QuestionCreate, QuestionResponse, QuestionStatusUpdate, QuestionAnswer } from "@/features/qa/types";
import { ConferencesKeys } from "@/features/conferences/services/queries/keys";

export const useCreateQuestionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: QuestionCreate) => {
      const data = await request.post<QuestionResponse>("/questions", payload);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate specific cache
      queryClient.invalidateQueries({ queryKey: QAKeys.BySession(data.session_id) });
      queryClient.invalidateQueries({ queryKey: QAKeys.ByPaper(data.paper_id) });
      // We might be looking at conferences/detail
      queryClient.invalidateQueries({ queryKey: [ConferencesKeys.ConferenceDetail] });
    },
  });
};

export const useUpvoteQuestionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, userId }: { questionId: number; userId: number }) => {
      const data = await request.post<{ status: string; message: string; upvotes_count: number }>(`/questions/${questionId}/upvote?user_id=${userId}`);
      return data;
    },
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: QAKeys.All });
      queryClient.invalidateQueries({ queryKey: [ConferencesKeys.ConferenceDetail] });
    },
  });
};

export const useRemoveUpvoteQuestionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, userId }: { questionId: number; userId: number }) => {
      const data = await request.delete<{ status: string; message: string; upvotes_count: number }>(`/questions/${questionId}/upvote?user_id=${userId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QAKeys.All });
      queryClient.invalidateQueries({ queryKey: [ConferencesKeys.ConferenceDetail] });
    },
  });
};

export const useApproveQuestionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, userId }: { questionId: number; userId: number }) => {
      const data = await request.patch<QuestionResponse>(`/questions/${questionId}/approve?user_id=${userId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QAKeys.All });
      queryClient.invalidateQueries({ queryKey: [ConferencesKeys.ConferenceDetail] });
    },
  });
};

export const useAnswerQuestionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, payload }: { questionId: number; payload: QuestionAnswer }) => {
      const data = await request.patch<QuestionResponse>(`/questions/${questionId}/answer`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QAKeys.All });
      queryClient.invalidateQueries({ queryKey: [ConferencesKeys.ConferenceDetail] });
    },
  });
};

export const useUpdateQuestionStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, payload }: { questionId: number; payload: QuestionStatusUpdate }) => {
      const data = await request.patch<QuestionResponse>(`/questions/${questionId}/status`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QAKeys.All });
      queryClient.invalidateQueries({ queryKey: [ConferencesKeys.ConferenceDetail] });
    },
  });
};
