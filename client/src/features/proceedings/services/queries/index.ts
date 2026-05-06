import { request } from "@/lib/axios";

export interface ProceedingsPapersResponse {
  papers: any[];
  total: number;
}

export const fetchProceedingsBootstrap = async (
  confId: number,
  limit: number,
) => {
  return request.get<any>(`/proceedings/${confId}/bootstrap`, {
    params: { limit },
  });
};

export const fetchProceedingsPapers = async (
  confId: number,
  offset: number,
  limit: number,
  includeAbstract = true,
): Promise<ProceedingsPapersResponse> => {
  const data = await request.get<any>(`/proceedings/${confId}/papers`, {
    params: {
      offset,
      limit,
      include_abstract: includeAbstract,
    },
  });

  return {
    papers: data.papers || [],
    total: data.total || 0,
  };
};

export const fetchProceedingsReviewers = async (
  confId: number,
): Promise<any[]> => {
  const data = await request.get<any>(`/proceedings/${confId}/reviewers`);
  return data.reviewers || [];
};

export const fetchProceedingsCachedPdfUrl = async (
  confId: number,
  key: string,
): Promise<string | null> => {
  try {
    const data = await request.get<{ url?: string }>(
      `/proceedings/${confId}/pdf-cache`,
      {
        params: { key },
      },
    );
    return data.url || null;
  } catch {
    return null;
  }
};

export * from "./keys";
