import CreatePushNotificationsPage from "@/pages/main/auth/CreatePushNotifications";
import { createFileRoute } from "@tanstack/react-router";

type NotificationSearchParams = {
  conferenceId?: number;
  conferenceName?: string;
};

export const Route = createFileRoute("/(app)/notifications/create")({
  validateSearch: (
    search: Record<string, unknown>,
  ): NotificationSearchParams => {
    return {
      conferenceId: search.conferenceId
        ? Number(search.conferenceId)
        : undefined,
      conferenceName: search.conferenceName as string | undefined,
    };
  },
  component: () => {
    const { conferenceId, conferenceName } = Route.useSearch();
    return (
      <CreatePushNotificationsPage
        conferenceId={conferenceId}
        conferenceName={conferenceName}
      />
    );
  },
});
