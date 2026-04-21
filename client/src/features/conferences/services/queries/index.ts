import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ConferencesKeys } from "./keys";
import type { Conference, ConferenceDetail } from "../../types";
import { PaginatedParams } from "@/hooks/usePagination";

type ConferenceDetailSession = {
  session_id: number;
  session_name: string | null;
  start_time: string | null;
  end_time: string | null;
  room_location: string | null;
  is_ai_generated: boolean | null;
  format_type: string | null;
  meet_link?: string;
  is_meet_active?: boolean;
  record_video_url?: string;
  chair: {
    user_id: number;
    full_name: string | null;
    email: string | null;
    description: string | null;
    avatar_url: string | null;
  } | null;
  session_papers: Array<{
    presentation_order: number;
    start_time: string | null;
    end_time: string | null;
    paper: {
      paper_id: number;
      title: string | null;
      abstract: string | null;
      primary_author_id: number | null;
      author: {
        full_name: string | null;
      } | null;
    };
  }>;
};

export interface ConferenceDetailResult {
  conference: ConferenceDetail;
  sessions: ConferenceDetailSession[];
}

export interface ConferenceTicketOption {
  ticket_id: number;
  ticket_name: string;
  price: number | null;
  currency: string | null;
  description: string | null;
  is_active: boolean | null;
  quantity_limit: number | null;
  sold_quantity: number | null;
  sessions: Array<{
    session_id: number;
    session_name: string | null;
    start_time: string | null;
    room_location: string | null;
  }>;
}

const normalizeStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;

  const strings = value.filter(
    (item): item is string => typeof item === "string",
  );
  return strings.length > 0 ? strings : [];
};

export const useActiveConferencesQuery = () => {
  return useQuery({
    queryKey: [ConferencesKeys.ActiveConferences],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conferences")
        .select("conf_id, conf_name, start_date, location")
        .eq("is_active", true)
        .order("create_time", { ascending: false });

      if (error) throw error;

      return (data || []) as Conference[];
    },
  });
};

export const useConferencesCountQuery = () => {
  return useQuery({
    queryKey: [ConferencesKeys.ConferencesCount],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("conferences")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (error) throw error;

      return count || 0;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - count changes less frequently
  });
};

export const useConferenceDetailQuery = (conferenceId: number | null) => {
  return useQuery({
    queryKey: [ConferencesKeys.ConferenceDetail, conferenceId],
    queryFn: conferenceId
      ? async () => {
        const { data: confData, error: confError } = await supabase
          .from("conferences")
          .select("*")
          .eq("conf_id", conferenceId)
          .single();

        if (confError) throw confError;

        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select(
            `
              *,
              chair:profiles!chair_person_id ( user_id, full_name, email, description, avatar_url ),
              session_papers (
                presentation_order, start_time, end_time,
                paper:papers (
                  paper_id, title, abstract, primary_author_id,
                  author:profiles!primary_author_id ( full_name )
                )
              )
            `,
          )
          .eq("conf_id", conferenceId)
          .order("start_time", { ascending: true });

        if (sessionError) throw sessionError;

        const conference: ConferenceDetail = {
          ...confData,
          start_date: confData.start_date || "",
          end_date: confData.end_date || "",
          description: confData.description || "",
          status: confData.status || "",
          location: confData.location || "",
          is_active: confData.is_active ?? false,
          open_for_papers: confData.open_for_papers ?? false,
          banner_urls: normalizeStringArray(confData.banner_urls),
          keywords: normalizeStringArray(confData.keywords),
        };

        const sessions = (
          (sessionData || []) as unknown as ConferenceDetailSession[]
        ).map((raw: any) => ({
          ...raw,
          chair: Array.isArray(raw.chair)
            ? (raw.chair[0] ?? null)
            : raw.chair,
          session_papers: (raw.session_papers || []).sort(
            (a: any, b: any) => a.presentation_order - b.presentation_order,
          ),
        }));

        return { conference, sessions } as ConferenceDetailResult;
      }
      : undefined,
    enabled: !!conferenceId,
  });
};

export const useConferenceTicketsQuery = (
  conferenceId: number | null,
  enabled = true,
) => {
  return useQuery({
    queryKey: [ConferencesKeys.ConferenceTickets, conferenceId],
    queryFn: conferenceId
      ? async () => {
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("session_id, session_name, start_time, room_location")
          .eq("conf_id", conferenceId);

        if (sessionError) throw sessionError;

        const sessionRows = (sessionData || []) as Array<{
          session_id: number;
          session_name: string | null;
          start_time: string | null;
          room_location: string | null;
        }>;

        if (sessionRows.length === 0) {
          return [] as ConferenceTicketOption[];
        }

        const sessionMap: Record<number, (typeof sessionRows)[number]> = {};
        sessionRows.forEach((session) => {
          sessionMap[session.session_id] = session;
        });

        const { data: tsData, error: tsError } = await supabase
          .from("ticket_session")
          .select("ticket_id, session_id")
          .in(
            "session_id",
            sessionRows.map((session) => session.session_id),
          );

        if (tsError) throw tsError;

        const ticketSessions: Record<number, number[]> = {};
        (tsData || []).forEach(
          (row: { ticket_id: number; session_id: number }) => {
            if (!ticketSessions[row.ticket_id])
              ticketSessions[row.ticket_id] = [];
            ticketSessions[row.ticket_id].push(row.session_id);
          },
        );

        const ticketIds = Object.keys(ticketSessions).map(Number);
        if (ticketIds.length === 0) {
          return [] as ConferenceTicketOption[];
        }

        const { data: ticketData, error: ticketError } = await supabase
          .from("ticket_configs")
          .select(
            "ticket_id, ticket_name, price, currency, description, is_active, quantity_limit, sold_quantity",
          )
          .in("ticket_id", ticketIds)
          .eq("is_active", true);

        if (ticketError) throw ticketError;

        return (
          (ticketData || []) as Array<{
            ticket_id: number;
            ticket_name: string;
            price: number | null;
            currency: string | null;
            description: string | null;
            is_active: boolean | null;
            quantity_limit: number | null;
            sold_quantity: number | null;
          }>
        ).map((ticket) => ({
          ...ticket,
          sessions: (ticketSessions[ticket.ticket_id] || [])
            .map((sessionId) => sessionMap[sessionId])
            .filter(Boolean)
            .sort(
              (a, b) =>
                new Date(a.start_time || 0).getTime() -
                new Date(b.start_time || 0).getTime(),
            ),
        })) as ConferenceTicketOption[];
      }
      : undefined,
    enabled: !!conferenceId && enabled,
  });
};

export const usePaginatedConferencesQuery = ({
  page,
  pageSize,
  totalCount = 0,
}: PaginatedParams) => {
  return useQuery({
    queryKey: [
      ConferencesKeys.PaginatedConferences,
      page,
      pageSize,
      totalCount,
    ],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const totalPages = Math.ceil(totalCount / pageSize);

      // Get paginated data
      const { data, error } = await supabase
        .from("conferences")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: true });

      if (error) throw error;

      return {
        data,
        totalCount,
        totalPages,
        currentPage: page,
      };
    },
    placeholderData: (previousData) => previousData,
  });
};
