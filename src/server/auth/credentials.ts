import type { User } from "next-auth";
import { compare } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const ACTIVE_STATUS = "aktif";

const DUMMY_PASSWORD_HASH =
  "$2b$10$cj9srmCaQb8C0Onsz1weZOoWE/iC8AKJMyWHGiQtY8wOjZqU.PpQS";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type AuthorizedUser = User & {
  accountId: number;
  username: string;
  role: string;
};

export async function authorizeCredentials(
  credentials: unknown,
): Promise<AuthorizedUser | null> {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { username, password } = parsed.data;

  const account = await prisma.account.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      status: true,
      role: { select: { name: true } },
    },
  });

  if (!account || account.status.toLowerCase() !== ACTIVE_STATUS) {
    await compare(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const passwordMatches = await compare(password, account.passwordHash);
  if (!passwordMatches) return null;

  return {
    id: String(account.id),
    name: account.username,
    accountId: account.id,
    username: account.username,
    role: account.role.name,
  } as AuthorizedUser;
}
