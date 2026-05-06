import { createFileRoute } from "@tanstack/react-router";

import InvitationDetailPage from "@/pages/main/auth/chair/InvitationDetail";

export const Route = createFileRoute("/(app)/chair-invitations/$token")({
  component: () => {
    const { token } = Route.useParams();

    return <InvitationDetailPage token={token} />;
  },
});
