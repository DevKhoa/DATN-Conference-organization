import MySubscriptionsPage from "@/pages/main/auth/MySubscriptions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/subscriptions/me")({
  component: MySubscriptionsPage,
});
