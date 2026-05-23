import { skipToken, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";
import { SessionKeys } from "./keys";
import type { ExistingSession, Session, SessionPaperDetail } from "../../types";
import { Role } from "@/features/auth/types";
import useAuth from "@/features/auth/hooks/useAuth";
import { request } from "@/lib/axios";

export interface AgendaSession {
  session_id: number;
  session_name: string;
  start_time: string;
  end_time: string;
  room_location: string;
  conference_name: string;
  conf_id: number;
  chair_name: string;
  timezone?: string;
  session_type?: string;
}

export interface ChairInvitationItem {
  invitation_id: string;
  conf_id: number;
  conf_name?: string;
  session_id: number;
  session_name?: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  token: string;
  invited_by?: number;
  created_at?: string;
  responded_at?: string;
  invitee_user_id?: number;
  invite_link?: string;
}

export interface SessionChairInvitationsResponse {
  session_id: number;
  session_name?: string;
  conf_id: number;
  conf_name?: string;
  max_chairs_per_session: number;
  current_chairs: number;
  active_invitations: number;
  invitations: ChairInvitationItem[];
}

export const fetchSessionChairInvitations = async (sessionId: number) => {
  return request.get<SessionChairInvitationsResponse>(
    `/sessions/${sessionId}/chair-invitations`,
  );
};

export const fetchChairInvitationByToken = async (token: string) => {
  return request.get<ChairInvitationItem>(`/chair-invitations/${token}`);
};

export const useChairInvitationQuery = (token?: string) => {
  return useQuery({
    queryKey: [SessionKeys.ChairInvitations, token],
    queryFn: token ? () => fetchChairInvitationByToken(token) : skipToken,
    enabled: Boolean(token),
  });
};

export const fetchMyChairInvitations = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: invitationRows, error: invitationError } = await supabase
    .from("chair_invitations")
    .select(
      "invitation_id, conf_id, session_id, email, status, token, invited_by, created_at, responded_at",
    )
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false });

  if (invitationError) {
    throw invitationError;
  }

  if (!invitationRows || invitationRows.length === 0) {
    return [] as ChairInvitationItem[];
  }

  const sessionIds = Array.from(
    new Set(invitationRows.map((row) => row.session_id).filter(Boolean)),
  );
  const confIds = Array.from(
    new Set(invitationRows.map((row) => row.conf_id).filter(Boolean)),
  );

  const [
    { data: sessionRows, error: sessionError },
    { data: confRows, error: confError },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("session_id, session_name")
      .in("session_id", sessionIds),
    supabase
      .from("conferences")
      .select("conf_id, conf_name")
      .in("conf_id", confIds),
  ]);

  if (sessionError) {
    throw sessionError;
  }

  if (confError) {
    throw confError;
  }

  const sessionNameById = new Map<number, string | null>(
    (sessionRows || []).map((session) => [
      session.session_id,
      session.session_name,
    ]),
  );
  const confNameById = new Map<number, string | null>(
    (confRows || []).map((conference) => [
      conference.conf_id,
      conference.conf_name,
    ]),
  );

  return invitationRows.map(
    (invitation): ChairInvitationItem => ({
      invitation_id: invitation.invitation_id as string,
      conf_id: invitation.conf_id as number,
      conf_name: confNameById.get(invitation.conf_id as number) || undefined,
      session_id: invitation.session_id as number,
      session_name:
        sessionNameById.get(invitation.session_id as number) || undefined,
      email: invitation.email as string,
      status: invitation.status as
        | "PENDING"
        | "ACCEPTED"
        | "REJECTED"
        | "EXPIRED",
      token: invitation.token as string,
      invited_by: invitation.invited_by || undefined,
      created_at: invitation.created_at || undefined,
      responded_at: invitation.responded_at || undefined,
      invite_link: `/chair-invitations/${invitation.token}`,
    }),
  );
};

export const useMyChairInvitationsQuery = (email?: string) => {
  return useQuery({
    queryKey: [SessionKeys.ChairInvitations, "me", email],
    queryFn: email ? () => fetchMyChairInvitations(email) : skipToken,
    enabled: Boolean(email),
  });
};

export const useSessionChairInvitationsQuery = (
  sessionId?: number | null,
  enabled = true,
) => {
  return useQuery({
    queryKey: [SessionKeys.ChairInvitations, sessionId],
    queryFn: sessionId
      ? () => fetchSessionChairInvitations(sessionId)
      : skipToken,
    enabled: Boolean(sessionId) && enabled,
  });
};

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
      assigned_papers: ap,
      meet_link: s.meet_link,
      google_event_id: s.google_event_id,
      record_video_url: s.record_video_url,
      format_type: s.format_type || "in-person",
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
    queryKey: [SessionKeys.MyAgendaSessions, roles, session?.user?.id],
    queryFn: async () => {
      const isAdmin =
        roles.includes(Role.ADMIN) || roles.includes(Role.SECRETARIAT);
      const userId = session?.user?.user_metadata["user_id"] as
        | number
        | undefined;
      const sessionIdsAllowed = new Set<number>();

      if (!isAdmin) {
        if (!userId) {
          throw new Error("You are not logged in or your session has expired.");
        }

        // 1. ATTENDEE: Get sessions from completed transactions
        if (roles.includes(Role.ATTENDEE)) {
          const { data: registrations, error: regError } = await supabase
            .from("registrations")
            .select(`
              ticket_id,
              transactions!inner(status)
            `)
            .eq("user_id", userId)
            .eq("transactions.status", "COMPLETED");

          if (!regError && registrations && registrations.length > 0) {
            const ticketIds = registrations.map((r) => r.ticket_id);
            const { data: ticketSessions } = await supabase
              .from("ticket_session")
              .select("session_id")
              .in("ticket_id", ticketIds);

            if (ticketSessions) {
              ticketSessions.forEach((ts) =>
                sessionIdsAllowed.add(ts.session_id)
              );
            }
          }
        }

        // 2. CHAIR: Get sessions from session_chairs
        if (roles.includes(Role.CHAIR)) {
          const { data: chairSessions } = await supabase
            .from("session_chairs")
            .select("session_id")
            .eq("user_id", userId);

          if (chairSessions) {
            chairSessions.forEach((cs) => sessionIdsAllowed.add(cs.session_id));
          }
        }

        // 3. AUTHOR: Get sessions from session_papers + papers + paper_coauthors
        if (roles.includes(Role.AUTHOR)) {
          const { data: primaryPapers } = await supabase
            .from("papers")
            .select("paper_id")
            .eq("primary_author_id", userId);

          const { data: coauthorPapers } = await supabase
            .from("paper_coauthors")
            .select("paper_id")
            .eq("user_id", userId);

          const paperIds = Array.from(
            new Set([
              ...(primaryPapers?.map((p) => p.paper_id) || []),
              ...(coauthorPapers?.map((p) => p.paper_id) || []),
            ])
          );

          if (paperIds.length > 0) {
            const { data: sessionPapers } = await supabase
              .from("session_papers")
              .select("session_id")
              .in("paper_id", paperIds);

            if (sessionPapers) {
              sessionPapers.forEach((sp) =>
                sessionIdsAllowed.add(sp.session_id)
              );
            }
          }
        }

        // If not admin and no allowed sessions, return early
        if (sessionIdsAllowed.size === 0) {
          return [];
        }
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
      session_type,
      conferences!inner(conf_id, conf_name, timezone),
      session_chairs (
        user_id,
        profiles!session_chairs_user_id_fkey (
          full_name
        )
      )
    `,
        )
        .order("start_time", { ascending: true });

      if (!isAdmin && sessionIdsAllowed.size > 0) {
        query = query.in("session_id", Array.from(sessionIdsAllowed));
      }

      const { data: rawSessions, error: sessionError } = await query;
      if (sessionError) throw sessionError;

      const formattedSessions: AgendaSession[] = (rawSessions || []).map(
        (s: any) => {
          const chairNames = (s.session_chairs || [])
            .map((chair: any) => {
              const profile = Array.isArray(chair.profiles)
                ? (chair.profiles[0] ?? null)
                : (chair.profiles ?? null);

              return profile?.full_name;
            })
            .filter(Boolean);

          return {
            session_id: s.session_id,
            session_name: s.session_name || "Untitled session",
            start_time: s.start_time || "",
            end_time: s.end_time || "",
            room_location: s.room_location || "",
            conference_name: s.conferences?.conf_name || "Unknown",
            conf_id: s.conferences?.conf_id ?? 0,
            chair_name:
              chairNames.length > 0 ? chairNames.join(", ") : "Unassigned",
            timezone: s.conferences?.timezone || undefined,
            session_type: s.session_type || undefined,
          };
        },
      );

      return formattedSessions;
    },
  });
};
