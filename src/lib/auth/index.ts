import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authorizeCredentials } from "@/lib/auth/credentials";
import {
  applyJwtTokenToSession,
  applyRoleToJwtToken,
  applyUserToJwtToken,
} from "@/lib/auth/session-token";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      async profile(profile) {
        // Upsert user on Google login
        const existing = await db.query.users.findFirst({
          where: eq(users.email, profile.email),
        });
        if (existing) {
          if (existing.deletedAt) {
            throw new Error("Account has been deleted.");
          }
          if (!existing.googleId) {
            await db
              .update(users)
              .set({ googleId: profile.sub, avatarUrl: profile.picture })
              .where(eq(users.id, existing.id));
          }
          return { id: existing.id, ...profile };
        }
        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.email,
            googleId: profile.sub,
            name: profile.name,
            avatarUrl: profile.picture,
            emailVerified: new Date(),
          })
          .returning();
        return { id: newUser.id, ...profile };
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        backupCode: { label: "Backup code", type: "text" },
        challengeId: { label: "Challenge", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpToken: { label: "Verification code", type: "text" },
      },
      async authorize(credentials, request) {
        return authorizeCredentials(credentials, request);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      const nextToken = applyUserToJwtToken(token, user, account);
      // Propagate role from DB on login (or use existing role from token on refresh)
      const existingRole = (token as { role?: string }).role;
      if (existingRole) {
        return applyRoleToJwtToken(nextToken, existingRole);
      }
      if (user?.id && typeof user.id === "string") {
        try {
          const [dbUser] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);
          if (dbUser?.role) {
            return applyRoleToJwtToken(nextToken, dbUser.role);
          }
        } catch {
          // Non-critical: role propagation failed, token still valid
        }
      }
      return nextToken;
    },
    async session({ session, token }) {
      return applyJwtTokenToSession(session, token);
    },
  },
});
