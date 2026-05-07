import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  apiKeys,
  campaigns,
  clickEvents,
  linkPages,
  links,
  settings,
  smartRules,
  splitTestVariants,
  splitTests,
  subscriptions,
  transactions,
  users,
} from "../../src/lib/db/schema";

describe("database schema", () => {
  it("should expose required public tables when schema is imported", () => {
    const tableNames = [
      users,
      apiKeys,
      links,
      linkPages,
      smartRules,
      clickEvents,
      campaigns,
      splitTests,
      splitTestVariants,
      subscriptions,
      transactions,
      settings,
    ].map((table) => getTableName(table));

    expect(tableNames).toEqual([
      "users",
      "api_keys",
      "links",
      "link_pages",
      "smart_rules",
      "click_events",
      "campaigns",
      "split_tests",
      "split_test_variants",
      "subscriptions",
      "transactions",
      "settings",
    ]);
  });
});
