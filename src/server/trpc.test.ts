import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import type { Context, Session } from "./context";
import {
  adminProcedure,
  createCallerFactory,
  createTRPCRouter,
  privateProcedure,
} from "./trpc";

type PrismaClient = Context["prisma"];

/**
 * A fake Prisma client. It is never touched by these tests and must not
 * construct or connect to a real database.
 */
const fakePrisma = {} as unknown as PrismaClient;

const testRouter = createTRPCRouter({
  privateWhoami: privateProcedure.query(({ ctx }) => {
    return ctx.session.user;
  }),
  adminWhoami: adminProcedure.query(({ ctx }) => {
    return ctx.session.user;
  }),
});

const createCaller = createCallerFactory(testRouter);

function makeContext(session: Session | null): Context {
  return {
    prisma: fakePrisma,
    session,
    clientIp: "203.0.113.7",
  };
}

const userSession: Session = {
  user: { id: 1, username: "alice", role: "user" },
};

const adminSession: Session = {
  user: { id: 2, username: "root", role: "admin" },
};

async function expectTRPCError(
  promise: Promise<unknown>,
  code: TRPCError["code"],
) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe(code);
    return;
  }
  throw new Error(`Expected a TRPCError with code ${code}, but none was thrown`);
}

describe("privateProcedure authorization", () => {
  it("rejects an anonymous caller with UNAUTHORIZED", async () => {
    const caller = createCaller(makeContext(null));
    await expectTRPCError(caller.privateWhoami(), "UNAUTHORIZED");
  });

  it("admits a valid authenticated session and returns its identity", async () => {
    const caller = createCaller(makeContext(userSession));
    await expect(caller.privateWhoami()).resolves.toEqual(userSession.user);
  });
});

describe("adminProcedure authorization", () => {
  it("rejects an authenticated non-admin with FORBIDDEN", async () => {
    const caller = createCaller(makeContext(userSession));
    await expectTRPCError(caller.adminWhoami(), "FORBIDDEN");
  });

  it("admits an admin caller", async () => {
    const caller = createCaller(makeContext(adminSession));
    await expect(caller.adminWhoami()).resolves.toEqual(adminSession.user);
  });
});
