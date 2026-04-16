import ForbiddenPage from "@/pages/global/Forbidden";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/403")({
  component: ForbiddenPage,
});
