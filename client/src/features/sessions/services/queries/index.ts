import { skipToken, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";
import { SessionKeys } from "./keys";
import type { ExistingSession, Session, SessionPaperDetail } from "../../types";
import { Role } from "@/features/auth/types";
import useAuth from "@/features/auth/hooks/useAuth";

export interface AgendaSession {
  session_id: number;
  session_name: string;
  start_time: string;
  end_time: string;
  room_location: string;
  conference_name: string;
  conf_id: number;
  chair_name: string;
}

// Standalone function for fetching existing sessions
export const fetchExistingSessions = async (
  conferenceId: number,
  sessionId: number,
): Promise<ExistingSession[]> => {
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select(
      `
      *,
      session_papers (
        paper_id, presentation_order, start_time, end_time
      )
    `,
    )
    .eq("conf_id", conferenceId)
    .eq("session_id", sessionId)
    .order("start_time", { ascending: true });

  if (sessionError) throw sessionError;

  if (!sessionData || sessionData.length === 0) {
    return [];
  }

  const formattedSessions: ExistingSession[] = sessionData.map((s: any) => {
    const st = s.start_time
      ? dayjs(s.start_time).format("YYYY-MM-DDTHH:mm")
      : "";
    const et = s.end_time ? dayjs(s.end_time).format("YYYY-MM-DDTHH:mm") : "";

    const ap: SessionPaperDetail[] = (s.session_papers || [])
      .sort((a: any, b: any) => a.presentation_order - b.presentation_order)
      .map((p: any) => ({
        paper_id: p.paper_id,
        start_time: p.start_time ? dayjs(p.start_time).format("HH:mm") : "",
        end_time: p.end_time ? dayjs(p.end_time).format("HH:mm") : "",
      }));

    return {
      temp_id: Math.random().toString(36).substr(2, 9),
      db_id: s.session_id,
      session_name: s.session_name,
      start_time: st,
      end_time: et,
      room_location: s.room_location,
      is_ai_generated: s.is_ai_generated,
      chair_person_id: s.chair_person_id,
      assigned_papers: ap,
      meet_link: s.meet_link,
      video_record_url: s.video_record_url,
    };
  });

  return formattedSessions;
};

// React Query hook version for existing sessions
export const useExistingSessionsQuery = (
  conferenceId: number,
  sessionId?: number | null,
) => {
  return useQuery({
    queryKey: [SessionKeys.ExistingSessions, conferenceId, sessionId],
    queryFn: () => fetchExistingSessions(conferenceId, sessionId!),
    enabled: !!conferenceId && !!sessionId,
  });
};

// Fetch sessions by conference ID
export const useSessionsByConferenceQuery = (conferenceId: number | null) => {
  return useQuery({
    queryKey: [SessionKeys.SessionsByConference, conferenceId],
    queryFn: conferenceId
      ? async () => {
          const { data, error } = await supabase
            .from("sessions")
            .select("session_id, session_name, room_location")
            .eq("conf_id", conferenceId);

          if (error) throw error;

          return (data || []) as Session[];
        }
      : skipToken,
    enabled: !!conferenceId,
  });
};

export const useMyAgendaSessionsQuery = () => {
  const { roles, session } = useAuth();

  return useQuery({
    queryKey: [SessionKeys.MyAgendaSessions],
    queryFn: async () => {
      const isAdmin =
        roles.includes(Role.ADMIN) || roles.includes(Role.SECRETARIAT);
      const userId = session?.user?.user_metadata["user_id"] as
        | number
        | undefined;
      let sessionIdsAllowed: number[] = [];

      if (!isAdmin) {
        if (!userId) {
          throw new Error("You are not logged in or your session has expired.");
        }

        const { data: registrations, error: regError } = await supabase
          .from("registrations")
          .select("ticket_id")
          .eq("user_id", userId);

        if (regError) throw regError;

        if (!registrations || registrations.length === 0) {
          return [];
        }

        const ticketIds = registrations.map((r) => r.ticket_id);

        const { data: ticketSessions, error: tsError } = await supabase
          .from("ticket_session")
          .select("session_id")
          .in("ticket_id", ticketIds);

        if (tsError) throw tsError;

        if (!ticketSessions || ticketSessions.length === 0) {
          return [];
        }

        sessionIdsAllowed = ticketSessions.map((ts) => ts.session_id);
      }

      let query = supabase
        .from("sessions")
        .select(
          `
      session_id,
      session_name,
      start_time,
      end_time,
      room_location,
      conferences!inner(conf_id, conf_name),
      profiles!chair_person_id(full_name)
    `,
        )
        .order("start_time", { ascending: true });

      if (!isAdmin && sessionIdsAllowed.length > 0) {
        query = query.in("session_id", sessionIdsAllowed);
      }

      const { data: rawSessions, error: sessionError } = await query;
      if (sessionError) throw sessionError;

      const formattedSessions: AgendaSession[] = (rawSessions || []).map(
        (s: any) => ({
          session_id: s.session_id,
          session_name: s.session_name,
          start_time: s.start_time,
          end_time: s.end_time,
          room_location: s.room_location,
          conference_name: s.conferences?.conf_name || "Unknown",
          conf_id: s.conferences?.conf_id ?? 0,
          chair_name: s.profiles?.full_name || "Unassigned",
        }),
      );

      return formattedSessions;
    },
  });
};
