import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import type { AuthState } from "@/features/auth/contexts/auth.context";
import LoadingScreen from "@/components/LoadingScreen";
import NotFoundPage from "@/pages/global/NotFound";

interface AppRouterContext {
  auth: AuthState;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootComponent,
  pendingComponent: LoadingScreen,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  return <Outlet />;
}
