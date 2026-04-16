import CheckinScannerPage from "@/pages/main/auth/CheckinScanner";
import { createFileRoute } from "@tanstack/react-router";

interface CheckinSearchParams {
  sessionIds?: string;
}

export const Route = createFileRoute("/(app)/checkin")({
  validateSearch: (search: Record<string, unknown>): CheckinSearchParams => ({
    sessionIds: search.sessionIds as string | undefined,
  }),
  component: CheckinScannerPage,
});
