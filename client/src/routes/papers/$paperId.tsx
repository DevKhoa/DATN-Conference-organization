import PaperDetailPage from "@/pages/main/public/PaperDetail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/papers/$paperId")({
  component: PaperDetailPage,
});
