import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../trpc";

export const monitoringActiveItemSchema = z.object({
  maskedNpm: z.string(),
  maskedName: z.string(),
  lastActivityAt: z.string(),
});

export const monitoringActiveOutputSchema = z.array(monitoringActiveItemSchema);

export const monitoringRouter = createTRPCRouter({
  active: baseProcedure
    .input(z.void())
    .output(monitoringActiveOutputSchema)
    .query(() => []),
});
