import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("production build configuration", () => {
  it("should keep Vercel on the same webpack build command as CI", () => {
    const vercelConfig = JSON.parse(readSource("vercel.json")) as {
      buildCommand?: string;
    };
    const packageJson = JSON.parse(readSource("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.build).toBe("next build --webpack");
    expect(vercelConfig.buildCommand).toBe("bun run build");
  });

  it("should keep the CSP-safe es-toolkit shim on the webpack build path", () => {
    const nextConfig = readSource("next.config.ts");

    expect(nextConfig).toContain("webpack(config, { isServer, webpack })");
    expect(nextConfig).toContain("NormalModuleReplacementPlugin");
    expect(nextConfig).toContain("esToolkitGlobalThisShim");
  });
});
