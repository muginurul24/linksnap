// Lightweight className merge — avoids clsx/tailwind-merge bundle in RN
export function cn(...inputs: Array<string | boolean | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
