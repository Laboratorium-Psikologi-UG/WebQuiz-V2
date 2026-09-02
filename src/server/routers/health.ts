import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../trpc";

/**
 * Health-check / smoke-test router. Replaced or expanded as real
 * domain routers (quizzes, results, users, ...) come online.
 */
export const healthRouter = createTRPCRouter({
  ping: baseProcedure
    .input(z.object({ name: z.string().min(1).optional() }).optional())
    .query(({ input }) => ({
      ok: true,
      time: new Date().toISOString(),
      greeting: `hello ${input?.name ?? "world"}`,
    })),
});
