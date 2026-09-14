import type { NextAuthConfig, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

type Callbacks = NonNullable<NextAuthConfig["callbacks"]>;

type AppUser = User & {
  accountId: number;
  username: string;
  role: string;
};

export const jwtCallback: NonNullable<Callbacks["jwt"]> = ({ token, user }) => {
  if (user) {
    const u = user as AppUser;
    token.accountId = u.accountId;
    token.username = u.username;
    token.role = u.role;
  }
  return token;
};

export const sessionCallback: NonNullable<Callbacks["session"]> = ({
  session,
  token,
}) => {
  const t = token as JWT;
  if (session.user) {
    session.user.accountId = t.accountId;
    session.user.username = t.username;
    session.user.role = t.role;
  }
  return session;
};
