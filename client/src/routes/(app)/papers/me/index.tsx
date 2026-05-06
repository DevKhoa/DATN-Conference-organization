import MyPapersPage from "@/pages/main/auth/MyPapers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/papers/me/")({
  component: MyPapersPage,
});
