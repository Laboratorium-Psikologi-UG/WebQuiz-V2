import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../trpc";

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
  login: baseProcedure
    .input(loginInputSchema)
    .output(loginOutputSchema)
    .mutation(() => ({ ok: true })),
  logout: baseProcedure
    .input(z.void())
    .output(logoutOutputSchema)
    .mutation(() => ({ ok: true })),
  me: baseProcedure
    .input(z.void())
    .output(meOutputSchema)
    .query(() => {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }),
});
