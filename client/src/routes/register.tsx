import { createFileRoute } from "@tanstack/react-router";
import RegisterPage from "@/pages/main/public/Register";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});
