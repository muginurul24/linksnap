/**
 * Shared session helpers — single source of truth.
 * Extracts getSessionUserId, getSessionRole, getSessionString, and SessionWithUserId.
 *
 * Import path: @/lib/auth/session-helpers
 */

export type SessionWithUserId = {
  expires?: unknown;
  user?: {
    id?: unknown;
  } | null;
} | null;

export type SessionWithRole = {
  user?: {
    id?: unknown;
    role?: unknown;
  } | null;
} | null;

/** Safely extract the user id from a session object. */
export function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

/** Safely extract the user role from a session object (loose accessor). */
export function getSessionRole(session: SessionWithUserId): string | null {
  if (!session?.user) return null;

  const value = Reflect.get(session.user, "role");
  return typeof value === "string" ? value : null;
}

/** Safely extract a string field from a session object (loose accessor). */
export function getSessionString(
  session: SessionWithUserId,
  field: string,
): string | null {
  if (!session) return null;

  const userValue = session.user ? Reflect.get(session.user, field) : null;
  if (typeof userValue === "string") return userValue;

  const sessionValue = Reflect.get(session, field);
  return typeof sessionValue === "string" ? sessionValue : null;
}
