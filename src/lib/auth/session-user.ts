export type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

export function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}
