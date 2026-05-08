import { SUPERADMIN_ROLE } from "@/lib/db/schema";

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === SUPERADMIN_ROLE;
}
