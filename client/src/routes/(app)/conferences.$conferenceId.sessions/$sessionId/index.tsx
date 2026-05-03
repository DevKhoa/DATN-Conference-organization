import SessionManagerPage from "@/pages/main/auth/admin/sessions/SessionManager";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/(app)/conferences/$conferenceId/sessions/$sessionId/",
)({
  component: () => {
    const { conferenceId, sessionId } = Route.useParams();

    return (
      <SessionManagerPage
        conferenceId={conferenceId}
        initialSessionId={sessionId}
      />
    );
  },
});
