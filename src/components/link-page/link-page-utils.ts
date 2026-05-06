const DEFAULT_CTA_COLOR = "#6366f1";
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function getSafeHexColor(value: string | null | undefined): string {
  return value && HEX_COLOR_PATTERN.test(value) ? value : DEFAULT_CTA_COLOR;
}

export function getReadableTextColor(hexColor: string): "#111827" | "#ffffff" {
  const safeColor = getSafeHexColor(hexColor).replace("#", "");
  const value = Number.parseInt(safeColor, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111827" : "#ffffff";
}

export function formatClickCount(clickCount: number): string {
  const count = Math.max(0, clickCount);
  const formatted = new Intl.NumberFormat("en").format(count);
  const noun = count === 1 ? "person" : "people";

  return `${formatted} ${noun} clicked this link`;
}
