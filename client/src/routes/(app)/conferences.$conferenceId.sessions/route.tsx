import { Role } from "@/features/auth/types";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/conferences/$conferenceId/sessions")({
  beforeLoad: ({ context }) => {
    const isAuthorized = context.auth?.checkRoles([
      Role.ADMIN,
      Role.SECRETARIAT,
    ]);

    if (!isAuthorized) {
      throw redirect({ to: "/403" });
    }
  },
  component: () => <Outlet />,
});
