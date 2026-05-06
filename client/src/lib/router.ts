import { createRouter } from "@tanstack/react-router";
import "@tanstack/react-query";

// Import the generated route tree
import { routeTree } from "@/routeTree.gen";

import type { Response } from "@/types";
import type { AxiosError } from "axios";

const publicPath = import.meta.env.VITE_PUBLIC_PATH as string;

// Create a new router instance
export const router = createRouter({
  basepath: publicPath,
  routeTree,
  context: {
    auth: undefined!,
  },
  defaultPreload: "intent",
  defaultHashScrollIntoView: {
    behavior: "smooth",
    block: "start",
  },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Register the query instance for type safety
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AxiosError<Response<unknown>>;
  }
}
