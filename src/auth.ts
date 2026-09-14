import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

const ACTIVE_STATUS = "aktif";

type AppUser = User & {
  accountId: number;
  username: string;
  role: string;
};

type AppToken = {
  accountId: number;
  username: string;
  role: string;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: "ACCOUNT",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username =
          typeof credentials?.username === "string" ? credentials.username : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!username || !password) return null;

        const account = await prisma.account.findUnique({
          where: { username },
          include: { role: true },
        });

        if (!account) return null;
        if (account.status.toLowerCase() !== ACTIVE_STATUS) return null;

        const passwordMatches = await compare(password, account.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: String(account.id),
          name: account.username,
          accountId: account.id,
          username: account.username,
          role: account.role.name,
        } as AppUser;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as AppUser;
        token.accountId = u.accountId;
        token.username = u.username;
        token.role = u.role;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as AppToken;
      if (session.user) {
        session.user.accountId = t.accountId;
        session.user.username = t.username;
        session.user.role = t.role;
      }
      return session;
    },
  },
});
