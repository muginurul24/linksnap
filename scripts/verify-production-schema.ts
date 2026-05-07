import { loadEnvConfig } from "@next/env";
import { db } from "@/lib/db";
import { apiKeys, resetTokens, users } from "@/lib/db/schema";

loadEnvConfig(process.cwd());

async function verifyProductionSchema() {
  await db
    .select({
      deletedAt: users.deletedAt,
      notifications: users.notifications,
      twoFactorEnabled: users.twoFactorEnabled,
      twoFactorSecret: users.twoFactorSecret,
    })
    .from(users)
    .limit(0);

  await db.select({ id: resetTokens.id }).from(resetTokens).limit(0);
  await db.select({ id: apiKeys.id }).from(apiKeys).limit(0);
}

verifyProductionSchema()
  .then(() => {
    console.log("Production schema verification passed.");
  })
  .catch((error) => {
    console.error("Production schema verification failed.", error);
    process.exitCode = 1;
  });
