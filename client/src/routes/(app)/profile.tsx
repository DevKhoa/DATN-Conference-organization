import ProfilePage from "@/pages/main/auth/Profile"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(app)/profile")({
  component: ProfilePage,
})

