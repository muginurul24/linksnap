import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0A0A0B",
          50: "#09090B",
          100: "#131316",
          200: "#1A1A1F",
          300: "#27272D",
        },
        accent: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#92400E",
        },
        content: {
          primary: "#FAFAFA",
          secondary: "#A1A1AA",
          tertiary: "#71717A",
          inverse: "#09090B",
        },
        success: "#22C55E",
        error: "#EF4444",
        warning: "#F59E0B",
        info: "#3B82F6",
        glass: {
          light: "rgba(255,255,255,0.05)",
          medium: "rgba(255,255,255,0.08)",
          heavy: "rgba(255,255,255,0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
        extrabold: ["Inter_800ExtraBold"],
      },
      fontSize: {
        display: ["44px", { lineHeight: "52px", fontWeight: "800", letterSpacing: "-0.5px" }],
        h1: ["30px", { lineHeight: "38px", fontWeight: "700", letterSpacing: "-0.3px" }],
        h2: ["24px", { lineHeight: "32px", fontWeight: "600" }],
        h3: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "500", letterSpacing: "0.5px" }],
        label: ["13px", { lineHeight: "18px", fontWeight: "600" }],
      },
      boxShadow: {
        accent: "0 16px 32px rgba(245, 158, 11, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
