import { prisma } from "@/lib/prisma";

/**
 * tRPC request context — built per-request on the server.
 * Add auth, headers, etc. here as the app grows.
 */
export async function createContext() {
  return {
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
