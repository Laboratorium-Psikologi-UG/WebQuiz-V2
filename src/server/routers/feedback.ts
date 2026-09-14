import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../trpc";

export const feedbackSubmitInputSchema = z.object({
  kesan: z.string().min(1),
  pesan: z.string().min(1),
});

export const feedbackSubmitOutputSchema = z.object({
  ok: z.boolean(),
});

export const feedbackRouter = createTRPCRouter({
  submit: baseProcedure
    .input(feedbackSubmitInputSchema)
    .output(feedbackSubmitOutputSchema)
    .mutation(() => ({ ok: true })),
});
