import { TRPCError } from "@trpc/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Context } from "../context";

/**
 * Mirrors `CredentialsSignin` from Auth.js closely enough for the router's
 * `instanceof` check. The package is mocked so no Auth.js runtime, Prisma,
 * database, bcrypt, or HTTP is ever loaded by this test.
 */
const { CredentialsSignin } = vi.hoisted(() => {
  class CredentialsSignin extends Error {
    static readonly type = "CredentialsSignin";
    readonly type = "CredentialsSignin";
    readonly code = "credentials";

    constructor(message = "CredentialsSignin") {
      super(message);
      this.name = "CredentialsSignin";
    }
  }

  return { CredentialsSignin };
});

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  consumeUsernameAttempt: vi.fn(),
  isIpLocked: vi.fn(),
  normalizeUsername: vi.fn(),
  recordIpFailure: vi.fn(),
  resetUsername: vi.fn(),
}));

vi.mock("next-auth", () => ({ AuthError: Error, CredentialsSignin }));
vi.mock("@/auth", () => ({ signIn: mocks.signIn, signOut: mocks.signOut }));
vi.mock("@/lib/loginThrottle", () => ({
  consumeUsernameAttempt: mocks.consumeUsernameAttempt,
  isIpLocked: mocks.isIpLocked,
  normalizeUsername: mocks.normalizeUsername,
  recordIpFailure: mocks.recordIpFailure,
  resetUsername: mocks.resetUsername,
}));

import { createCallerFactory } from "../trpc";
import { adminAuthRouter } from "./adminAuth";

type PrismaClient = Context["prisma"];

const fakePrisma = {} as unknown as PrismaClient;

const createCaller = createCallerFactory(adminAuthRouter);

function makeContext(
  overrides: Partial<Pick<Context, "session" | "clientIp">> = {},
): Context {
  return {
    prisma: fakePrisma,
    session: null,
    clientIp: "203.0.113.7",
    ...overrides,
  };
}

const validInput = { username: "admin", password: "hunter2" } as const;

const allowedDecision = {
  allowed: true,
  locked: false,
  retryAfterSeconds: 0,
} as const;

/** Swallows expected throttle-failure logs so test output stays clean. */
const consoleErrorSpy = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.normalizeUsername.mockImplementation((value: string) =>
    value.trim().toLowerCase(),
  );
  mocks.consumeUsernameAttempt.mockResolvedValue(allowedDecision);
  mocks.isIpLocked.mockResolvedValue(allowedDecision);
  mocks.signIn.mockResolvedValue(undefined);
  mocks.recordIpFailure.mockResolvedValue(allowedDecision);
  mocks.resetUsername.mockResolvedValue(undefined);
});

async function captureTRPCError(promise: Promise<unknown>): Promise<TRPCError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TRPCError) return error;
    throw error;
  }
  throw new Error("Expected a TRPCError, but the call resolved");
}

describe("adminAuth.login", () => {
  it("denies a throttled attempt with ok:false and never calls signIn", async () => {
    mocks.consumeUsernameAttempt.mockResolvedValue({
      allowed: false,
      locked: true,
      retryAfterSeconds: 60,
    });

    const caller = createCaller(makeContext());

    await expect(caller.login(validInput)).resolves.toEqual({ ok: false });
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.recordIpFailure).not.toHaveBeenCalled();
    expect(mocks.resetUsername).not.toHaveBeenCalled();
  });

  it("returns ok:false and records the IP when credentials are rejected", async () => {
    mocks.signIn.mockRejectedValue(new CredentialsSignin());

    const caller = createCaller(makeContext({ clientIp: "203.0.113.7" }));

    await expect(caller.login(validInput)).resolves.toEqual({ ok: false });
    expect(mocks.recordIpFailure).toHaveBeenCalledTimes(1);
    expect(mocks.recordIpFailure).toHaveBeenCalledWith("203.0.113.7");
    expect(mocks.resetUsername).not.toHaveBeenCalled();
  });

  it("does not record an IP when the client IP is unavailable", async () => {
    mocks.signIn.mockRejectedValue(new CredentialsSignin());

    const caller = createCaller(makeContext({ clientIp: null }));

    await expect(caller.login(validInput)).resolves.toEqual({ ok: false });
    expect(mocks.recordIpFailure).not.toHaveBeenCalled();
    expect(mocks.resetUsername).not.toHaveBeenCalled();
  });

  it("resets only the normalized username bucket on success", async () => {
    const caller = createCaller(makeContext());

    await expect(
      caller.login({ username: "  Admin  ", password: "hunter2" }),
    ).resolves.toEqual({ ok: true });

    expect(mocks.consumeUsernameAttempt).toHaveBeenCalledWith("admin");
    expect(mocks.resetUsername).toHaveBeenCalledTimes(1);
    expect(mocks.resetUsername).toHaveBeenCalledWith("admin");
    expect(mocks.recordIpFailure).not.toHaveBeenCalled();
  });

  it("propagates non-credential signIn failures as an internal server error", async () => {
    const original = new Error("auth backend exploded");
    mocks.signIn.mockRejectedValue(original);

    const caller = createCaller(makeContext());
    const error = await captureTRPCError(caller.login(validInput));

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(error.cause).toBe(original);
    expect(error.message).toBe("auth backend exploded");
    expect(mocks.recordIpFailure).not.toHaveBeenCalled();
    expect(mocks.resetUsername).not.toHaveBeenCalled();
  });

  it("fails closed with ok:false and skips signIn when the throttle store errors", async () => {
    mocks.consumeUsernameAttempt.mockRejectedValue(
      new Error("throttle store unavailable"),
    );

    const caller = createCaller(makeContext());

    await expect(caller.login(validInput)).resolves.toEqual({ ok: false });
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.resetUsername).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it("denies a login when the client IP is actively locked before any username work", async () => {
    mocks.isIpLocked.mockResolvedValue({
      allowed: false,
      locked: true,
      retryAfterSeconds: 120,
    });

    const caller = createCaller(makeContext({ clientIp: "203.0.113.7" }));

    await expect(caller.login(validInput)).resolves.toEqual({ ok: false });
    expect(mocks.isIpLocked).toHaveBeenCalledTimes(1);
    expect(mocks.isIpLocked).toHaveBeenCalledWith("203.0.113.7");
    expect(mocks.consumeUsernameAttempt).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.resetUsername).not.toHaveBeenCalled();
    expect(mocks.recordIpFailure).not.toHaveBeenCalled();
  });

  it("fails closed and logs a non-identifying error when the IP probe storage errors", async () => {
    mocks.isIpLocked.mockRejectedValue(new Error("probe store unavailable"));

    const caller = createCaller(makeContext({ clientIp: "203.0.113.7" }));

    await expect(caller.login(validInput)).resolves.toEqual({ ok: false });
    expect(mocks.isIpLocked).toHaveBeenCalledWith("203.0.113.7");
    expect(mocks.consumeUsernameAttempt).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.resetUsername).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    const [message] = consoleErrorSpy.mock.calls[0] as [string];
    expect(message).toContain("probe");
    expect(message).not.toContain("203.0.113.7");
    expect(message).not.toContain("admin");
  });

  it("skips the IP probe when the client IP is unavailable", async () => {
    const caller = createCaller(makeContext({ clientIp: null }));

    await expect(caller.login(validInput)).resolves.toEqual({ ok: true });
    expect(mocks.isIpLocked).not.toHaveBeenCalled();
  });
});
