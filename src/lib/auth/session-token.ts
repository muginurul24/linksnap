import type { Account, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

type LinkSnapJwt = JWT & {
  googleId?: string;
  id?: string;
  role?: string;
};

type LinkSnapSessionUser = NonNullable<Session["user"]> & {
  id?: string;
  role?: string;
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

export function applyRoleToJwtToken(token: JWT, role: string): JWT {
  (token as LinkSnapJwt).role = role;
  return token;
}

export function applyJwtTokenToSession(session: Session, token: JWT): Session {
  const linkSnapToken = token as LinkSnapJwt;

  if (session.user && typeof linkSnapToken.id === "string") {
    const sessionUser = session.user as LinkSnapSessionUser;
    sessionUser.id = linkSnapToken.id;
    if (linkSnapToken.role) {
      sessionUser.role = linkSnapToken.role;
    }
  }

  return session;
}
