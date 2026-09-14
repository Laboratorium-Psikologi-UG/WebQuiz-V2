import { z } from "zod";
import { publicProcedure, createTRPCRouter } from "../trpc";

export const feedbackSubmitInputSchema = z.object({
  kesan: z.string().min(1),
  pesan: z.string().min(1),
});

export const feedbackSubmitOutputSchema = z.object({
  ok: z.boolean(),
});

export const feedbackRouter = createTRPCRouter({
  submit: publicProcedure
    .input(feedbackSubmitInputSchema)
    .output(feedbackSubmitOutputSchema)
    .mutation(() => ({ ok: true })),
});
