import { createHmac } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Durable login throttling backed by the `login_attempt` table.
 *
 * A fixed 15 minute window counts reservations/failures per identity bucket.
 * Username buckets are reserved before bcrypt runs; IP buckets record failures
 * after the credential check. Buckets are keyed by HMAC-SHA256(AUTH_SECRET) so
 * the raw username or IP is never persisted.
 *
 * Raw SQL is required here because Prisma's query builder cannot express the
 * atomic primitives this needs:
 *   - `INSERT ... ON DUPLICATE KEY UPDATE` creates the bucket and takes the
 *     row lock in one statement, so concurrent instances cannot both create it.
 *   - `SELECT ... FOR UPDATE` re-reads the committed counter while holding that
 *     row lock, which removes the check-then-increment race. All writes for a
 *     key happen inside the same transaction, so at most `threshold` calls can
 *     be admitted per active window.
 *   - `TIMESTAMPADD(SECOND, n, NOW(3))` and `TIMESTAMPDIFF` keep window/lock
 *     arithmetic in the database clock, avoiding skew between instances.
 * Every value is passed through a Prisma tagged-template placeholder and every
 * identifier is backtick-quoted, so the statements stay injection-safe.
 */

export const WINDOW_MS = 15 * 60 * 1000;
export const USERNAME_THRESHOLD = 5;
export const IP_THRESHOLD = 20;
export const LOCK_BASE_MS = 60 * 1000;
export const LOCK_MAX_MS = 15 * 60 * 1000;

const WINDOW_SECONDS = Math.floor(WINDOW_MS / 1000);
const LOCK_MAX_EXPONENT = Math.max(
  0,
  Math.ceil(Math.log2(LOCK_MAX_MS / LOCK_BASE_MS)),
);

export type BucketKind = "username" | "ip";

export type ThrottleDecision = {
  /** Whether this reservation/failure was accepted. */
  allowed: boolean;
  /** Whether an active lock rejected this call. */
  locked: boolean;
  /** Seconds until the active lock expires; 0 when not locked. */
  retryAfterSeconds: number;
};

type BucketRow = {
  failures: number;
  windowExpired: number | bigint | boolean;
  isLocked: number | bigint | boolean;
  lockRemainingMicros: number | bigint | null;
};

type LockProbeRow = {
  isLocked: number | bigint | boolean;
  lockRemainingMicros: number | bigint | null;
};

/** NFKC-normalizes, trims, and lowercases a username for stable bucket keys. */
export function normalizeUsername(username: string): string {
  if (typeof username !== "string") {
    throw new Error("Username must be a string.");
  }
  return username.normalize("NFKC").trim().toLowerCase();
}

/**
 * Derives the opaque storage key for an identity bucket. Usernames are
 * normalized first so cosmetic variants share one bucket; IPs are trimmed.
 * Throws when AUTH_SECRET is missing/blank or the identity is empty.
 */
export function deriveBucketKey(kind: BucketKind, identity: string): string {
  const normalized =
    kind === "username" ? normalizeUsername(identity) : identity.trim();

  if (normalized === "") {
    throw new Error(`Cannot derive a ${kind} throttle key from an empty identity.`);
  }

  return createHmac("sha256", getAuthSecret())
    .update(`${kind}:${normalized}`)
    .digest("hex");
}

/** Reserves one username attempt before bcrypt. Returns whether to proceed. */
export async function consumeUsernameAttempt(
  normalizedUsername: string,
): Promise<ThrottleDecision> {
  return consumeBucket("username", normalizedUsername, USERNAME_THRESHOLD);
}

/** Records one failed IP attempt after the credential check. */
export async function recordIpFailure(clientIp: string): Promise<ThrottleDecision> {
  return consumeBucket("ip", clientIp, IP_THRESHOLD);
}

/**
 * Read-only probe of the active IP lock for an identity. Used before signIn so
 * a locked client is denied without mutating the bucket or counting a
 * successful attempt. Derives the HMAC bucket key server-side (never the raw
 * IP) and asks the database clock whether the lock is still live. Missing rows,
 * missing locks, and just-expired locks all resolve to an allowed decision.
 * Database/storage errors are left to propagate so callers can fail closed.
 */
export async function isIpLocked(clientIp: string): Promise<ThrottleDecision> {
  const key = deriveBucketKey("ip", clientIp);

  const rows = await prisma.$queryRaw<LockProbeRow[]>`
    SELECT
      (\`lockedUntil\` IS NOT NULL AND \`lockedUntil\` > NOW(3)) AS isLocked,
      TIMESTAMPDIFF(MICROSECOND, NOW(3), \`lockedUntil\`) AS lockRemainingMicros
    FROM \`login_attempt\`
    WHERE \`key\` = ${key}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row || !toBoolean(row.isLocked)) {
    return { allowed: true, locked: false, retryAfterSeconds: 0 };
  }

  const micros =
    row.lockRemainingMicros === null ? 0 : Number(row.lockRemainingMicros);
  return {
    allowed: false,
    locked: true,
    retryAfterSeconds: remainingSeconds(micros),
  };
}

/** Deletes only the username bucket for this identity. IP buckets untouched. */
export async function resetUsername(normalizedUsername: string): Promise<void> {
  const key = deriveBucketKey("username", normalizedUsername);
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error(
      "AUTH_SECRET must be set and non-empty to hash login throttle identities.",
    );
  }
  return secret;
}

function lockDurationSeconds(failures: number, threshold: number): number {
  const exponent = Math.min(
    Math.max(failures - threshold, 0),
    LOCK_MAX_EXPONENT,
  );
  const durationMs = Math.min(LOCK_BASE_MS * 2 ** exponent, LOCK_MAX_MS);
  return Math.ceil(durationMs / 1000);
}

function toBoolean(value: number | bigint | boolean): boolean {
  return Number(value) !== 0;
}

function remainingSeconds(micros: number): number {
  return Math.max(1, Math.ceil(micros / 1_000_000));
}

async function consumeBucket(
  kind: BucketKind,
  identity: string,
  threshold: number,
): Promise<ThrottleDecision> {
  const key = deriveBucketKey(kind, identity);

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        INSERT INTO \`login_attempt\` (\`key\`, \`failures\`, \`windowStart\`, \`lockedUntil\`, \`updatedAt\`)
        VALUES (${key}, 0, NOW(3), NULL, NOW(3))
        ON DUPLICATE KEY UPDATE \`key\` = \`key\`
      `;

      const rows = await tx.$queryRaw<BucketRow[]>`
        SELECT
          \`failures\` AS failures,
          (TIMESTAMPDIFF(SECOND, \`windowStart\`, NOW(3)) >= ${WINDOW_SECONDS}) AS windowExpired,
          (\`lockedUntil\` IS NOT NULL AND \`lockedUntil\` > NOW(3)) AS isLocked,
          TIMESTAMPDIFF(MICROSECOND, NOW(3), \`lockedUntil\`) AS lockRemainingMicros
        FROM \`login_attempt\`
        WHERE \`key\` = ${key}
        FOR UPDATE
      `;

      const row = rows[0];
      if (!row) {
        throw new Error("Login throttle bucket could not be read after upsert.");
      }

      const failures = Number(row.failures);

      if (toBoolean(row.isLocked)) {
        const micros =
          row.lockRemainingMicros === null
            ? 0
            : Number(row.lockRemainingMicros);
        return {
          allowed: false,
          locked: true,
          retryAfterSeconds: remainingSeconds(micros),
        };
      }

      if (toBoolean(row.windowExpired)) {
        await tx.$executeRaw`
          UPDATE \`login_attempt\`
          SET \`failures\` = 1,
              \`windowStart\` = NOW(3),
              \`lockedUntil\` = NULL,
              \`updatedAt\` = NOW(3)
          WHERE \`key\` = ${key}
        `;
        return { allowed: true, locked: false, retryAfterSeconds: 0 };
      }

      // Lock expired but the window is still live: escalate and deny. This
      // keeps admissions capped at `threshold` per window while the lock
      // duration grows 1m, 2m, 4m, 8m, ... capped at 15m.
      if (failures >= threshold) {
        const escalated = failures + 1;
        const lockSeconds = lockDurationSeconds(escalated, threshold);
        await tx.$executeRaw`
          UPDATE \`login_attempt\`
          SET \`failures\` = ${escalated},
              \`lockedUntil\` = TIMESTAMPADD(SECOND, ${lockSeconds}, NOW(3)),
              \`updatedAt\` = NOW(3)
          WHERE \`key\` = ${key}
        `;
        return {
          allowed: false,
          locked: true,
          retryAfterSeconds: lockSeconds,
        };
      }

      const next = failures + 1;
      const lockSeconds =
        next >= threshold ? lockDurationSeconds(next, threshold) : null;

      if (lockSeconds === null) {
        await tx.$executeRaw`
          UPDATE \`login_attempt\`
          SET \`failures\` = ${next}, \`updatedAt\` = NOW(3)
          WHERE \`key\` = ${key}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE \`login_attempt\`
          SET \`failures\` = ${next},
              \`lockedUntil\` = TIMESTAMPADD(SECOND, ${lockSeconds}, NOW(3)),
              \`updatedAt\` = NOW(3)
          WHERE \`key\` = ${key}
        `;
      }

      return { allowed: true, locked: false, retryAfterSeconds: 0 };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
