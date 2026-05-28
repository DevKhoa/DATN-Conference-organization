import AdminManageTicketsPage from "@/pages/main/auth/admin/tickets";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/admin/tickets")({
  component: AdminManageTicketsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    conferenceId: Number(search.conferenceId ?? 0),
  }),
});
