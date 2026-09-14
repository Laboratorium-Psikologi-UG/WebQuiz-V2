import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../trpc";

export const classListInputSchema = z.void();

export const classListItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const classListOutputSchema = z.array(classListItemSchema);

export const redeemInputSchema = z.object({
  code: z.string().length(8),
  npm: z.string().min(1),
  name: z.string().min(1),
  kelasId: z.number().int(),
  attendanceNo: z.number().int(),
});

export const redeemOutputSchema = z.object({
  redirect: z.literal("/exam"),
});

export const authRouter = createTRPCRouter({
  classList: baseProcedure
    .input(classListInputSchema)
    .output(classListOutputSchema)
    .query(() => [
      { id: 1, name: "Class A" },
      { id: 2, name: "Class B" },
    ]),
  redeem: baseProcedure
    .input(redeemInputSchema)
    .output(redeemOutputSchema)
    .mutation(() => ({ redirect: "/exam" })),
});
