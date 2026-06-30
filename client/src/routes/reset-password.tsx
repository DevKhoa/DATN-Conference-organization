import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

import ResetPasswordPage from "@/pages/main/public/ResetPassword";
import { STRING_EMPTY } from "@/constants";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({
    token_hash: z.string().optional().catch(STRING_EMPTY),
  }),
  beforeLoad: ({ context }) => {
    // We don't strictly require session here because the user is authenticated via the URL fragment during password reset, but typically we allow this page to be visited.
  },
  component: ResetPasswordPage,
});
