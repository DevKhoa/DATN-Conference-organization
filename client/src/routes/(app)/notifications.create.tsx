import CreatePushNotificationsPage from "@/pages/main/auth/CreatePushNotifications";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/notifications/create")({
  component: CreatePushNotificationsPage,
});
