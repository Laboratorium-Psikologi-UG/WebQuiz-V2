import { z } from "zod";
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
    .mutation(() => ({ ok: true })),
  logout: publicProcedure
    .input(z.void())
    .output(logoutOutputSchema)
    .mutation(() => ({ ok: true })),
  me: privateProcedure
    .input(z.void())
    .output(meOutputSchema)
    .query(({ ctx }) => ctx.session.user),
});
