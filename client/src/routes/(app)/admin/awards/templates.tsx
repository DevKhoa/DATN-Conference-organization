import AdminManageAwardTemplatesPage from "@/pages/main/auth/admin/award-templates";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/admin/awards/templates")({
  component: AdminManageAwardTemplatesPage,
});
