export const QAKeys = {
  All: ["qa"] as const,
  BySession: (sessionId: number, userId?: number | null) => [...QAKeys.All, "session", sessionId, userId || "anonymous"] as const,
  ByPaper: (paperId: number, userId?: number | null) => [...QAKeys.All, "paper", paperId, userId || "anonymous"] as const,
};
