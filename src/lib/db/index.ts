import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;
const DB_PROXY_DESCRIPTION = "[object LinkSnapDbProxy]";

// Lazy singleton — only connects when actually used, not at build time
let _db: DB | null = null;

export function getDb(): DB {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Convenience alias for most use cases
export const db = new Proxy({} as DB, {
  get(_, prop) {
    if (prop === Symbol.toPrimitive) {
      return () => DB_PROXY_DESCRIPTION;
    }

    if (prop === Symbol.iterator) {
      return function* emptyDbProxyIterator() {
        return;
      };
    }

    if (prop === "toString") {
      return () => DB_PROXY_DESCRIPTION;
    }

    if (prop === "valueOf") {
      return () => DB_PROXY_DESCRIPTION;
    }

    return getDb()[prop as keyof DB];
  },
});
