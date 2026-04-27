import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { request } from "@/lib/axios";
import type {
  ImportScholarPayload,
  UpdateBasicInfoPayload,
  UpdateDescriptionPayload,
  UploadAvatarPayload,
  UploadAvatarResponse,
  UploadCVPayload,
} from "./types";

export const useUpdateBasicInfoMutation = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      fullName,
      organization,
    }: UpdateBasicInfoPayload) => {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          organization,
        })
        .eq("user_id", userId);

      return { full_name: fullName, organization };
    },
  });
};

export const useUploadAvatarMutation = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      file,
    }: UploadAvatarPayload): Promise<UploadAvatarResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await request.post<UploadAvatarResponse>(
        `/users/${userId}/upload-avatar`,
        formData,
      );

      return response;
    },
  });
};

export const useUpdateDescriptionMutation = () => {
  return useMutation({
    mutationFn: async ({ userId, description }: UpdateDescriptionPayload) => {
      await request.post(`/users/${userId}/description`, {
        description,
      });

      return { description };
    },
  });
};

export const useUploadCVMutation = () => {
  return useMutation({
    mutationFn: async ({ userId, file }: UploadCVPayload) => {
      const formData = new FormData();
      formData.append("file", file);

      await request.post(`/users/${userId}/upload-cv`, formData);
      return { success: true };
    },
  });
};

export const useImportScholarMutation = () => {
  return useMutation({
    mutationFn: async ({ userId, scholarUrl }: ImportScholarPayload) => {
      await request.post(`/users/${userId}/import-scholar`, {
        scholar_url: scholarUrl,
      });

      return { success: true };
    },
  });
};
