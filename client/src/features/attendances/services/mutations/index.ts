import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { request } from "@/lib/axios";
import type { AttendanceUpsertPayload, CheckinPayload } from "../../types";
import { AttendancesKeys } from "../queries/keys";
import { RegistrationsKeys } from "@/features/registrations/services/queries/keys";

export const useToggleAttendanceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AttendanceUpsertPayload) => {
      const { data, error } = await supabase.from("attendences").upsert(
        {
          registration_id: payload.registration_id,
          session_id: payload.session_id,
          is_checkin: payload.is_checkin,
          checkin_time: payload.checkin_time,
        },
        {
          onConflict: "registration_id, session_id",
        },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [AttendancesKeys.AttendancesBySession, variables.session_id],
      });
      queryClient.invalidateQueries({
        queryKey: [
          RegistrationsKeys.RegistrationsBySession,
          variables.session_id,
        ],
      });
    },
  });
};

export const useCheckinMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckinPayload) => {
      return request.post("/checkin", {
        registration_id: payload.registration_id,
        session_ids: payload.session_ids,
      });
    },
    onSuccess: (_, variables) => {
      variables.session_ids.forEach((sessionId) => {
        queryClient.invalidateQueries({
          queryKey: [AttendancesKeys.AttendancesBySession, sessionId],
        });
        queryClient.invalidateQueries({
          queryKey: [RegistrationsKeys.RegistrationsBySession, sessionId],
        });
      });
    },
  });
};
