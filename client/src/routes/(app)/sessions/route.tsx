import { Role } from "@/features/auth/types";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/sessions")({
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
  component: () => <Outlet />,
});
