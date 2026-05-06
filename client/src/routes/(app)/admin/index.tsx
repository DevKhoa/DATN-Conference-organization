import AdminDashboardPage from "@/pages/main/auth/admin/dashboard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/admin/")({
  component: AdminDashboardPage,
});
