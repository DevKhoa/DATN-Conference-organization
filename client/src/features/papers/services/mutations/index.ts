import { useMutation } from "@tanstack/react-query";
import { request } from "@/lib/axios";
import { supabase } from "@/lib/supabase";
import type {
  AnalyzeReviewResult,
  CreatePaperPayload,
  CreatePaperResult,
  GrammarReviewResult,
  PlagiarismRequestPayload,
  PlagiarismResult,
  UploadPaperVersionPayload,
  UploadPaperVersionResult,
} from "./types";

export const useGenerateEmbeddingMutation = () => {
  return useMutation({
    mutationFn: async ({
      paperId,
      versionId,
    }: {
      paperId: number;
      versionId: number;
    }) => {
      const data = await request.post(
        `/papers/${paperId}/${versionId}/generate-embedding`,
      );

      return data;
    },
  });
};

export const useCheckPlagiarismMutation = () => {
  return useMutation({
    mutationFn: async ({
      paperId,
      versionId,
      threshold = 0.75,
    }: PlagiarismRequestPayload): Promise<PlagiarismResult> => {
      const data = await request.post<{
        analysis_result: PlagiarismResult;
      }>(`/papers/${paperId}/${versionId}/check-plagiarism`, { threshold });

      console.log("Plagiarism check response:", data);

      return data.analysis_result;
    },
  });
};

export const useReviewFormatMutation = () => {
  return useMutation({
    mutationFn: async ({
      paperId,
      versionId,
    }: {
      paperId: number;
      versionId: number;
    }): Promise<GrammarReviewResult> => {
      try {
        const data = await request.post<{ review_result: string }>(
          `/papers/${paperId}/${versionId}/review-format`,
        );

        return JSON.parse(data.review_result) as GrammarReviewResult;
      } catch {
        throw new Error("Format review failed.");
      }
    },
  });
};

export const useAnalyzeReviewMutation = () => {
  return useMutation({
    mutationFn: async (reviewId: number): Promise<AnalyzeReviewResult> => {
      try {
        const data = await request.post<AnalyzeReviewResult>(
          `/reviews/${reviewId}/analyze-nlp`,
        );

        return data;
      } catch {
        throw new Error("Analysis failed.");
      }
    },
  });
};

export const useCreatePaperMutation = () => {
  return useMutation({
    mutationFn: async ({
      title,
      abstract,
      primaryAuthorId,
      conferenceId,
      coAuthorIds = [],
    }: CreatePaperPayload): Promise<CreatePaperResult> => {
      const { data, error } = await supabase
        .from("papers")
        .insert([
          {
            title,
            abstract,
            primary_author_id: primaryAuthorId,
            status: "ACCEPTED",
            submitted_conf: conferenceId,
            created_at: new Date().toISOString(),
          },
        ])
        .select("paper_id")
        .single();

      if (error || !data) {
        throw error || new Error("Failed to create paper.");
      }

      if (coAuthorIds.length > 0) {
        const coAuthorInserts = coAuthorIds.map((userId, index) => ({
          paper_id: data.paper_id,
          user_id: userId,
          author_order: index + 2,
        }));

        const { error: coAuthorError } = await supabase
          .from("paper_coauthors")
          .insert(coAuthorInserts);

        if (coAuthorError) throw coAuthorError;
      }

      return { paper_id: data.paper_id };
    },
  });
};

export const useUploadPaperVersionMutation = () => {
  return useMutation({
    mutationFn: async ({
      paperId,
      uploaderId,
      file,
      display,
    }: UploadPaperVersionPayload): Promise<UploadPaperVersionResult> => {
      const { count, error: countError } = await supabase
        .from("paper_versions")
        .select("version_id", { count: "exact", head: true })
        .eq("paper_id", paperId);

      if (countError) throw countError;

      const versionNumber = (count || 0) + 1;

      const { data: versionData, error: versionError } = await supabase
        .from("paper_versions")
        .insert([
          {
            paper_id: paperId,
            version_number: versionNumber,
            upload_by: uploaderId,
            upload_date: new Date().toISOString(),
            display,
            is_final: false,
            format_ok: false,
            file_path: "pending_upload",
          },
        ])
        .select("version_id, file_path")
        .single();

      if (versionError || !versionData) {
        throw versionError || new Error("Failed to create paper version.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const uploadData = await request.post<{ url?: string }>(
        `/papers/${paperId}/${versionData.version_id}/upload`,
        formData,
      );

      if (uploadData?.url) {
        const { error: updateError } = await supabase
          .from("paper_versions")
          .update({ file_path: uploadData.url })
          .eq("version_id", versionData.version_id);

        if (updateError) throw updateError;
      }

      return {
        version_id: versionData.version_id,
        file_path: uploadData?.url || versionData.file_path,
      };
    },
  });
};
