import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/superadmin-utils";

export { isSuperAdmin } from "@/lib/auth/superadmin-utils";

type SuperadminSession = {
  user?: {
    id?: unknown;
    role?: unknown;
  } | null;
};

function getSessionRole(session: SuperadminSession | null): string | null {
  return typeof session?.user?.role === "string" ? session.user.role : null;
}

function getSessionUserId(session: SuperadminSession | null): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

export type RequireSuperAdminResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireSuperAdmin(): Promise<RequireSuperAdminResult> {
  try {
    const session = await auth();
    const userId = getSessionUserId(session ?? null);
    const role = getSessionRole(session ?? null);

    if (!userId) {
      return { ok: false, status: 401, message: "Login required" };
    }

    if (!isSuperAdmin(role)) {
      return { ok: false, status: 403, message: "Superadmin access required" };
    }

    return { ok: true, userId };
  } catch {
    return { ok: false, status: 401, message: "Authentication failed" };
  }
}
