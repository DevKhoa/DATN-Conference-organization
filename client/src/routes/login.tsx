import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

import LoginPage from "@/pages/main/public/Login";
import { STRING_EMPTY } from "@/constants";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(STRING_EMPTY),
  }),
  beforeLoad: ({ search, context }) => {
    if (context.auth?.session) {
      throw redirect({ to: search.redirect || "/" });
    }
  },
  component: LoginPage,
});
