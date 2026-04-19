export const QAKeys = {
  All: ["qa"] as const,
  BySession: (sessionId: number) => [...QAKeys.All, "session", sessionId] as const,
  ByPaper: (paperId: number) => [...QAKeys.All, "paper", paperId] as const,
};
