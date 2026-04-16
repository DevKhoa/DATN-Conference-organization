import SubmitPaperPage from "@/pages/main/auth/SubmitPaper";
import { Role } from "@/features/auth/types";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/papers/submit")({
  beforeLoad: ({ context }) => {
    const isAuthorized = context.auth?.checkRoles([
      Role.ADMIN,
      Role.SECRETARIAT,
      Role.AUTHOR,
    ]);

    if (!isAuthorized) {
      throw redirect({ to: "/403" });
    }
  },
  component: SubmitPaperPage,
});
