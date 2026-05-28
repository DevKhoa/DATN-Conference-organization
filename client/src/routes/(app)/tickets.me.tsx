import MyTicketsPage from "@/pages/main/auth/MyTickets";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/tickets/me")({
  component: MyTicketsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    conferenceId: search.conferenceId ? Number(search.conferenceId) : undefined,
  }),
});
