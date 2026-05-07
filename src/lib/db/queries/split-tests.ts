import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { splitTests, splitTestVariants } from "@/lib/db/schema";
import type { UpsertSplitTestInput } from "@/lib/validations/split-test";

export type SplitTestVariantRecord = {
  clickCount: number;
  destinationUrl: string;
  id: string;
  weight: number;
};

export type SplitTestRecord = {
  createdAt: Date;
  id: string;
  isActive: boolean;
  linkId: string;
  variants: SplitTestVariantRecord[];
};

type UpsertSplitTestRecordInput = UpsertSplitTestInput & {
  linkId: string;
};

const splitTestColumns = {
  createdAt: splitTests.createdAt,
  id: splitTests.id,
  isActive: splitTests.isActive,
  linkId: splitTests.linkId,
};

const splitTestVariantColumns = {
  clickCount: splitTestVariants.clickCount,
  destinationUrl: splitTestVariants.destinationUrl,
  id: splitTestVariants.id,
  weight: splitTestVariants.weight,
};

export async function findSplitTestByLinkId(
  linkId: string,
): Promise<SplitTestRecord | null> {
  const splitTest = await db.query.splitTests.findFirst({
    columns: {
      createdAt: true,
      id: true,
      isActive: true,
      linkId: true,
    },
    where: eq(splitTests.linkId, linkId),
  });

  if (!splitTest) return null;

  const variants = await db
    .select(splitTestVariantColumns)
    .from(splitTestVariants)
    .where(eq(splitTestVariants.splitTestId, splitTest.id))
    .orderBy(asc(splitTestVariants.id));

  return {
    ...splitTest,
    variants,
  };
}

export async function upsertSplitTestForLink({
  linkId,
  variants,
}: UpsertSplitTestRecordInput): Promise<SplitTestRecord> {
  const [splitTest] = await db
    .insert(splitTests)
    .values({ isActive: true, linkId })
    .onConflictDoUpdate({
      target: splitTests.linkId,
      set: { isActive: true },
    })
    .returning(splitTestColumns);

  if (!splitTest) throw new Error("Unable to upsert split test.");

  await db
    .delete(splitTestVariants)
    .where(eq(splitTestVariants.splitTestId, splitTest.id));

  await db.insert(splitTestVariants).values(
    variants.map((variant) => ({
      destinationUrl: variant.destinationUrl,
      splitTestId: splitTest.id,
      weight: variant.weight,
    })),
  );

  const saved = await findSplitTestByLinkId(linkId);
  if (!saved) throw new Error("Unable to load saved split test.");

  return saved;
}

export async function deleteSplitTestForLink(
  linkId: string,
): Promise<{ id: string } | null> {
  const [splitTest] = await db
    .delete(splitTests)
    .where(eq(splitTests.linkId, linkId))
    .returning({ id: splitTests.id });

  return splitTest ?? null;
}
