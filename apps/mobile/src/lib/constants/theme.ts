export const colors = {
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
  semantic: {
    success: "#22C55E",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",
  },
  glass: {
    light: "rgba(255,255,255,0.05)",
    medium: "rgba(255,255,255,0.08)",
    heavy: "rgba(255,255,255,0.12)",
  },
} as const;

export const spacing = {
  screenX: 20,
  card: 20,
  gapSm: 12,
  gapMd: 16,
  gapLg: 24,
  radiusCard: 16,
  radiusButton: 12,
  radiusInput: 12,
  maxContentWidth: 480,
} as const;

export const typography = {
  display: "text-display font-extrabold tracking-tight text-content-primary",
  h1: "text-h1 font-bold tracking-tight text-content-primary",
  h2: "text-h2 font-semibold text-content-primary",
  h3: "text-h3 font-semibold text-content-primary",
  bodyLg: "text-body-lg leading-6 text-content-primary",
  body: "text-body leading-5 text-content-secondary",
  caption: "text-caption font-medium tracking-wide text-content-tertiary uppercase",
  label: "text-label font-semibold text-content-secondary",
} as const;

export const animation = {
  listDelayMs: 50,
  screenFadeMs: 300,
  spring: {
    damping: 15,
    stiffness: 150,
  },
  sheetSpring: {
    damping: 20,
    stiffness: 200,
  },
} as const;
