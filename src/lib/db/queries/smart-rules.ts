import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smartRules } from "@/lib/db/schema";
import type { SmartRuleInput } from "@/lib/validations/smart-rule";

export type SmartRuleRecord = {
  condition: unknown;
  destinationUrl: string;
  id: string;
  linkId: string;
  priority: number;
  type: typeof smartRules.$inferSelect["type"];
};

type ReplaceSmartRulesInput = {
  linkId: string;
  rules: SmartRuleInput[];
};

type DeleteSmartRuleInput = {
  linkId: string;
  ruleId: string;
};

const smartRuleColumns = {
  condition: smartRules.condition,
  destinationUrl: smartRules.destinationUrl,
  id: smartRules.id,
  linkId: smartRules.linkId,
  priority: smartRules.priority,
  type: smartRules.type,
};

export async function listSmartRulesByLinkId(
  linkId: string,
): Promise<SmartRuleRecord[]> {
  return db
    .select(smartRuleColumns)
    .from(smartRules)
    .where(eq(smartRules.linkId, linkId))
    .orderBy(asc(smartRules.priority));
}

export async function replaceSmartRulesForLink({
  linkId,
  rules,
}: ReplaceSmartRulesInput): Promise<SmartRuleRecord[]> {
  return db.transaction(async (tx) => {
    await tx.delete(smartRules).where(eq(smartRules.linkId, linkId));

    if (rules.length === 0) return [];

    return tx
      .insert(smartRules)
      .values(
        rules.map((rule) => ({
          condition: rule.condition,
          destinationUrl: rule.destinationUrl,
          linkId,
          priority: rule.priority,
          type: rule.type,
        })),
      )
      .returning(smartRuleColumns);
  });
}

export async function deleteSmartRuleForLink({
  linkId,
  ruleId,
}: DeleteSmartRuleInput): Promise<{ id: string } | null> {
  const [rule] = await db
    .delete(smartRules)
    .where(and(eq(smartRules.linkId, linkId), eq(smartRules.id, ruleId)))
    .returning({ id: smartRules.id });

  return rule ?? null;
}
