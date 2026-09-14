import type { Session as AuthSession, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { toDomainSession } from "@/server/context";

import { jwtCallback, sessionCallback } from "./callbacks";

type JwtCallbackParams = Parameters<typeof jwtCallback>[0];
type SessionCallbackParams = Parameters<typeof sessionCallback>[0];

const AUTH_USER = {
  id: "42",
  accountId: 42,
  username: "alice",
  role: "ADMIN",
} as unknown as User;

const makeUser = (): User => ({ ...AUTH_USER });

const makeToken = (overrides: Record<string, unknown> = {}): JWT =>
  ({
    sub: "42",
    name: "Alice",
    email: "alice@example.com",
    iat: 1_700_000_000,
    ...overrides,
  }) as unknown as JWT;

const callJwt = (token: JWT, user?: User) =>
  jwtCallback({ token, user } as unknown as JwtCallbackParams) as JWT;

const callSession = (session: AuthSession, token: JWT) =>
  sessionCallback({
    session,
    token,
  } as unknown as SessionCallbackParams) as AuthSession;

const makeSession = (user: Record<string, unknown>): AuthSession =>
  ({
    user,
    expires: "2099-01-01T00:00:00.000Z",
  }) as unknown as AuthSession;

describe("jwtCallback", () => {
  it("copies accountId, username and role from the user and preserves existing token fields", () => {
    const token = makeToken();
    const result = callJwt(token, makeUser());

    expect(result).toBe(token);
    expect(result.accountId).toBe(42);
    expect(result.username).toBe("alice");
    expect(result.role).toBe("ADMIN");
    expect(result.sub).toBe("42");
    expect(result.name).toBe("Alice");
    expect(result.email).toBe("alice@example.com");
    expect(result.iat).toBe(1_700_000_000);
  });

  it("returns the token unchanged when there is no user", () => {
    const token = makeToken({
      accountId: 7,
      username: "existing",
      role: "USER",
    });

    const result = callJwt(token);

    expect(result).toBe(token);
    expect(result.accountId).toBe(7);
    expect(result.username).toBe("existing");
    expect(result.role).toBe("USER");
    expect(result.sub).toBe("42");
  });
});

describe("sessionCallback", () => {
  it("copies token identity to session.user and preserves existing session fields", () => {
    const session = makeSession({
      name: "Alice",
      email: "alice@example.com",
    });
    const token = makeToken({
      accountId: 42,
      username: "alice",
      role: "ADMIN",
    });

    const result = callSession(session, token);

    expect(result).toBe(session);
    expect(result.user.accountId).toBe(42);
    expect(result.user.username).toBe("alice");
    expect(result.user.role).toBe("ADMIN");
    expect(result.user.name).toBe("Alice");
    expect(result.user.email).toBe("alice@example.com");
    expect(result.expires).toBe("2099-01-01T00:00:00.000Z");
  });
});

describe("jwt -> session -> toDomainSession round trip", () => {
  it("yields the exact domain identity without touching external services", () => {
    const token = callJwt(makeToken(), makeUser());
    const session = callSession(makeSession({ name: "Alice" }), token);
    const domain = toDomainSession(session);

    expect(domain).toEqual({
      user: { id: 42, username: "alice", role: "ADMIN" },
    });
  });
});
