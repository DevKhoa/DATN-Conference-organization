import PapersPage from "@/pages/main/public/Papers"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/papers/")({
  component: PapersPage,
})

