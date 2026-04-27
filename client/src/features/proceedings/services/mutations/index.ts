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
  isbn?: string;
  publisher?: string;
  templateName?: string;
  pdfUrl?: string;
  breakInfo?: string;
  roomMapUrl?: string;
  committeeSelection?: any[];
  sponsorLogos?: any[];
  organizerLogos?: any[];
  keynotes?: any[];
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
      isbn,
      publisher,
      templateName,
      pdfUrl,
      breakInfo,
      roomMapUrl,
      committeeSelection,
      sponsorLogos,
      organizerLogos,
      keynotes,
    }: SaveProceedingsConfigPayload) => {
      const { error } = await supabase.from("proceedings_configs").upsert({
        conf_id: confId,
        proceedings_title: proceedingsTitle,
        foreword,
        venue_details: venueDetails,
        registration_hours: registrationHours,
        room_assignments: roomAssignments,
        internet_info: internetInfo,
        gala_info: galaInfo,
        isbn,
        publisher,
        template_name: templateName,
        pdf_url: pdfUrl,
        break_info: breakInfo,
        room_map_url: roomMapUrl,
        committee_selection: committeeSelection,
        sponsor_logos: sponsorLogos,
        organizer_logos: organizerLogos,
        keynotes_json: keynotes,
      });

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
