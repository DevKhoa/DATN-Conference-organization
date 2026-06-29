import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ConferencesKeys } from "./keys";
import type { Conference, ConferenceDetail } from "../../types";
import { PaginatedParams } from "@/hooks/usePagination";

export type ConferenceDetailChair = {
  user_id: number;
  full_name: string | null;
  email: string | null;
  description: string | null;
  avatar_url: string | null;
};

export type ConferenceDetailSession = {
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
  chair: ConferenceDetailChair | null;
  chairs?: ConferenceDetailChair[];
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
  open_time: string | null;
  close_time: string | null;
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

export interface ConferencesFilterParams {
  searchTerm?: string;
  statusFilter?: string;
  selectedKeyword?: string;
  formatType?: string;
  canViewDrafts?: boolean;
}

export const useConferencesCountQuery = (filters: ConferencesFilterParams = {}) => {
  const { searchTerm, statusFilter, selectedKeyword } = filters;

  return useQuery({
    queryKey: [
      ConferencesKeys.ConferencesCount,
      searchTerm,
      statusFilter,
      selectedKeyword,
      filters.formatType,
      filters.canViewDrafts,
    ],
    queryFn: async () => {
      // FIX: Used head: true for better performance (only returns the count, no row data)
      let query = supabase
        .from("conferences")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (searchTerm) {
        query = query.or(
          `conf_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
        );
      }

      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      } else if (!filters.canViewDrafts) {
        query = query.neq("status", "DRAFT");
      }

      if (filters.formatType && filters.formatType !== "ALL") {
        query = query.eq("format_type", filters.formatType);
      }

      // FIX: Server-side array filtering
      if (selectedKeyword) {
        query = query.contains("keywords", [selectedKeyword]);
      }

      const { count, error } = await query;
      if (error) throw error;

      return count || 0;
    },
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

        const sessionRows = (sessionData ||
          []) as unknown as Array<ConferenceDetailSession>;

        const sessionIds = sessionRows.map((session) => session.session_id);

        const { data: chairData, error: chairError } = await supabase
          .from("session_chairs")
          .select(
            `
              session_id,
              user_id,
              assigned_at,
              profiles!session_chairs_user_id_fkey (
                user_id, full_name, email, description, avatar_url
              )
            `,
          )
          .in("session_id", sessionIds)
          .order("assigned_at", { ascending: true });

        if (chairError) throw chairError;

        const chairMap = new Map<number, ConferenceDetailChair[]>();

        (chairData || []).forEach((row: any) => {
          const profile = Array.isArray(row.profiles)
            ? (row.profiles[0] ?? null)
            : (row.profiles ?? null);

          if (!profile) return;

          const chairs = chairMap.get(row.session_id) || [];
          chairs.push(profile);
          chairMap.set(row.session_id, chairs);
        });

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

        const sessions = sessionRows.map((raw) => {
          const chairs = chairMap.get(raw.session_id) || [];

          return {
            ...raw,
            chairs,
            chair: chairs[0] ?? null,
            session_papers: (raw.session_papers || []).sort(
              (a: any, b: any) => a.presentation_order - b.presentation_order,
            ),
          } as ConferenceDetailSession;
        });

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
            "ticket_id, ticket_name, price, currency, description, is_active, quantity_limit, sold_quantity, open_time, close_time",
          )
          .in("ticket_id", ticketIds)
          .eq("is_active", true);

        if (ticketError) throw ticketError;

        const now = Date.now();

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
            open_time: string | null;
            close_time: string | null;
          }>
        ).filter((ticket) => {
          if (!ticket.open_time || !ticket.close_time) return false;
          const close = new Date(ticket.close_time.endsWith('Z') ? ticket.close_time : ticket.close_time + 'Z').getTime();
          return now <= close;
        }).map((ticket) => ({
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
  filters = {},
  sortOrder = "RELEVANCE",
}: PaginatedParams & { filters?: ConferencesFilterParams; sortOrder?: string }) => {
  const { searchTerm, statusFilter, selectedKeyword, formatType, canViewDrafts } = filters;

  return useQuery({
    // FIX: Removed totalCount from queryKey to prevent unnecessary cache invalidation
    queryKey: [
      ConferencesKeys.PaginatedConferences,
      page,
      pageSize,
      searchTerm,
      statusFilter,
      selectedKeyword,
      formatType,
      canViewDrafts,
      sortOrder,
    ],
    queryFn: async () => {
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      let query = supabase
        .from("conferences")
        .select("*")
        .eq("is_active", true);
        
      // Apply base ordering on DB for non-RELEVANCE modes (RELEVANCE is client-side)
      if (sortOrder === "START_DATE_ASC") {
        query = query.order("start_date", { ascending: true });
      } else if (sortOrder === "START_DATE_DESC") {
        query = query.order("start_date", { ascending: false });
      } else if (sortOrder === "AZ") {
        query = query.order("conf_name", { ascending: true });
      } else {
        // RELEVANCE: fetch all matching rows for this page window, sort client-side
        query = query.order("start_date", { ascending: true });
      }

      if (searchTerm) {
        query = query.or(
          `conf_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
        );
      }

      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      } else if (!canViewDrafts) {
        query = query.neq("status", "DRAFT");
      }

      if (formatType && formatType !== "ALL") {
        query = query.eq("format_type", formatType);
      }

      // FIX: Server-side array filtering instead of client-side
      if (selectedKeyword) {
        query = query.contains("keywords", [selectedKeyword]);
      }

      let rows: any[];

      if (sortOrder === "RELEVANCE") {
        // Fetch ALL matching rows, sort client-side, then paginate
        const { data: allRows, error: allError } = await query;
        if (allError) throw allError;

        const now = Date.now();
        const scored = (allRows || []).map((c: any) => {
          const start = c.start_date ? new Date(c.start_date).getTime() : 0;
          const endRaw = c.end_date || c.start_date;
          const end = endRaw ? new Date(endRaw).getTime() + 86399999 : 0;
          const isOngoing = now >= start && now <= end;
          const isUpcoming = now < start;
          // group: 0 = ongoing, 1 = upcoming, 2 = past
          const group = isOngoing ? 0 : isUpcoming ? 1 : 2;
          // within upcoming: closer start_date = smaller diff = appears first
          // within ongoing:  closer end_date to now = smaller diff = appears first
          // within past:     most recently ended = largest end = appears first
          const tiebreak = isOngoing
            ? end   // sort ascending (soonest to end first)
            : isUpcoming
            ? start // sort ascending (nearest upcoming first)
            : -end; // sort ascending (most recently past first)
          return { c, group, tiebreak };
        });

        scored.sort((a, b) =>
          a.group !== b.group ? a.group - b.group : a.tiebreak - b.tiebreak,
        );

        const from = (page - 1) * pageSize;
        rows = scored.slice(from, from + pageSize).map((s) => s.c);
      } else {
        // Server-side pagination for deterministic sorts
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await query.range(from, to);
        if (error) throw error;
        rows = data || [];
      }

      // Fetch all keywords for the dropdown
      const { data: allKwData } = await supabase
        .from("conferences")
        .select("keywords")
        .eq("is_active", true);

      const allKeywords = Array.from(
        new Set(
          (allKwData || []).flatMap((c: any) =>
            Array.isArray(c.keywords)
              ? c.keywords.filter((k: any) => typeof k === "string")
              : [],
          ),
        ),
      ).sort() as string[];

      return {
        data: rows,
        totalCount,
        totalPages,
        currentPage: page,
        allKeywords,
      };
    },
    placeholderData: (previousData) => previousData,
  });
};