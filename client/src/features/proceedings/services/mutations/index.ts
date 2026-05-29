import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { request } from "@/lib/axios";
import { supabase } from "@/lib/supabase";

const BASE_API_URL = import.meta.env.VITE_API_BASE_URL as string;

export interface SaveProceedingsConfigPayload {
  confId: number;
  proceedingsTitle: string;
  foreword: string;
  venueDetails: string;
  registrationHours: string;
  roomAssignments: string;
  internetInfo: string;
  galaInfo: string;
  keynotesJson: string;
}

export interface UploadProceedingsPdfCachePayload {
  confId: number;
  key: string;
  blob: Blob;
}

export interface RenderProceedingsPdfPayload {
  confId: number;
  payload: Record<string, any>;
}

export interface RenderProceedingsPdfResult {
  url?: string;
  blob?: Blob;
}

export const useSaveProceedingsConfigMutation = () => {
  return useMutation({
    mutationFn: async ({
      confId,
      proceedingsTitle,
      foreword,
      venueDetails,
      registrationHours,
      roomAssignments,
      internetInfo,
      galaInfo,
      keynotesJson,
      editorPagesJson,
      editorHfJson,
    }: SaveProceedingsConfigPayload) => {
      const upsertPayload: Record<string, any> = {
        conf_id: confId,
        proceedings_title: proceedingsTitle,
        foreword,
        venue_details: venueDetails,
        registration_hours: registrationHours,
        room_assignments: roomAssignments,
        internet_info: internetInfo,
        gala_info: galaInfo,
        keynotes_json: keynotesJson,
      };

      // Only write editor state when caller provides it (i.e. editor has been opened)
      if (editorPagesJson !== undefined) {
        upsertPayload.editor_pages_json = editorPagesJson;
      }
      if (editorHfJson !== undefined) {
        upsertPayload.editor_hf_json = editorHfJson;
      }

      const { error } = await supabase
        .from("proceedings_configs")
        .upsert(upsertPayload);

      if (error) {
        throw error;
      }

      return { success: true };
    },
  });
};

export const useUploadProceedingsPdfCacheMutation = () => {
  return useMutation({
    mutationFn: async ({
      confId,
      key,
      blob,
    }: UploadProceedingsPdfCachePayload): Promise<string | null> => {
      try {
        const form = new FormData();
        form.append("key", key);
        form.append(
          "file",
          new File([blob], `proceedings-${confId}.pdf`, {
            type: "application/pdf",
          }),
        );

        const resp = await request.post<{ url?: string }>(
          `/proceedings/${confId}/pdf-cache`,
          form as unknown as object,
        );

        return resp.url || null;
      } catch {
        return null;
      }
    },
  });
};

export const useRenderProceedingsPdfMutation = () => {
  return useMutation({
    mutationFn: async ({
      confId,
      payload,
    }: RenderProceedingsPdfPayload): Promise<RenderProceedingsPdfResult> => {
      const resp = await axios.post<Blob>(
        `${BASE_API_URL}/proceedings/${confId}/render`,
        payload,
        {
          responseType: "blob",
          validateStatus: () => true,
        },
      );

      if (resp.status < 200 || resp.status >= 300) {
        const msg = await resp.data.text();
        throw new Error(msg || "Failed to render PDF");
      }

      const contentType = resp.headers["content-type"] || "";
      if (contentType.includes("application/pdf")) {
        return { blob: resp.data };
      }

      const jsonText = await resp.data.text();
      const json = JSON.parse(jsonText) as { url?: string };
      return { url: json.url as string };
    },
  });
};
