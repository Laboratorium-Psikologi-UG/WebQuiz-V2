import { initTRPC } from "@trpc/server";
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
export const baseProcedure = t.procedure;
