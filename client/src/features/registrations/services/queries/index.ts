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
            .from("attendences")
            .select(
              `
              at_id, is_checkin, checkin_time, session_id, registration_id, user_id,
              registrations (
                 user:user_id (user_id, full_name, email, organization),
                 ticket_configs ( ticket_name )
              ),
              user:user_id (user_id, full_name, email, organization)
            `,
            )
            .eq("session_id", sessionId);

          if (error) throw error;

          const processedData: AttendeeRow[] = (data as any[]).map((att) => {
            const regUser = att.registrations?.user;
            const directUser = att.user;
            const finalUser = regUser || directUser;

            let ticketName = "Standard";
            if (att.registrations?.ticket_configs) {
              ticketName = Array.isArray(att.registrations.ticket_configs) 
                ? att.registrations.ticket_configs[0].ticket_name 
                : att.registrations.ticket_configs.ticket_name;
            } else if (directUser) {
              ticketName = "Chair / Author";
            }

            return {
              registration_id: att.registration_id || att.at_id, // fallback for UI key
              real_registration_id: att.registration_id,
              user_id: finalUser?.user_id || 0,
              full_name: finalUser?.full_name || "N/A",
              email: finalUser?.email || "",
              organization: finalUser?.organization || "",
              ticket_name: ticketName,
              is_checkin: att.is_checkin ?? false,
              checkin_time: att.checkin_time || null,
              at_id: att.at_id,
            } as any; // Type override since we added real_registration_id and used at_id as fallback
          });

          return processedData;
        }
      : skipToken,
    enabled: !!sessionId,
  });
};
