import { z } from "zod";
import { publicProcedure, createTRPCRouter } from "../trpc";

export const monitoringActiveItemSchema = z.object({
  maskedNpm: z.string(),
  maskedName: z.string(),
  lastActivityAt: z.string(),
});

export const monitoringActiveOutputSchema = z.array(monitoringActiveItemSchema);

export const monitoringRouter = createTRPCRouter({
  active: publicProcedure
    .input(z.void())
    .output(monitoringActiveOutputSchema)
    .query(() => []),
});
