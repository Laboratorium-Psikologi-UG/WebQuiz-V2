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
  // TODO: Stub - ignores input and unconditionally returns { ok: true }; implement real feedback persistence.
  submit: publicProcedure
    .input(feedbackSubmitInputSchema)
    .output(feedbackSubmitOutputSchema)
    .mutation(() => ({ ok: true })),
});
