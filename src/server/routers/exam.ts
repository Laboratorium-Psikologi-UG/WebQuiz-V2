import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../trpc";

export const questionTypeSchema = z.enum(["mc", "fill"]);

export const mcOptionSchema = z.object({
  id: z.number().int(),
  text: z.string(),
});

export const questionSchema = z.object({
  id: z.number().int(),
  prompt: z.string(),
  type: questionTypeSchema,
  options: z.array(mcOptionSchema).optional(),
  stimulusUrls: z.array(z.string()),
});

export const mePackSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  durationMinutes: z.number().int(),
});

export const meOutputSchema = z.object({
  pack: mePackSchema,
  attempt: z
    .object({
      id: z.number().int(),
      startedAt: z.string(),
    })
    .optional(),
  remainingSeconds: z.number().int().optional(),
});

export const startOutputSchema = z.object({
  attemptId: z.number().int(),
  questions: z.array(questionSchema),
});

export const saveAnswerInputSchema = z
  .object({
    questionId: z.number().int(),
    optionId: z.number().int().optional(),
    text: z.string().optional(),
    isFlagged: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.optionId !== undefined ||
      value.text !== undefined ||
      value.isFlagged !== undefined,
    "Provide optionId, text, or isFlagged",
  );

export const saveAnswerOutputSchema = z.object({
  ok: z.boolean(),
});

export const heartbeatOutputSchema = z.object({
  ok: z.boolean(),
});

export const resultSchema = z.object({
  score: z.number().int(),
  passed: z.boolean(),
  gradedAt: z.string().nullable(),
});

export const submitOutputSchema = z.object({
  result: resultSchema,
});

export const resultOutputSchema = z.object({
  result: resultSchema,
  answers: z
    .array(
      z.object({
        questionId: z.number().int(),
        optionId: z.number().int().nullable(),
        text: z.string().nullable(),
        isFlagged: z.boolean(),
      }),
    )
    .optional(),
});

export const examRouter = createTRPCRouter({
  me: baseProcedure
    .input(z.void())
    .output(meOutputSchema)
    .query(() => ({
      pack: { id: 1, title: "Placeholder Pack", durationMinutes: 60 },
      attempt: undefined,
    })),
  start: baseProcedure
    .input(z.void())
    .output(startOutputSchema)
    .mutation(() => {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }),
  saveAnswer: baseProcedure
    .input(saveAnswerInputSchema)
    .output(saveAnswerOutputSchema)
    .mutation(() => ({ ok: true })),
  heartbeat: baseProcedure
    .input(z.void())
    .output(heartbeatOutputSchema)
    .mutation(() => ({ ok: true })),
  submit: baseProcedure
    .input(z.void())
    .output(submitOutputSchema)
    .mutation(() => {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }),
  result: baseProcedure
    .input(z.void())
    .output(resultOutputSchema)
    .query(() => {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }),
});
