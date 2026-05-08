import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sanitizeSpeedInsightsEvent } from "@/lib/observability/speed-insights";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Vercel Speed Insights integration", () => {
  it("should mount Speed Insights once from the root layout", () => {
    const layout = readSource("src/app/layout.tsx");
    const component = readSource(
      "src/components/observability/vercel-speed-insights.tsx",
    );

    expect(component).toContain(
      'import { SpeedInsights } from "@vercel/speed-insights/next";',
    );
    expect(layout.match(/<VercelSpeedInsights \/>/g)).toHaveLength(1);
    expect(component.match(/<SpeedInsights /g)).toHaveLength(1);
  });

  it("should remove query strings and hashes before sending vitals", () => {
    expect(
      sanitizeSpeedInsightsEvent({
        type: "vital",
        url: "https://www.justqiu.cloud/verify?email=user@example.com#otp",
        route: "/verify",
      }),
    ).toEqual({
      type: "vital",
      url: "https://www.justqiu.cloud/verify",
      route: "/verify",
    });
  });

  it("should prefer route templates over concrete dynamic URL segments", () => {
    expect(
      sanitizeSpeedInsightsEvent({
        type: "vital",
        url: "https://www.justqiu.cloud/admin/users/user_123?tab=security",
        route: "/admin/users/[id]",
      }).url,
    ).toBe("https://www.justqiu.cloud/admin/users/[id]");
  });
});
