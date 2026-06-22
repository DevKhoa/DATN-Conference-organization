import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/axios";
import { supabase } from "@/lib/supabase";
import { PapersKeys } from "@/features/papers/services/queries/keys";
import { ConferencesKeys } from "@/features/conferences/services/queries/keys";
import { SessionKeys } from "@/features/sessions/services/queries/keys";
import { AwardsKeys } from "@/features/awards/services/queries/keys";
import type {
  AnalyzeReviewResult,
  CreatePaperPayload,
  CreatePaperResult,
  GrammarReviewResult,
  PlagiarismRequestPayload,
  SavePaperAwardMarkingPayload,
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

export const useSavePaperAwardMarkingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paperId,
      awardId,
      userId,
      comments,
      scores,
      existingMarkId,
    }: SavePaperAwardMarkingPayload) => {
      let markId = existingMarkId || null;

      if (markId) {
        const { error: updateMarkError } = await supabase
          .from("marking_records")
          .update({
            comments: comments?.trim() || null,
            marked_at: new Date().toISOString(),
          })
          .eq("mark_id", markId);

        if (updateMarkError) throw updateMarkError;
      } else {
        const { data: createdMark, error: createMarkError } = await supabase
          .from("marking_records")
          .insert({
            award_id: awardId,
            paper_id: paperId,
            marked_by: userId,
            comments: comments?.trim() || null,
            marked_at: new Date().toISOString(),
          })
          .select("mark_id")
          .single();

        if (createMarkError) throw createMarkError;
        markId = createdMark.mark_id;
      }

      const { error: deleteDetailsError } = await supabase
        .from("marking_details")
        .delete()
        .eq("mark_id", markId);
      if (deleteDetailsError) throw deleteDetailsError;

      const { error: insertDetailsError } = await supabase
        .from("marking_details")
        .insert(
          scores.map((item) => ({
            mark_id: markId!,
            criteria_id: item.criteriaId,
            score: item.score,
          })),
        );
      if (insertDetailsError) throw insertDetailsError;

      return { paperId, userId };
    },
    onSuccess: ({ paperId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.PublicPaperDetailPage, paperId, userId],
      });
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.PublicPaperDetailPage, paperId],
      });
      queryClient.invalidateQueries({
        queryKey: [AwardsKeys.AwardLeaderboard],
      });
    },
  });
};

export const useUpdatePaperInfoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      paperId,
      title,
      abstract,
    }: {
      paperId: number;
      title: string;
      abstract: string;
    }) => {
      const { error } = await supabase
        .from("papers")
        .update({ title, abstract })
        .eq("paper_id", paperId);

      if (error) throw error;
      return paperId;
    },
    onSuccess: (paperId) => {
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.PublicPaperDetailPage, paperId],
      });
    },
  });
};

export const useUpdatePaperContentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      paperId,
      versionId,
      uploaderId,
      file,
      driveLink,
    }: {
      paperId: number;
      versionId: number | null;
      uploaderId: number;
      file?: File | null;
      driveLink?: string;
    }) => {
      let activeVersionId = versionId;

      // Create a version if none exists
      if (!activeVersionId) {
        const { data: newVersion, error: createError } = await supabase
          .from("paper_versions")
          .insert([
            {
              paper_id: paperId,
              version_number: 1,
              upload_by: uploaderId,
              upload_date: new Date().toISOString(),
              display: true,
              is_final: false,
              format_ok: false,
              file_path: "pending_upload",
            },
          ])
          .select("version_id")
          .single();

        if (createError) throw createError;
        activeVersionId = newVersion.version_id;
      }

      let finalFilePath = "";

      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadData = await request.post<{ url?: string }>(
          `/papers/${paperId}/${activeVersionId}/upload`,
          formData,
        );
        if (uploadData?.url) {
          finalFilePath = uploadData.url;
        } else {
          throw new Error("File upload failed, no URL returned.");
        }
      } else if (driveLink) {
        const uploadData = await request.post<{ url?: string }>(
          `/papers/${paperId}/${activeVersionId}/upload-link`,
          { link: driveLink },
        );
        if (uploadData?.url) {
          finalFilePath = uploadData.url;
        } else {
          throw new Error("Link upload failed, no URL returned.");
        }
      }

      if (finalFilePath) {
        const { error: updateError } = await supabase
          .from("paper_versions")
          .update({ file_path: finalFilePath, display: true })
          .eq("version_id", activeVersionId);

        if (updateError) throw updateError;
      }

      return paperId;
    },
    onSuccess: (paperId) => {
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.PublicPaperDetailPage, paperId],
      });
    },
  });
};

export const useDeletePaperMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paperId }: { paperId: number }) => {
      const { error } = await (supabase as any).rpc("soft_delete_paper", {
        p_paper_id: paperId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: (_, { paperId }) => {
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.AcceptedPapers],
      });
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.PaginatedPapers],
      });
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.PapersCount],
      });
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.MyPapers],
      });
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.MyPaperDetail],
      });
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.PublicPaperDetail],
      });
      queryClient.invalidateQueries({
        queryKey: [PapersKeys.PublicPaperDetailPage],
      });
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.ConferenceDetail],
      });
      queryClient.invalidateQueries({
        queryKey: [SessionKeys.SessionsByConference],
      });
    },
  });
};
