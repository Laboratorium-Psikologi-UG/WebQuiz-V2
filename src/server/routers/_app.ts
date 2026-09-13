import { createTRPCRouter } from "../trpc";
import { adminRouter } from "./admin";
import { adminAuthRouter } from "./adminAuth";
import { authRouter } from "./auth";
import { examRouter } from "./exam";
import { feedbackRouter } from "./feedback";
import { healthRouter } from "./health";
import { monitoringRouter } from "./monitoring";

/**
 * Root tRPC router. Mount feature routers here — they are then
 * callable from the client as `trpc.<router>.<procedure>.useQuery()`.
 */
export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  adminAuth: adminAuthRouter,
  exam: examRouter,
  feedback: feedbackRouter,
  monitoring: monitoringRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
