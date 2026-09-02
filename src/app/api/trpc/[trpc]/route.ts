import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/context";

/**
 * tRPC fetch adapter mounted under `/api/trpc`.
 * Handles both `GET` (queries) and `POST` (mutations) per request.
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ error, path }) {
      if (process.env.NODE_ENV === "development") {
        // Surface server-side errors in dev console; do not leak stack in prod.
        console.error(
          `tRPC error on ${path ?? "<no-path>"}: ${error.message}`,
        );
      }
    },
  });

export { handler as GET, handler as POST };
