import { skipToken, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { RegistrationsKeys } from "./keys";
import type { AttendeeRow } from "../../types";

export const useRegistrationsBySessionQuery = (sessionId: number | null) => {
  return useQuery({
    queryKey: [RegistrationsKeys.RegistrationsBySession, sessionId],
    queryFn: sessionId
      ? async () => {
          const { data, error } = await supabase
            .from("registrations")
            .select(
              `
          registration_id,
          user:user_id (user_id, full_name, email, organization),
          ticket_configs!inner (
            ticket_name,
            ticket_session!inner (session_id)
          ),
          attendences (
            at_id, is_checkin, checkin_time, session_id
          )
        `,
            )
            .eq("ticket_configs.ticket_session.session_id", sessionId);

          if (error) throw error;

          const processedData: AttendeeRow[] = (data as any[]).map((reg) => {
            const att =
              reg.attendences?.find((a: any) => a.session_id === sessionId) ||
              null;

            return {
              registration_id: reg.registration_id,
              user_id: reg.user?.user_id || 0,
              full_name: reg.user?.full_name || "N/A",
              email: reg.user?.email || "",
              organization: reg.user?.organization || "",
              ticket_name: reg.ticket_configs?.ticket_name || "Standard",
              is_checkin: att?.is_checkin ?? false,
              checkin_time: att?.checkin_time || null,
              at_id: att?.at_id ?? null,
            };
          });

          return processedData;
        }
      : skipToken,
    enabled: !!sessionId,
  });
};
