import ConferenceDetailPage from "@/pages/main/public/conferences/ConferenceDetail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/conferences/$conferenceId")({
  component: ConferenceDetailPage,
});
