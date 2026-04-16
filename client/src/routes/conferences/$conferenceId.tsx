import ConferenceDetailPage from "@/pages/main/public/ConferenceDetail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/conferences/$conferenceId")({
  component: ConferenceDetailPage,
});
