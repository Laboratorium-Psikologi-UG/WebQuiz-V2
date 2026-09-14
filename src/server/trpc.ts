import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";

/**
 * Initialise tRPC with:
 *  - Context typing (see ./context.ts)
 *  - superjson transformer (Date, Map, Set, BigInt survive the wire)
 *  - Zod-friendly error formatter so client-side `error.data.zodError` is useful
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

/** Public procedure — no authentication required. */
export const publicProcedure = t.procedure;

/**
 * Private procedure — requires an authenticated session.
 * Rejects unauthenticated callers with UNAUTHORIZED and narrows
 * `ctx.session` to non-null for downstream resolvers.
 */
export const privateProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Admin procedure — layered on `privateProcedure`, so unauthenticated callers
 * are still rejected with UNAUTHORIZED. Requires the account role to be
 * exactly "admin"; any other role is rejected with FORBIDDEN.
 */
export const adminProcedure = privateProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
