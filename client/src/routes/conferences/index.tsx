import ConferencesPage from "@/pages/main/public/conferences/Conferences"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/conferences/")({
  component: ConferencesPage,
})

