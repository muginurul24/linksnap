import {
  findSplitTestByLinkId,
  updateSplitTestVariantClickCount,
  type SplitTestVariantRecord,
} from "@/lib/db/queries/split-tests";

export type SplitTestSelection = {
  destinationUrl: string;
  variantId: string;
};

export type SplitTestRedirectResult = SplitTestSelection | null;

export function selectSplitTestVariant(
  variants: SplitTestVariantRecord[],
  random = Math.random(),
): SplitTestVariantRecord | null {
  const weightedVariants = variants.filter((variant) => variant.weight > 0);
  const totalWeight = weightedVariants.reduce(
    (total, variant) => total + variant.weight,
    0,
  );

  if (totalWeight <= 0) return null;

  const target = Math.min(Math.max(random, 0), 0.999999999) * totalWeight;
  let cursor = 0;

  for (const variant of weightedVariants) {
    cursor += variant.weight;
    if (target < cursor) return variant;
  }

  return weightedVariants.at(-1) ?? null;
}

export async function resolveSplitTestRedirect({
  defaultDestinationUrl,
  linkId,
}: {
  defaultDestinationUrl: string;
  linkId: string;
}): Promise<SplitTestRedirectResult> {
  const splitTest = await findSplitTestByLinkId(linkId);
  if (!splitTest?.isActive) return null;

  const variant = selectSplitTestVariant(splitTest.variants);
  if (!variant) return null;

  await updateSplitTestVariantClickCount({
    clickCount: variant.clickCount + 1,
    id: variant.id,
  });

  if (variant.destinationUrl === defaultDestinationUrl) return null;

  return {
    destinationUrl: variant.destinationUrl,
    variantId: variant.id,
  };
}
