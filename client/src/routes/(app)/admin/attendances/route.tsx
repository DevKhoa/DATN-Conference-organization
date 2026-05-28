import AdminManageAttendancesPage from "@/pages/main/auth/admin/attendances";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/admin/attendances")({
  component: AdminManageAttendancesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    conferenceId: search.conferenceId ? Number(search.conferenceId) : undefined,
    sessionId: search.sessionId ? Number(search.sessionId) : undefined,
  }),
});
