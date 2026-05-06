import ProceedingsManagementPage from "@/pages/main/auth/ProceedingsManagement";
import { Role } from "@/features/auth/types";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/proceedings")({
  beforeLoad: ({ context }) => {
    const isAuthorized = context.auth?.checkRoles([
      Role.ADMIN,
      Role.SECRETARIAT,
    ]);

    if (!isAuthorized) {
      throw redirect({ to: "/403" });
    }
  },
  component: ProceedingsManagementPage,
});
