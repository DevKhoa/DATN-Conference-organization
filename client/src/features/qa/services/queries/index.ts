import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/axios";
import { QAKeys } from "./keys";
import type { QuestionResponse } from "@/features/qa/types";

export const useSessionQuestionsQuery = (sessionId: number | null, userId?: number | null) => {
  return useQuery({
    queryKey: QAKeys.BySession(sessionId!, userId),
    queryFn: sessionId
      ? async () => {
          const url = userId 
            ? `/sessions/${sessionId}/questions?user_id=${userId}`
            : `/sessions/${sessionId}/questions`;
          const data = await request.get<QuestionResponse[]>(url);
          return data;
        }
      : () => Promise.resolve([]),
    enabled: !!sessionId,
    refetchInterval: 10000, 
  });
};

export const usePaperQuestionsQuery = (paperId: number | null, userId?: number | null) => {
  return useQuery({
    queryKey: QAKeys.ByPaper(paperId!, userId),
    queryFn: paperId
      ? async () => {
          const url = userId 
            ? `/papers/${paperId}/questions?user_id=${userId}`
            : `/papers/${paperId}/questions`;
          const data = await request.get<QuestionResponse[]>(url);
          return data;
        }
      : () => Promise.resolve([]),
    enabled: !!paperId,
    refetchInterval: 10000, 
  });
};
