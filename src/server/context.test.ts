import type { Session as AuthSession } from "next-auth";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { toDomainSession } from "./context";

type AuthUser = Record<string, unknown>;

const sessionWithUser = (user: AuthUser): AuthSession =>
  ({ user }) as unknown as AuthSession;

describe("toDomainSession", () => {
  it("returns null for a null session", () => {
    expect(toDomainSession(null)).toBeNull();
  });

  it("returns null when the session has no user", () => {
    expect(toDomainSession({} as AuthSession)).toBeNull();
    expect(
      toDomainSession({ user: undefined } as unknown as AuthSession),
    ).toBeNull();
  });

  describe("malformed identity fields", () => {
    const cases: ReadonlyArray<[string, AuthUser]> = [
      ["accountId missing", { username: "admin", role: "admin" }],
      [
        "accountId undefined",
        { accountId: undefined, username: "admin", role: "admin" },
      ],
      ["accountId string", { accountId: "1", username: "admin", role: "admin" }],
      ["accountId null", { accountId: null, username: "admin", role: "admin" }],
      ["accountId object", { accountId: {}, username: "admin", role: "admin" }],
      ["username missing", { accountId: 1, role: "admin" }],
      ["username undefined", { accountId: 1, username: undefined, role: "admin" }],
      ["username non-string", { accountId: 1, username: 42, role: "admin" }],
      ["username null", { accountId: 1, username: null, role: "admin" }],
      ["role missing", { accountId: 1, username: "admin" }],
      ["role undefined", { accountId: 1, username: "admin", role: undefined }],
      ["role non-string", { accountId: 1, username: "admin", role: 7 }],
      ["role null", { accountId: 1, username: "admin", role: null }],
    ];

    it.each(cases)("returns null when %s", (_label, user) => {
      expect(toDomainSession(sessionWithUser(user))).toBeNull();
    });
  });

  it("maps a valid session to the exact domain shape and discards unrelated Auth.js fields", () => {
    const result = toDomainSession(
      sessionWithUser({
        accountId: 7,
        username: "admin",
        role: "ADMIN",
        id: "7",
        name: "Admin",
        email: "admin@example.com",
        image: null,
        expires: "2099-01-01T00:00:00.000Z",
      }),
    );

    expect(result).toEqual({
      user: { id: 7, username: "admin", role: "ADMIN" },
    });
    expect(Object.keys(result!.user).sort()).toEqual([
      "id",
      "role",
      "username",
    ]);
  });

  describe("non-positive, non-integer, or unsafe accountId values are rejected", () => {
    const cases: ReadonlyArray<[string, number]> = [
      ["zero", 0],
      ["a negative value", -3],
      ["a fractional value", 1.5],
      ["NaN", Number.NaN],
      ["positive Infinity", Number.POSITIVE_INFINITY],
      ["negative Infinity", Number.NEGATIVE_INFINITY],
      ["an unsafe integer", Number.MAX_SAFE_INTEGER + 1],
    ];

    it.each(cases)("returns null for %s", (_label, id) => {
      expect(
        toDomainSession(
          sessionWithUser({ accountId: id, username: "admin", role: "ADMIN" }),
        ),
      ).toBeNull();
    });
  });

  describe("blank username or role is rejected", () => {
    const cases: ReadonlyArray<[string, AuthUser]> = [
      ["an empty username", { accountId: 1, username: "", role: "ADMIN" }],
      ["a whitespace-only username", { accountId: 1, username: "   ", role: "ADMIN" }],
      ["an empty role", { accountId: 1, username: "admin", role: "" }],
      ["a whitespace-only role", { accountId: 1, username: "admin", role: "\t\n" }],
    ];

    it.each(cases)("returns null for %s", (_label, user) => {
      expect(toDomainSession(sessionWithUser(user))).toBeNull();
    });
  });

  it("preserves nonblank surrounding whitespace in returned strings", () => {
    const result = toDomainSession(
      sessionWithUser({ accountId: 1, username: " admin ", role: " ADMIN " }),
    );

    expect(result).toEqual({
      user: { id: 1, username: " admin ", role: " ADMIN " },
    });
  });
});
