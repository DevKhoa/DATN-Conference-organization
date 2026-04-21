import { useQuery } from "@tanstack/react-query";
import { NotificationsKeys } from "./keys";
import useAuth from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

type NotificationMeta = Pick<
  Tables<"notifications">,
  | "notification_id"
  | "title"
  | "content"
  | "type"
  | "created_at"
  | "conf_id"
  | "attachments"
>;

export type UserNotification = Tables<"user_notifications"> & {
  notifications: NotificationMeta | null;
};

export interface NotificationTemplate {
  template_id: number;
  template_name: string;
  title_template: string;
  content_template: string;
  conf_id: number | null;
}

export interface NotificationConference {
  conf_id: number;
  conf_name: string;
  status: string;
}

export interface NotificationUserResult {
  user_id: number;
  full_name: string;
  email: string;
}

export const useUserNotifications = () => {
  const { session } = useAuth();
  const userId = session?.user?.user_metadata["user_id"] as number | undefined;

  return useQuery<UserNotification[]>({
    queryKey: [NotificationsKeys.UserNotifications, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_notifications")
        .select(
          `id, notification_id, is_read, read_at, dynamic_title, dynamic_content,
               notifications ( notification_id, title, content, type, created_at, conf_id, attachments )`,
        )
        .eq("user_id", userId)
        .order("id", { ascending: false })
        .limit(30);

      if (error) throw error;

      const rows =
        (data as Array<
          Tables<"user_notifications"> & {
            notifications: NotificationMeta | NotificationMeta[] | null;
          }
        > | null) ?? [];

      return rows.map((row) => ({
        ...row,
        notifications: Array.isArray(row.notifications)
          ? (row.notifications[0] ?? null)
          : (row.notifications ?? null),
      }));
    },
  });
};

export const useNotificationTemplatesQuery = () => {
  return useQuery<NotificationTemplate[]>({
    queryKey: [NotificationsKeys.NotificationTemplates],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("template_name");

      if (error) throw error;
      return (data || []) as NotificationTemplate[];
    },
  });
};

export const useNotificationConferencesQuery = () => {
  return useQuery<NotificationConference[]>({
    queryKey: [NotificationsKeys.NotificationConferences],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conferences")
        .select("conf_id, conf_name, status")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return (data || []) as NotificationConference[];
    },
  });
};

export const useNotificationConferenceUsersPoolQuery = (
  confScope: "all" | "specific",
  selectedConfIds: number[],
) => {
  return useQuery<number[]>({
    queryKey: [
      NotificationsKeys.NotificationConferenceUsersPool,
      confScope,
      selectedConfIds,
    ],
    enabled: confScope === "specific" && selectedConfIds.length > 0,
    queryFn: async () => {
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("session_id, chair_person_id")
        .in("conf_id", selectedConfIds);

      const sessions = sessionsData || [];
      const sessionIds = sessions
        .map((session: any) => session.session_id)
        .filter(Boolean);
      const chairIds = sessions
        .map((session: any) => session.chair_person_id)
        .filter(Boolean);

      let attendeeIds: number[] = [];
      if (sessionIds.length > 0) {
        const { data: ticketSessionData } = await supabase
          .from("ticket_session")
          .select("ticket_id")
          .in("session_id", sessionIds);

        const ticketIds = [
          ...new Set(
            (ticketSessionData || [])
              .map((ticket: any) => ticket.ticket_id)
              .filter(Boolean),
          ),
        ];

        if (ticketIds.length > 0) {
          const { data: registrationsData } = await supabase
            .from("registrations")
            .select("user_id")
            .in("ticket_id", ticketIds);

          attendeeIds = (registrationsData || [])
            .map((registration: any) => registration.user_id)
            .filter(Boolean);
        }
      }

      return [...new Set([...chairIds, ...attendeeIds])];
    },
  });
};

export const useNotificationUserSearchQuery = ({
  keyword,
  confScope,
  selectedConfIds,
  confUsersPool,
  excludedUserIds,
}: {
  keyword: string;
  confScope: "all" | "specific";
  selectedConfIds: number[];
  confUsersPool: number[];
  excludedUserIds: number[];
}) => {
  const canSearchInScope =
    confScope === "all" ||
    (confScope === "specific" && selectedConfIds.length > 0);

  return useQuery<NotificationUserResult[]>({
    queryKey: [
      NotificationsKeys.NotificationUserSearch,
      keyword,
      confScope,
      selectedConfIds,
      confUsersPool,
      excludedUserIds,
    ],
    enabled: canSearchInScope && keyword.trim().length >= 2,
    queryFn: async () => {
      let query = supabase
        .from("users")
        .select("user_id, full_name, email")
        .or(`full_name.ilike.%${keyword}%,email.ilike.%${keyword}%`)
        .limit(10);

      if (confScope === "specific") {
        if (confUsersPool.length === 0) return [];
        query = (query as any).in("user_id", confUsersPool);
      }

      const { data, error } = await query;
      if (error) throw error;

      const excluded = new Set(excludedUserIds);
      return ((data || []) as NotificationUserResult[]).filter(
        (user) => !excluded.has(user.user_id),
      );
    },
  });
};
