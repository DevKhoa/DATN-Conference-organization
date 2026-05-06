import SubscriptionsPage from "@/pages/main/public/Subscriptions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
});
