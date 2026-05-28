import { createFileRoute } from "@tanstack/react-router";
import FAQPage from "@/pages/main/public/FAQ";

export const Route = createFileRoute("/faq")({
  component: FAQPage,
});
