import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  compare: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { account: { findUnique: mocks.findUnique } },
}));

vi.mock("bcryptjs", () => ({
  compare: mocks.compare,
}));

import { authorizeCredentials } from "./credentials";

const DUMMY_PASSWORD_HASH =
  "$2b$10$cj9srmCaQb8C0Onsz1weZOoWE/iC8AKJMyWHGiQtY8wOjZqU.PpQS";

const STORED_PASSWORD_HASH = "$2b$10$stored.hash.value.for.tests.only.abc";

const activeAccount = {
  id: 7,
  username: "admin",
  passwordHash: STORED_PASSWORD_HASH,
  status: "aktif",
  role: { name: "ADMIN" },
};

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.compare.mockReset();
});

describe("authorizeCredentials", () => {
  it("rejects invalid input without querying the database or comparing hashes", async () => {
    await expect(
      authorizeCredentials({ username: "", password: "" }),
    ).resolves.toBeNull();
    await expect(authorizeCredentials(null)).resolves.toBeNull();
    await expect(authorizeCredentials({})).resolves.toBeNull();
    await expect(
      authorizeCredentials({ username: "admin" }),
    ).resolves.toBeNull();

    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("rejects an unknown account and runs one dummy comparison", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(
      authorizeCredentials({ username: "ghost", password: "secret" }),
    ).resolves.toBeNull();

    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.compare).toHaveBeenCalledTimes(1);
    expect(mocks.compare).toHaveBeenCalledWith("secret", DUMMY_PASSWORD_HASH);
  });

  it("rejects an inactive account using the dummy hash, not the stored hash", async () => {
    mocks.findUnique.mockResolvedValue({
      ...activeAccount,
      status: "nonaktif",
    });

    await expect(
      authorizeCredentials({ username: "admin", password: "secret" }),
    ).resolves.toBeNull();

    expect(mocks.compare).toHaveBeenCalledTimes(1);
    expect(mocks.compare).toHaveBeenCalledWith("secret", DUMMY_PASSWORD_HASH);
    expect(mocks.compare).not.toHaveBeenCalledWith(
      "secret",
      STORED_PASSWORD_HASH,
    );
  });

  it("rejects a wrong password for an active account using the stored hash", async () => {
    mocks.findUnique.mockResolvedValue(activeAccount);
    mocks.compare.mockResolvedValue(false);

    await expect(
      authorizeCredentials({ username: "admin", password: "wrong" }),
    ).resolves.toBeNull();

    expect(mocks.compare).toHaveBeenCalledTimes(1);
    expect(mocks.compare).toHaveBeenCalledWith("wrong", STORED_PASSWORD_HASH);
  });

  it("maps a verified active account to the exact Auth.js identity", async () => {
    mocks.findUnique.mockResolvedValue(activeAccount);
    mocks.compare.mockResolvedValue(true);

    await expect(
      authorizeCredentials({ username: "admin", password: "correct" }),
    ).resolves.toEqual({
      id: "7",
      name: "admin",
      accountId: 7,
      username: "admin",
      role: "ADMIN",
    });

    expect(mocks.compare).toHaveBeenCalledWith("correct", STORED_PASSWORD_HASH);
  });
});
