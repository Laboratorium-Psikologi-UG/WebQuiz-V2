import { createHmac } from "node:crypto";

import { Prisma } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for the durable login throttle core.
 *
 * These tests never touch a database. `@/lib/prisma` is replaced with a fake
 * whose `$transaction` runs the caller's callback against a stub `tx` that
 * records tagged-template SQL and replays a configured `SELECT ... FOR UPDATE`
 * row. This exercises the pure decision logic (fresh attempt, exact threshold,
 * over-threshold, active lock, stale window, lock exponent cap, empty row) and
 * asserts the concurrency contract (ReadCommitted isolation + row-lock SQL).
 *
 * RESIDUAL INTEGRATION GAP (not covered here, by design): because there is no
 * MySQL server, these tests cannot prove that
 *   - `INSERT ... ON DUPLICATE KEY UPDATE` and `SELECT ... FOR UPDATE` actually
 *     serialize concurrent transactions,
 *   - `NOW(3)` / `TIMESTAMPDIFF` / `TIMESTAMPADD` database-clock arithmetic
 *     matches the simulated `windowExpired` / `lockRemainingMicros` values,
 *   - two racing callers are capped at exactly `threshold` admissions.
 * That requires a real MySQL instance (Testcontainers or an ephemeral DB) and
 * is the outstanding integration risk for this module.
 */

const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET;
const TEST_SECRET = "login-throttle-unit-test-secret";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  deleteMany: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    $queryRaw: mocks.queryRaw,
    loginAttempt: { deleteMany: mocks.deleteMany },
  },
}));

import {
  LOCK_BASE_MS,
  LOCK_MAX_MS,
  USERNAME_THRESHOLD,
  WINDOW_MS,
  consumeUsernameAttempt,
  deriveBucketKey,
  isIpLocked,
  normalizeUsername,
  recordIpFailure,
  resetUsername,
  type ThrottleDecision,
} from "./loginThrottle";

const WINDOW_SECONDS = Math.floor(WINDOW_MS / 1000);

type BucketRow = {
  failures: number | bigint;
  windowExpired: number | bigint | boolean;
  isLocked: number | bigint | boolean;
  lockRemainingMicros: number | bigint | null;
};

type RawCall = { sql: string; values: readonly unknown[] };
type CallLog = { execute: RawCall[]; query: RawCall[]; options: unknown };

type TxMock = {
  $executeRaw: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<number>;
  $queryRaw: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<unknown>;
};

type LockProbeRow = {
  isLocked: number | bigint | boolean;
  lockRemainingMicros: number | bigint | null;
};

type ProbeLog = { call: RawCall | undefined };

function makeRow(overrides: Partial<BucketRow>): BucketRow {
  return {
    failures: 0,
    windowExpired: false,
    isLocked: false,
    lockRemainingMicros: null,
    ...overrides,
  };
}

async function runConsume(
  invoke: () => Promise<ThrottleDecision>,
  rows: BucketRow[],
): Promise<{ decision: ThrottleDecision; log: CallLog }> {
  const log: CallLog = { execute: [], query: [], options: undefined };

  mocks.transaction.mockImplementation(
    async (cb: (tx: TxMock) => Promise<unknown>, options: unknown) => {
      log.options = options;
      const tx: TxMock = {
        $executeRaw: (strings, ...values) => {
          log.execute.push({ sql: strings.join(" ? "), values });
          return Promise.resolve(1);
        },
        $queryRaw: (strings, ...values) => {
          log.query.push({ sql: strings.join(" ? "), values });
          return Promise.resolve(rows);
        },
      };
      return cb(tx);
    },
  );

  const decision = await invoke();
  return { decision, log };
}

const lastExecute = (log: CallLog): RawCall => {
  const call = log.execute.at(-1);
  if (!call) throw new Error("Expected at least one $executeRaw call");
  return call;
};

async function runProbe(
  invoke: () => Promise<ThrottleDecision>,
  rows: LockProbeRow[],
): Promise<{ decision: ThrottleDecision; log: ProbeLog }> {
  const log: ProbeLog = { call: undefined };

  mocks.queryRaw.mockImplementation(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      log.call = { sql: strings.join(" ? "), values };
      return Promise.resolve(rows);
    },
  );

  const decision = await invoke();
  return { decision, log };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockReset();
  mocks.deleteMany.mockReset();
  mocks.queryRaw.mockReset();
  process.env.AUTH_SECRET = TEST_SECRET;
});

afterAll(() => {
  if (ORIGINAL_AUTH_SECRET === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET;
  }
});

describe("normalizeUsername", () => {
  const cases: ReadonlyArray<[string, string, string]> = [
    ["trims surrounding whitespace", "   admin   ", "admin"],
    ["lowercases", "AdMiN", "admin"],
    ["lowercases and trims tabs/newlines", "\tAlIcE\n", "alice"],
    ["NFKC folds full-width letters", "\uFF21\uFF24\uFF2D\uFF29\uFF2E", "admin"],
    ["NFKC folds the fi ligature", "\uFB01le", "file"],
  ];

  it.each(cases)("%s", (_label, input, expected) => {
    expect(normalizeUsername(input)).toBe(expected);
  });

  it("returns an empty string for empty/whitespace input (guarding happens later)", () => {
    expect(normalizeUsername("")).toBe("");
    expect(normalizeUsername("   ")).toBe("");
  });

  it("is idempotent", () => {
    const once = normalizeUsername("  \uFF21DMIN  ");
    expect(normalizeUsername(once)).toBe(once);
  });

  it("throws on a non-string input", () => {
    expect(() => normalizeUsername(42 as unknown as string)).toThrow(
      "Username must be a string.",
    );
  });
});

describe("deriveBucketKey", () => {
  const SECRET_HEX_LENGTH = 64;

  it("is deterministic and produces lowercase hex HMAC-SHA256", () => {
    const first = deriveBucketKey("username", "alice");
    const second = deriveBucketKey("username", "alice");

    expect(first).toBe(second);
    expect(first).toHaveLength(SECRET_HEX_LENGTH);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("separates buckets by kind for the same identity", () => {
    expect(deriveBucketKey("username", "alice")).not.toBe(
      deriveBucketKey("ip", "alice"),
    );
  });

  it("maps cosmetic username variants onto one key", () => {
    const canonical = deriveBucketKey("username", "alice");
    expect(deriveBucketKey("username", "  ALICE ")).toBe(canonical);
    expect(deriveBucketKey("username", "\uFF21LICE")).toBe(canonical);
    expect(deriveBucketKey("username", "\uFB01le")).toBe(
      deriveBucketKey("username", "file"),
    );
  });

  it("trims IP identities before hashing", () => {
    expect(deriveBucketKey("ip", "  203.0.113.7 ")).toBe(
      deriveBucketKey("ip", "203.0.113.7"),
    );
  });

  it("never embeds the raw identity in the derived key", () => {
    const key = deriveBucketKey("username", "alice");
    expect(key).not.toContain("alice");
    expect(key).not.toContain("username");
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  it("depends on AUTH_SECRET (different secret yields a different key)", () => {
    const withTestSecret = deriveBucketKey("username", "alice");
    process.env.AUTH_SECRET = "a-different-secret";
    expect(deriveBucketKey("username", "alice")).not.toBe(withTestSecret);
  });

  it("matches an independently computed HMAC over `kind:normalized`", () => {
    const expected = createHmac("sha256", TEST_SECRET)
      .update("username:alice")
      .digest("hex");
    expect(deriveBucketKey("username", "Alice")).toBe(expected);
  });

  it("throws when AUTH_SECRET is unset", () => {
    delete process.env.AUTH_SECRET;
    expect(() => deriveBucketKey("username", "alice")).toThrow(
      "AUTH_SECRET must be set and non-empty to hash login throttle identities.",
    );
  });

  it("throws when AUTH_SECRET is blank", () => {
    process.env.AUTH_SECRET = "   ";
    expect(() => deriveBucketKey("username", "alice")).toThrow(
      "AUTH_SECRET must be set and non-empty to hash login throttle identities.",
    );
  });

  it("throws on an empty username identity", () => {
    expect(() => deriveBucketKey("username", "   ")).toThrow(
      "Cannot derive a username throttle key from an empty identity.",
    );
  });

  it("throws on an empty ip identity", () => {
    expect(() => deriveBucketKey("ip", "")).toThrow(
      "Cannot derive a ip throttle key from an empty identity.",
    );
  });
});

describe("consumeUsernameAttempt decisions", () => {
  it("admits a fresh attempt and increments without arming a lock", async () => {
    const { decision, log } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ failures: 0 })],
    );

    expect(decision).toEqual({
      allowed: true,
      locked: false,
      retryAfterSeconds: 0,
    });

    const update = lastExecute(log);
    expect(update.sql).toContain("`failures` =");
    expect(update.sql).not.toContain("lockedUntil");
    expect(update.values).toContain(1);
    expect(update.values).toContain(deriveBucketKey("username", "alice"));
  });

  it("admits the exact-threshold attempt and arms the base lock", async () => {
    const { decision, log } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ failures: USERNAME_THRESHOLD - 1 })],
    );

    expect(decision).toEqual({
      allowed: true,
      locked: false,
      retryAfterSeconds: 0,
    });

    const update = lastExecute(log);
    expect(update.sql).toContain("lockedUntil");
    expect(update.sql).toContain("TIMESTAMPADD");
    expect(update.values).toContain(USERNAME_THRESHOLD);
    expect(update.values).toContain(LOCK_BASE_MS / 1000);
  });

  it("denies an over-threshold attempt and escalates the lock to 120s", async () => {
    const { decision, log } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ failures: USERNAME_THRESHOLD })],
    );

    expect(decision).toEqual({
      allowed: false,
      locked: true,
      retryAfterSeconds: 120,
    });

    const update = lastExecute(log);
    expect(update.values).toContain(USERNAME_THRESHOLD + 1);
    expect(update.values).toContain(120);
  });

  it("caps the exponential lock at LOCK_MAX_MS (15 minutes)", async () => {
    const { decision } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ failures: 40 })],
    );

    const maxSeconds = Math.ceil(LOCK_MAX_MS / 1000);
    expect(decision).toEqual({
      allowed: false,
      locked: true,
      retryAfterSeconds: maxSeconds,
    });
  });

  it("reports an active lock with retryAfter rounded up from microseconds", async () => {
    const { decision, log } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [
        makeRow({
          failures: USERNAME_THRESHOLD + 2,
          isLocked: 1,
          lockRemainingMicros: BigInt(2_400_000),
        }),
      ],
    );

    expect(decision).toEqual({
      allowed: false,
      locked: true,
      retryAfterSeconds: 3,
    });
    expect(log.execute).toHaveLength(1);
  });

  it("floors an active lock with null remaining time to 1 second", async () => {
    const { decision } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ isLocked: true, lockRemainingMicros: null })],
    );

    expect(decision).toEqual({
      allowed: false,
      locked: true,
      retryAfterSeconds: 1,
    });
  });

  it("resets a stale window to a single failure and clears any lock", async () => {
    const { decision, log } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ failures: 99, windowExpired: 1, isLocked: 0 })],
    );

    expect(decision).toEqual({
      allowed: true,
      locked: false,
      retryAfterSeconds: 0,
    });

    const update = lastExecute(log);
    expect(update.sql).toContain("`failures` = 1");
    expect(update.sql).toContain("`lockedUntil` = NULL");
    expect(update.values).toContain(deriveBucketKey("username", "alice"));
  });

  it("treats a zero bigint windowExpired flag as not expired", async () => {
    const { decision } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ failures: 0, windowExpired: BigInt(0) })],
    );

    expect(decision.allowed).toBe(true);
  });

  it("throws when the upsert is followed by an empty row", async () => {
    await expect(
      runConsume(() => consumeUsernameAttempt("alice"), []),
    ).rejects.toThrow(
      "Login throttle bucket could not be read after upsert.",
    );
  });
});

describe("recordIpFailure thresholds", () => {
  it("uses the IP threshold (20), admitting the exact-threshold attempt", async () => {
    const { decision, log } = await runConsume(
      () => recordIpFailure("203.0.113.7"),
      [makeRow({ failures: 19 })],
    );

    expect(decision).toEqual({
      allowed: true,
      locked: false,
      retryAfterSeconds: 0,
    });
    expect(lastExecute(log).values).toContain(20);
    expect(lastExecute(log).values).toContain(
      deriveBucketKey("ip", "203.0.113.7"),
    );
  });

  it("denies once the IP threshold is exceeded", async () => {
    const { decision } = await runConsume(
      () => recordIpFailure("203.0.113.7"),
      [makeRow({ failures: 20 })],
    );

    expect(decision).toEqual({
      allowed: false,
      locked: true,
      retryAfterSeconds: 120,
    });
  });
});

describe("isIpLocked read-only probe", () => {
  const IP = "203.0.113.7";

  it("returns allowed/unlocked/0 when no row exists", async () => {
    const { decision, log } = await runProbe(() => isIpLocked(IP), []);

    expect(decision).toEqual({
      allowed: true,
      locked: false,
      retryAfterSeconds: 0,
    });
    expect(log.call?.values).toContain(deriveBucketKey("ip", IP));
  });

  it("returns denied/locked with retry seconds rounded up for an active lock", async () => {
    const { decision } = await runProbe(() => isIpLocked(IP), [
      { isLocked: true, lockRemainingMicros: 2_400_000 },
    ]);

    expect(decision).toEqual({
      allowed: false,
      locked: true,
      retryAfterSeconds: 3,
    });
  });

  it("accepts bigint booleans/microseconds from the raw driver", async () => {
    const { decision } = await runProbe(() => isIpLocked(IP), [
      { isLocked: BigInt(1), lockRemainingMicros: BigInt(2_400_000) },
    ]);

    expect(decision).toEqual({
      allowed: false,
      locked: true,
      retryAfterSeconds: 3,
    });
  });

  it("treats an expired/inactive lock as allowed/unlocked/0", async () => {
    for (const isLocked of [false, 0, BigInt(0)] as const) {
      const { decision } = await runProbe(() => isIpLocked(IP), [
        { isLocked, lockRemainingMicros: null },
      ]);

      expect(decision).toEqual({
        allowed: true,
        locked: false,
        retryAfterSeconds: 0,
      });
    }
  });

  it("treats a null-remaining inactive row as allowed/unlocked/0", async () => {
    const { decision } = await runProbe(() => isIpLocked(IP), [
      { isLocked: false, lockRemainingMicros: null },
    ]);

    expect(decision).toEqual({
      allowed: true,
      locked: false,
      retryAfterSeconds: 0,
    });
  });

  it("floors a locked row with null remaining time to 1 second", async () => {
    const { decision } = await runProbe(() => isIpLocked(IP), [
      { isLocked: true, lockRemainingMicros: null },
    ]);

    expect(decision).toEqual({
      allowed: false,
      locked: true,
      retryAfterSeconds: 1,
    });
  });

  it("probes by HMAC key and never sends the raw IP", async () => {
    const { log } = await runProbe(() => isIpLocked(IP), []);

    const key = deriveBucketKey("ip", IP);
    expect(log.call?.values).toContain(key);
    expect(log.call?.sql).toContain("`key` =");
    expect(log.call?.sql).not.toContain(IP);
    expect(log.call?.sql).not.toContain(key);
    expect(log.call?.values).not.toContain(IP);
  });

  it("issues exactly one read-only SELECT and performs no writes", async () => {
    const { log } = await runProbe(() => isIpLocked(IP), [
      { isLocked: false, lockRemainingMicros: null },
    ]);

    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();

    const sql = log.call?.sql ?? "";
    expect(sql).toMatch(/SELECT/);
    expect(sql).toContain("NOW(3)");
    expect(sql).not.toMatch(
      /\b(INSERT|UPDATE|DELETE|FOR UPDATE|ON DUPLICATE KEY)\b/,
    );
  });

  it("throws before querying when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;

    await expect(isIpLocked(IP)).rejects.toThrow(
      "AUTH_SECRET must be set and non-empty to hash login throttle identities.",
    );
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("propagates Prisma query errors so callers can fail closed", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("PrismaClientKnownRequestError"));

    await expect(isIpLocked(IP)).rejects.toThrow("PrismaClientKnownRequestError");
  });
});

describe("resetUsername", () => {
  it("targets the HMAC bucket key via deleteMany, never the raw username", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    await resetUsername("alice");

    expect(mocks.deleteMany).toHaveBeenCalledTimes(1);
    const arg = mocks.deleteMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    const expectedKey = deriveBucketKey("username", "alice");

    expect(arg).toEqual({ where: { key: expectedKey } });
    expect(JSON.stringify(arg)).not.toContain("alice");
    expect(arg.where.key).not.toBe("alice");
  });

  it("normalizes the identity before deriving the delete key", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    await resetUsername("  ALICE ");

    const arg = mocks.deleteMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where.key).toBe(deriveBucketKey("username", "alice"));
  });

  it("throws before touching the database when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;

    await expect(resetUsername("alice")).rejects.toThrow(
      "AUTH_SECRET must be set and non-empty to hash login throttle identities.",
    );
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});

describe("concurrency contract (isolation + row locks)", () => {
  it("requests ReadCommitted isolation and relies on row-lock SQL", async () => {
    const { log } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ failures: 0 })],
    );

    expect(log.options).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });

    const insert = log.execute[0];
    const select = log.query[0];
    if (!insert || !select) throw new Error("Expected INSERT and SELECT calls");

    expect(insert.sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(select.sql).toContain("FOR UPDATE");
  });

  it("passes the derived key as a bound parameter rather than interpolating it", async () => {
    const { log } = await runConsume(
      () => consumeUsernameAttempt("alice"),
      [makeRow({ failures: 0 })],
    );

    const key = deriveBucketKey("username", "alice");
    for (const call of [...log.execute, ...log.query]) {
      expect(call.sql).not.toContain(key);
      expect(call.sql).not.toContain("alice");
    }
    expect(log.query[0]?.values).toContain(key);

    // Window length is bound, not inlined, so the DB clock does the math.
    expect(log.query[0]?.values).toContain(WINDOW_SECONDS);
  });
});
