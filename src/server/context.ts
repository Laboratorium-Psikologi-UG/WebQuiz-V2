import type { Session as AuthSession } from "next-auth";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requestIdentity";

/**
 * Authenticated admin (ACCOUNT) session attached to the tRPC context.
 * Mirrors the `adminAuth.me` payload in Contract.md. Participant exam
 * sessions are a separate TOKEN_REDEMPTION scope (see Contract.md) and are
 * not modeled yet.
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
  clientIp: string | null;
};

/**
 * Maps the Auth.js session onto the domain session. The augmentation in
 * `src/types/next-auth.d.ts` is compile-time only, so the identity fields are
 * validated at runtime before being trusted as authenticated.
 */
export function toDomainSession(session: AuthSession | null): Session | null {
  if (!session?.user) return null;

  const { accountId, username, role } = session.user;
  if (typeof accountId !== "number") return null;
  if (!Number.isSafeInteger(accountId) || accountId <= 0) return null;
  if (typeof username !== "string") return null;
  if (typeof role !== "string") return null;
  if (username.trim().length === 0) return null;
  if (role.trim().length === 0) return null;

  return {
    user: {
      id: accountId,
      username,
      role,
    },
  };
}

/**
 * tRPC request context — built per-request on the server.
 * Add auth, headers, etc. here as the app grows.
 */
export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<Context> {
  const session = await auth();

  return {
    prisma,
    session: toDomainSession(session),
    clientIp: getClientIp(opts.req),
  };
}
