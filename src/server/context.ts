import { prisma } from "@/lib/prisma";

/**
 * Authenticated admin (ACCOUNT) session attached to the tRPC context.
 * Mirrors the `adminAuth.me` payload in Contract.md. Participant exam
 * sessions are a separate TOKEN_REDEMPTION scope (see Contract.md) and are
 * not modeled yet; the flows that populate this are not wired up, so it is
 * always null.
 */
export type Session = {
  user: {
    id: number;
    username: string;
    role: string;
  };
};

export type Context = {
  prisma: typeof prisma;
  session: Session | null;
};

/**
 * tRPC request context — built per-request on the server.
 * Add auth, headers, etc. here as the app grows.
 */
export async function createContext(): Promise<Context> {
  return {
    prisma,
    session: null,
  };
}
