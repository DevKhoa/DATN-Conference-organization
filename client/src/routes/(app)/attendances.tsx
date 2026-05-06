import AttendancesManagementPage from "@/pages/main/auth/AttendancesManagement";
import { Role } from "@/features/auth/types";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/attendances")({
  component: AttendancesManagementPage,
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
    conferenceId: search.conferenceId ? Number(search.conferenceId) : undefined,
    sessionId: search.sessionId ? Number(search.sessionId) : undefined,
  }),
});
