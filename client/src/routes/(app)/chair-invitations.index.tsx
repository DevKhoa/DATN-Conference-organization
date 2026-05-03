import { Role } from "@/features/auth/types";
import InvitationsManagerPage from "@/pages/main/auth/chair/Invitations";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/chair-invitations/")({
  beforeLoad: ({ context }) => {
    const isAuthorized = context.auth?.checkRoles([Role.CHAIR]);

    if (!isAuthorized) {
      throw redirect({ to: "/403" });
    }
  },
  component: InvitationsManagerPage,
});
