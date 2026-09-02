import { createTRPCRouter } from "../trpc";
import { healthRouter } from "./health";

/**
 * Root tRPC router. Mount feature routers here — they are then
 * callable from the client as `trpc.<router>.<procedure>.useQuery()`.
 */
export const appRouter = createTRPCRouter({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
