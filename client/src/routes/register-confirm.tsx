import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import RegisterConfirmPage from "@/pages/main/public/RegisterConfirm";

export const Route = createFileRoute("/register-confirm")({
  validateSearch: z.object({
    token_hash: z.string().optional().catch(""),
    type: z.string().optional().catch("email"),
  }),
  component: RegisterConfirmPage,
});
