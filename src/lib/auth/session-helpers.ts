/**
 * Shared session helpers — single source of truth.
 * Extracts getSessionUserId, getSessionRole, getSessionString, and SessionWithUserId.
 *
 * Import path: @/lib/auth/session-helpers
 */

export type SessionWithUserId = {
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
  return typeof (session?.user as Record<string, unknown> | undefined)?.role === "string"
    ? (session!.user as Record<string, unknown>).role as string
    : null;
}

/** Safely extract a string field from a session object (loose accessor). */
export function getSessionString(
  session: SessionWithUserId,
  field: string,
): string | null {
  if (!session?.user) return null;
  const value = (session.user as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}
