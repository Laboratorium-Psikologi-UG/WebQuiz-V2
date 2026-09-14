import { z } from "zod";
import { CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/auth";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "../trpc";

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
    .mutation(async ({ input }) => {
      try {
        await signIn("credentials", {
          username: input.username,
          password: input.password,
          redirect: false,
        });
      } catch (error) {
        if (error instanceof CredentialsSignin) {
          return { ok: false };
        }
        throw error;
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
