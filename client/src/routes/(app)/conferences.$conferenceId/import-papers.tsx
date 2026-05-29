import { createFileRoute } from '@tanstack/react-router'
import { ImportPapers } from '@/pages/main/auth/ImportPapers'

export const Route = createFileRoute(
  '/(app)/conferences/$conferenceId/import-papers',
)({
  component: ImportPapers,
})
