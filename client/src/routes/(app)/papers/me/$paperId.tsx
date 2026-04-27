import MyPaperDetailPage from "@/pages/main/auth/MyPaperDetail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/papers/me/$paperId")({
  component: MyPaperDetailPage,
});
