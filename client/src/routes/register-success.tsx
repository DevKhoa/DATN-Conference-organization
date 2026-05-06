import { createFileRoute } from "@tanstack/react-router";
import RegisterSuccessPage from "@/pages/main/public/RegisterSuccess";

export const Route = createFileRoute("/register-success")({
  component: RegisterSuccessPage,
});
