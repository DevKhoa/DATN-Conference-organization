import AssignSessionsPage from "@/pages/main/auth/AssignSessions";
import { Role } from "@/features/auth/types";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/sessions/assign")({
  component: AssignSessionsPage,
  beforeLoad: ({ context }) => {
    const isAuthorized = context.auth?.checkRoles([
      Role.ADMIN,
      Role.SECRETARIAT,
    ]);

    if (!isAuthorized) {
      throw redirect({ to: "/403" });
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    conferenceId: Number(search.conferenceId ?? 0),
    sessionId: search.sessionId ? Number(search.sessionId) : undefined,
  }),
});
