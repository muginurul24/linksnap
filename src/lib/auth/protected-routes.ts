const PROTECTED_PREFIXES = [
  "/dashboard",
  "/links",
  "/pages",
  "/qr",
  "/campaigns",
  "/analytics",
  "/settings",
] as const;

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isProtectedPath(pathname: string): boolean {
  const normalized = normalizePath(pathname);

  return PROTECTED_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}
