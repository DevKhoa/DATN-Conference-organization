import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import "./index.css";
import useAuth from "./features/auth/hooks/useAuth";
import { router } from "./lib/router";
import { AuthProvider } from "./features/auth/contexts/auth.context";
import { Toaster } from "sonner";
import LoadingScreen from "./components/LoadingScreen";

const queryClient = new QueryClient();

const InnerApp = () => {
  const auth = useAuth();

  return (
    <LoadingScreen isLoading={auth?.isLoading ?? true} minDisplayTime={800}>
      <RouterProvider router={router} context={{ auth }} />
    </LoadingScreen>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
