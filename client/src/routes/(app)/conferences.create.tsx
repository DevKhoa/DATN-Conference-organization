import { Role } from "@/features/auth/types";
import CreateConferencePage from "@/pages/main/auth/CreateConference";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/conferences/create")({
  beforeLoad: ({ context }) => {
    const isAuthorized = context.auth?.checkRoles([
      Role.ADMIN,
      Role.SECRETARIAT,
    ]);

    if (!isAuthorized) {
      throw redirect({ to: "/403" });
    }
  },
  component: CreateConferencePage,
});
