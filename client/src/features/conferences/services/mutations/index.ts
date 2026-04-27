import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { request } from "@/lib/axios";
import { ConferencesKeys } from "../queries/keys";
import type {
  ICreateConferencePayload,
  ICreateConferenceResponse,
  IUploadConferenceBannerPayload,
  IUploadConferenceBannerResponse,
  IDeleteConferenceBannerPayload,
  IDeleteConferenceBannerResponse,
} from "./types";

export const useCreateConferenceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: ICreateConferencePayload,
    ): Promise<ICreateConferenceResponse> => {
      const { data, error } = await supabase
        .from("conferences")
        .insert([payload])
        .select("conf_id")
        .single();

      if (error) throw error;

      return { conf_id: data.conf_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.ActiveConferences],
      });
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.PaginatedConferences],
      });
      queryClient.invalidateQueries({
        queryKey: [ConferencesKeys.ConferencesCount],
      });
    },
  });
};

export const useUploadConferenceBannerMutation = () => {
  return useMutation({
    mutationFn: async ({
      conferenceId,
      file,
    }: IUploadConferenceBannerPayload): Promise<IUploadConferenceBannerResponse> => {
      const formPayload = new FormData();
      formPayload.append("file", file);

      const result = await request.post<IUploadConferenceBannerResponse>(
        `/conferences/${conferenceId}/banners`,
        formPayload as unknown as object,
      );

      if (!Array.isArray(result.all_banners)) {
        throw new Error("Upload failed: invalid response");
      }

      const { error } = await supabase
        .from("conferences")
        .update({ banner_urls: result.all_banners })
        .eq("conf_id", conferenceId);

      if (error) throw error;

      return { all_banners: result.all_banners };
    },
  });
};

export const useDeleteConferenceBannerMutation = () => {
  return useMutation({
    mutationFn: async ({
      conferenceId,
      url_to_remove,
    }: IDeleteConferenceBannerPayload): Promise<IDeleteConferenceBannerResponse> => {
      const response = await request.delete<IDeleteConferenceBannerResponse>(
        `/conferences/${conferenceId}/banners`,
        { url_to_remove },
      );

      const result = response;

      if (!Array.isArray(result.remaining_banners)) {
        throw new Error("Delete failed: invalid response");
      }

      const { error } = await supabase
        .from("conferences")
        .update({ banner_urls: result.remaining_banners })
        .eq("conf_id", conferenceId);

      if (error) throw error;

      return { remaining_banners: result.remaining_banners };
    },
  });
};
