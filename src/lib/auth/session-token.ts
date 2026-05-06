import type { Account, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

type LinkSnapJwt = JWT & {
  googleId?: string;
  id?: string;
};

type LinkSnapSessionUser = NonNullable<Session["user"]> & {
  id?: string;
};

export function applyUserToJwtToken(
  token: JWT,
  user?: User | null,
  account?: Account | null,
): JWT {
  const nextToken = token as LinkSnapJwt;

  if (typeof user?.id === "string") {
    nextToken.id = user.id;
  }

  if (account?.provider === "google") {
    nextToken.googleId = account.providerAccountId;
  }

  return nextToken;
}

export function applyJwtTokenToSession(session: Session, token: JWT): Session {
  const linkSnapToken = token as LinkSnapJwt;

  if (session.user && typeof linkSnapToken.id === "string") {
    (session.user as LinkSnapSessionUser).id = linkSnapToken.id;
  }

  return session;
}
