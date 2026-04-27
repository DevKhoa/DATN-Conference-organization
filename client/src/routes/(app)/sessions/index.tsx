import SessionManagerPage from "@/pages/main/auth/admin/sessions/SessionManager";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/sessions/")({
  component: SessionManagerPage,
});
