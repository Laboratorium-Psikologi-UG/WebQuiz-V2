"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

/**
 * Typed React Query + tRPC client. The `AppRouter` type is the
 * single source of truth for the client-side API surface.
 */
export const trpc = createTRPCReact<AppRouter>();
