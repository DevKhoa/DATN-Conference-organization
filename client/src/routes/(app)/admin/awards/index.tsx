import AdminManageAwardsPage from "@/pages/main/auth/admin/awards";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/admin/awards/")({
  component: AdminManageAwardsPage,
});
