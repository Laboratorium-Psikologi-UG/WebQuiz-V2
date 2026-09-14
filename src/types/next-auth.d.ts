import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      accountId: number;
      username: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId: number;
    username: string;
    role: string;
  }
}
