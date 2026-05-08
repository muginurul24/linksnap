/**
 * Seed script: Promote a user to superadmin.
 *
 * Usage: bun run scripts/seed-superadmin.ts --email=iqooz9xmg@gmail.com
 *
 * This is the ONLY way to assign the superadmin role.
 * It cannot be done through any API endpoint.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, SUPERADMIN_ROLE } from "@/lib/db/schema";
import { logger } from "@/lib/observability/logger";

function parseEmailArg(): string {
  const emailArg = process.argv.find((arg) => arg.startsWith("--email="));
  if (!emailArg) return "iqooz9xmg@gmail.com";
  return emailArg.split("=")[1].trim().toLowerCase();
}

async function main() {
  const email = parseEmailArg();
  const db = getDb();

  const [user] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.error(`Error: User with email "${email}" not found.`);
    logger.error("seed_superadmin_user_not_found", { email });
    process.exit(1);
  }

  if (user.role === SUPERADMIN_ROLE) {
    console.log(`User ${user.email} is already superadmin — nothing to do.`);
    logger.info("seed_superadmin_already_superadmin", { userId: user.id, email });
    process.exit(0);
  }

  await db
    .update(users)
    .set({ role: SUPERADMIN_ROLE })
    .where(eq(users.id, user.id));

  console.log(`✅ User ${user.email} (${user.id}) is now superadmin.`);
  logger.info("seed_superadmin_promoted", { userId: user.id, email, previousRole: user.role });
}

main().catch((err) => {
  console.error("Seed failed:", err);
  logger.error("seed_superadmin_unexpected_error", { error: err });
  process.exit(1);
});
