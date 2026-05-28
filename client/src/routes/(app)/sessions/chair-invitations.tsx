import ChairInvitationsPage from "@/pages/main/auth/admin/sessions/ChairInvitations";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/sessions/chair-invitations")({
  component: ChairInvitationsPage,
});
