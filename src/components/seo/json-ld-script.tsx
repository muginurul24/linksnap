import { serializeJsonLd } from "@/lib/seo/metadata";

export function JsonLdScript({
  nonce,
  value,
}: {
  nonce?: string;
  value: unknown;
}) {
  return (
    <script nonce={nonce} suppressHydrationWarning type="application/ld+json">
      {serializeJsonLd(value)}
    </script>
  );
}
