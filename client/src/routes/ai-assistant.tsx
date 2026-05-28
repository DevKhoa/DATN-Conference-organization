import AiAssistantPage from "@/pages/main/public/AiAssistant"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/ai-assistant")({
  component: AiAssistantPage,
})

