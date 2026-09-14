import { z } from "zod";
import { privateProcedure, createTRPCRouter } from "../trpc";

export const feedbackSubmitInputSchema = z.object({
  kesan: z.string().min(1),
  pesan: z.string().min(1),
});

export const feedbackSubmitOutputSchema = z.object({
  ok: z.boolean(),
});

export const feedbackRouter = createTRPCRouter({
  submit: privateProcedure
    .input(feedbackSubmitInputSchema)
    .output(feedbackSubmitOutputSchema)
    .mutation(() => ({ ok: true })),
});
