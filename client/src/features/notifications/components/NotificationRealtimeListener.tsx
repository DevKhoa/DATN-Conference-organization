import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import useAuth from "@/features/auth/hooks/useAuth";
import { NotificationsKeys } from "@/features/notifications/services/queries/keys";
import { shouldHideNotification } from "@/features/notifications/utils/notificationContent";
import { supabase } from "@/lib/supabase";

const NotificationRealtimeListener = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user?.user_metadata["user_id"] as number | undefined;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const title = (
            payload.new as { dynamic_title?: string | null } | null
          )?.dynamic_title;
          const content = (
            payload.new as { dynamic_content?: string | null } | null
          )?.dynamic_content;

          if (shouldHideNotification({ title, content })) {
            return;
          }

          queryClient.invalidateQueries({
            queryKey: [NotificationsKeys.UserNotifications],
          });
          toast.success("You've just received a new notification.");
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const title = (
            payload.new as { dynamic_title?: string | null } | null
          )?.dynamic_title;
          const content = (
            payload.new as { dynamic_content?: string | null } | null
          )?.dynamic_content;

          if (shouldHideNotification({ title, content })) {
            return;
          }

          queryClient.invalidateQueries({
            queryKey: [NotificationsKeys.UserNotifications],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return null;
};

export default NotificationRealtimeListener;
