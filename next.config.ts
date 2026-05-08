import type { NextConfig } from "next";
import { resolve } from "node:path";
import { staticSecurityHeaders } from "./src/lib/security/headers";

const esToolkitGlobalThisShim = resolve(
  process.cwd(),
  "src/lib/compat/es-toolkit-global-this.ts",
);

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...staticSecurityHeaders],
      },
    ];
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      config.output.globalObject = "globalThis";
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /es-toolkit[\\/]dist[\\/]_internal[\\/]globalThis\.(?:mjs|js)$/,
          esToolkitGlobalThisShim,
        ),
      );
    }

    return config;
  },
};

export default nextConfig;
