import PaperQAPage from "@/pages/main/public/PaperQA";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/conferences_/$conferenceId/papers/$paperId/qa",
)({
  component: PaperQAPage,
});
