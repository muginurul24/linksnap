import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

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
    return getDb()[prop as keyof DB];
  },
});
