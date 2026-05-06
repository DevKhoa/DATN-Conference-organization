import MyAgendaPage from "@/pages/main/auth/Agenda";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/agenda/me")({
  component: MyAgendaPage,
});
