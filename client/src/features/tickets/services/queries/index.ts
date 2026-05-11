import { skipToken, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { TicketsKeys } from "./keys";
import type { TicketConfig, SessionOption } from "../../types";

// Raw types from Supabase queries
interface RawTicketConfig {
  ticket_id: number;
  ticket_name: string;
  price: number | null;
  quantity_limit: number | null;
  sold_quantity: number | null;
  open_time: string;
  close_time: string;
  description: string | null;
  currency: string | null;
  is_active: boolean | null;
  ticket_type: string | null;
  ticket_session?: { session_id: number }[];
}

// Note: The original AttendancesManagement uses conference_id filter,
// but ticket_configs doesn't have conference_id in the schema.
// Keeping this query for tickets by session via ticket_session join
export const useTicketsBySessionQuery = (sessionId: number | null) => {
  return useQuery({
    queryKey: [TicketsKeys.TicketsBySession, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_configs")
        .select(
          `
          *,
          ticket_session!inner (session_id)
        `,
        )
        .eq("ticket_session.session_id", sessionId!);

      if (error) throw error;

      return (data || []).map((t: any) => ({
        ...t,
        open_time: t.open_time ? (t.open_time.endsWith('Z') ? t.open_time : t.open_time + 'Z') : t.open_time,
        close_time: t.close_time ? (t.close_time.endsWith('Z') ? t.close_time : t.close_time + 'Z') : t.close_time,
        currency: t.currency || "VND",
        is_active: t.is_active ?? true,
        sold_quantity: t.sold_quantity ?? 0,
        assigned_session_ids: [] as number[],
        ticket_type: (t.ticket_type as "in-person" | "virtual") || "virtual",
      })) as TicketConfig[];
    },
    enabled: !!sessionId,
  });
};

export const useSessionsForTicketsQuery = (conferenceId: number | null) => {
  return useQuery({
    queryKey: [TicketsKeys.SessionsByConference, conferenceId],
    queryFn: conferenceId
      ? async () => {
        const { data, error } = await supabase
          .from("sessions")
          .select("session_id, session_name, start_time")
          .eq("conf_id", conferenceId)
          .order("start_time", { ascending: true });

        if (error) throw error;

        return (data || []) as SessionOption[];
      }
      : skipToken,
    enabled: !!conferenceId,
  });
};

export const useTicketsByConferenceQuery = (conferenceId: number | null) => {
  return useQuery({
    queryKey: [TicketsKeys.TicketsByConference, conferenceId],
    queryFn: conferenceId
      ? async () => {
        // 1. Fetch all sessions for this conference
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("session_id")
          .eq("conf_id", conferenceId);

        if (sessionError) throw sessionError;

        const confSessionIds = (sessionData || []).map(
          (s: { session_id: number }) => s.session_id,
        );

        if (confSessionIds.length === 0) {
          return [] as TicketConfig[];
        }

        // 2. Find ticket IDs linked to this conference's sessions
        const { data: tsData, error: tsError } = await supabase
          .from("ticket_session")
          .select("ticket_id")
          .in("session_id", confSessionIds);

        if (tsError) throw tsError;

        const ticketIds = [
          ...new Set(
            (tsData || []).map((ts: { ticket_id: number }) => ts.ticket_id),
          ),
        ];

        if (ticketIds.length === 0) {
          return [] as TicketConfig[];
        }

        // 3. Fetch those ticket configs along with their session assignments
        const { data: ticketData, error: ticketError } = await supabase
          .from("ticket_configs")
          .select("*, ticket_session(session_id)")
          .in("ticket_id", ticketIds)
          .order("ticket_id", { ascending: true });

        if (ticketError) throw ticketError;

        return (ticketData || []).map((t: any) => ({
          ticket_id: t.ticket_id,
          ticket_name: t.ticket_name,
          price: t.price,
          quantity_limit: t.quantity_limit,
          sold_quantity: t.sold_quantity ?? 0,
          open_time: t.open_time ? (t.open_time.endsWith('Z') ? t.open_time : t.open_time + 'Z') : t.open_time,
          close_time: t.close_time ? (t.close_time.endsWith('Z') ? t.close_time : t.close_time + 'Z') : t.close_time,
          description: t.description,
          currency: t.currency || "VND",
          is_active: t.is_active ?? true,
          assigned_session_ids: (t.ticket_session || []).map(
            (ts) => ts.session_id,
          ),
          ticket_type: (t.ticket_type as "in-person" | "virtual") || "virtual",
        })) as TicketConfig[];
      }
      : skipToken,
    enabled: !!conferenceId,
  });
};
