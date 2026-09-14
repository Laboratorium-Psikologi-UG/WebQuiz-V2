import { z } from "zod";
import { CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/auth";
import {
  consumeUsernameAttempt,
  isIpLocked,
  normalizeUsername,
  recordIpFailure,
  resetUsername,
} from "@/lib/loginThrottle";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "../trpc";

type ThrottleOperation = "probe" | "consume" | "record" | "reset";

/**
 * Emits a fixed operational message for a throttling/storage failure. The
 * username, password, and client IP are deliberately excluded so login
 * identifiers never reach the logs.
 */
function logThrottleFailure(
  operation: ThrottleOperation,
  error: unknown,
): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(
    `Admin login throttle ${operation} failed (${errorName}); failing closed.`,
  );
}

export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const loginOutputSchema = z.object({
  ok: z.boolean(),
});

export const logoutOutputSchema = z.object({
  ok: z.boolean(),
});

export const meOutputSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  role: z.string(),
});

export const adminAuthRouter = createTRPCRouter({
  login: publicProcedure
    .input(loginInputSchema)
    .output(loginOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.clientIp !== null) {
        try {
          const ipDecision = await isIpLocked(ctx.clientIp);
          if (!ipDecision.allowed) {
            return { ok: false };
          }
        } catch (error) {
          logThrottleFailure("probe", error);
          return { ok: false };
        }
      }

      let normalizedUsername: string;
      try {
        normalizedUsername = normalizeUsername(input.username);
        const decision = await consumeUsernameAttempt(normalizedUsername);
        if (!decision.allowed) {
          return { ok: false };
        }
      } catch (error) {
        logThrottleFailure("consume", error);
        return { ok: false };
      }

      try {
        await signIn("credentials", {
          username: input.username,
          password: input.password,
          redirect: false,
        });
      } catch (error) {
        if (error instanceof CredentialsSignin) {
          if (ctx.clientIp !== null) {
            try {
              await recordIpFailure(ctx.clientIp);
            } catch (recordError) {
              logThrottleFailure("record", recordError);
            }
          }
          return { ok: false };
        }
        throw error;
      }

      try {
        await resetUsername(normalizedUsername);
      } catch (error) {
        logThrottleFailure("reset", error);
        return { ok: false };
      }

      return { ok: true };
    }),
  logout: publicProcedure
    .input(z.void())
    .output(logoutOutputSchema)
    .mutation(async () => {
      await signOut({ redirect: false });
      return { ok: true };
    }),
  me: privateProcedure
    .input(z.void())
    .output(meOutputSchema)
    .query(({ ctx }) => ctx.session.user),
});
