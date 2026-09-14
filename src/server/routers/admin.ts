import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../trpc";

const idInput = z.object({ id: z.number().int() });

const packSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  durationMinutes: z.number().int(),
  passMarkPct: z.number().int(),
  status: z.enum(["draft", "published"]),
  createdBy: z.string(),
});

const questionSchema = z.object({
  id: z.number().int(),
  packId: z.number().int(),
  prompt: z.string(),
  position: z.number().int(),
  options: z.array(
    z.object({ id: z.number().int(), text: z.string(), isCorrect: z.boolean() }),
  ),
  acceptedAnswers: z.array(z.string()),
  stimulusUrls: z.array(z.string()),
});

const tokenSchema = z.object({
  id: z.number().int(),
  code: z.string().length(8),
  packId: z.number().int(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdBy: z.string(),
  redemptionCount: z.number().int(),
});

const tokenListOutput = z.array(tokenSchema);

const userSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  role: z.string(),
  status: z.string(),
});

const userListOutput = z.array(userSchema);

const kelasSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const kelasListOutput = z.array(kelasSchema);

const attemptReportRowSchema = z.object({
  npm: z.string(),
  name: z.string(),
  kelas: z.string(),
  score: z.number().int(),
  passed: z.boolean(),
});

const attemptsOutput = z.array(attemptReportRowSchema);

const adminMonitoringRowSchema = z.object({
  npm: z.string(),
  name: z.string(),
  kelas: z.string(),
  lastActivityAt: z.string(),
});

const packIdInput = z.object({ packId: z.number().int() });
const packPatchInput = z.object({
  id: z.number().int(),
  title: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive().optional(),
  passMarkPct: z.number().int().min(0).max(100).optional(),
});

const questionOptionsInput = z.array(
  z.object({ text: z.string().min(1), isCorrect: z.boolean() }),
);

const questionPatchInput = z.object({
  id: z.number().int(),
  prompt: z.string().min(1).optional(),
  options: questionOptionsInput.optional(),
  acceptedAnswers: z.array(z.string()).optional(),
});

export const adminRouter = createTRPCRouter({
  pack: createTRPCRouter({
    // TODO: implement pack.create - returns hardcoded placeholder pack.
    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1),
          durationMinutes: z.number().int().positive(),
          passMarkPct: z.number().int().min(0).max(100).optional(),
        }),
      )
      .output(packSchema)
      .mutation(({ input }) => ({
        id: 1,
        title: input.title,
        durationMinutes: input.durationMinutes,
        passMarkPct: input.passMarkPct ?? 70,
        status: "draft",
        createdBy: "admin",
      })),
    // TODO: implement pack.update - returns hardcoded placeholder pack.
    update: adminProcedure
      .input(packPatchInput)
      .output(packSchema)
      .mutation(({ input }) => ({
        id: input.id,
        title: input.title ?? "Placeholder Pack",
        durationMinutes: input.durationMinutes ?? 60,
        passMarkPct: input.passMarkPct ?? 70,
        status: "draft",
        createdBy: "admin",
      })),
    // TODO: implement pack.publish - returns hardcoded placeholder pack.
    publish: adminProcedure
      .input(idInput)
      .output(packSchema)
      .mutation(({ input }) => ({
        id: input.id,
        title: "Placeholder Pack",
        durationMinutes: 60,
        passMarkPct: 70,
        status: "published",
        createdBy: "admin",
      })),
  }),
  question: createTRPCRouter({
    // TODO: implement question.create - returns hardcoded placeholder question.
    create: adminProcedure
      .input(
        z.object({
          packId: z.number().int(),
          prompt: z.string().min(1),
          options: questionOptionsInput.optional(),
          acceptedAnswers: z.array(z.string()).optional(),
        }),
      )
      .output(questionSchema)
      .mutation(({ input }) => ({
        id: 1,
        packId: input.packId,
        prompt: input.prompt,
        position: 1,
        options: (input.options ?? []).map((option, index) => ({
          id: index + 1,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        acceptedAnswers: input.acceptedAnswers ?? [],
        stimulusUrls: [],
      })),
    // TODO: implement question.update - returns hardcoded placeholder question.
    update: adminProcedure
      .input(questionPatchInput)
      .output(questionSchema)
      .mutation(({ input }) => ({
        id: input.id,
        packId: 1,
        prompt: input.prompt ?? "Placeholder prompt",
        position: 1,
        options: (input.options ?? []).map((option, index) => ({
          id: index + 1,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        acceptedAnswers: input.acceptedAnswers ?? [],
        stimulusUrls: [],
      })),
    // TODO: implement question.delete - unconditionally returns { ok: true }.
    delete: adminProcedure
      .input(idInput)
      .output(z.object({ ok: z.boolean() }))
      .mutation(() => ({ ok: true })),
    // TODO: implement question.reorder - unconditionally returns { ok: true }.
    reorder: adminProcedure
      .input(
        z.object({
          packId: z.number().int(),
          order: z.array(z.number().int()),
        }),
      )
      .output(z.object({ ok: z.boolean() }))
      .mutation(() => ({ ok: true })),
  }),
  token: createTRPCRouter({
    // TODO: implement token.create - returns hardcoded placeholder token.
    create: adminProcedure
      .input(
        z.object({
          packId: z.number().int(),
          expiresAt: z.string().optional(),
        }),
      )
      .output(tokenSchema)
      .mutation(({ input }) => ({
        id: 1,
        code: "AAAA1111",
        packId: input.packId,
        expiresAt: input.expiresAt ?? null,
        revokedAt: null,
        createdBy: "admin",
        redemptionCount: 0,
      })),
    // TODO: implement token.revoke - returns hardcoded placeholder token.
    revoke: adminProcedure
      .input(z.object({ tokenId: z.number().int() }))
      .output(tokenSchema)
      .mutation(({ input }) => ({
        id: input.tokenId,
        code: "AAAA1111",
        packId: 1,
        expiresAt: null,
        revokedAt: "2000-01-01T00:00:00.000Z",
        createdBy: "admin",
        redemptionCount: 0,
      })),
    // TODO: implement token.list - always returns an empty array.
    list: adminProcedure.input(z.void()).output(tokenListOutput).query(() => []),
  }),
  user: createTRPCRouter({
    // TODO: implement user.create - returns hardcoded placeholder user.
    create: adminProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
          roleId: z.number().int(),
        }),
      )
      .output(userSchema)
      .mutation(({ input }) => ({
        id: 1,
        username: input.username,
        role: "placeholder",
        status: "Menunggu",
      })),
    // TODO: implement user.approve - returns hardcoded placeholder user.
    approve: adminProcedure
      .input(z.object({ userId: z.number().int() }))
      .output(userSchema)
      .mutation(({ input }) => ({
        id: input.userId,
        username: "placeholder",
        role: "placeholder",
        status: "Aktif",
      })),
    // TODO: implement user.list - always returns an empty array.
    list: adminProcedure.input(z.void()).output(userListOutput).query(() => []),
    // TODO: implement user.setRole - returns hardcoded placeholder user.
    setRole: adminProcedure
      .input(
        z.object({
          userId: z.number().int(),
          roleId: z.number().int(),
        }),
      )
      .output(userSchema)
      .mutation(({ input }) => ({
        id: input.userId,
        username: "placeholder",
        role: "placeholder",
        status: "Aktif",
      })),
    // TODO: implement user.delete - unconditionally returns { ok: true }.
    delete: adminProcedure
      .input(z.object({ userId: z.number().int() }))
      .output(z.object({ ok: z.boolean() }))
      .mutation(() => ({ ok: true })),
  }),
  kelas: createTRPCRouter({
    // TODO: implement kelas.create - returns hardcoded placeholder kelas.
    create: adminProcedure
      .input(z.object({ name: z.string().min(1) }))
      .output(kelasSchema)
      .mutation(({ input }) => ({ id: 1, name: input.name })),
    // TODO: implement kelas.list - always returns an empty array.
    list: adminProcedure.input(z.void()).output(kelasListOutput).query(() => []),
  }),
  monitoring: createTRPCRouter({
    // TODO: implement monitoring.active - always returns an empty array.
    active: adminProcedure
      .input(z.void())
      .output(z.array(adminMonitoringRowSchema))
      .query(() => []),
  }),
  report: createTRPCRouter({
    // TODO: implement report.attempts - always returns an empty array.
    attempts: adminProcedure
      .input(
        z.object({
          packId: z.number().int(),
          filters: z.record(z.string(), z.string()).optional(),
        }),
      )
      .output(attemptsOutput)
      .query(() => []),
    // TODO: implement report.export - returns a hardcoded CSV header.
    export: adminProcedure
      .input(packIdInput)
      .output(z.string())
      .query(() => "npm,name,kelas,score,passed\n"),
  }),
  grading: createTRPCRouter({
    // TODO: implement grading.setManualScore - unconditionally returns { ok: true }.
    setManualScore: adminProcedure
      .input(
        z.object({
          responseId: z.string().regex(/^\d+:\d+$/),
          score: z.number().int().min(0),
        }),
      )
      .output(z.object({ ok: z.boolean() }))
      .mutation(() => ({ ok: true })),
  }),
});
