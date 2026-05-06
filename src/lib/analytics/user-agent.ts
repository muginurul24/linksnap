export type ParsedUserAgent = {
  browser: string;
  device: "bot" | "desktop" | "mobile" | "tablet" | "unknown";
  os: string;
};

function parseDevice(userAgent: string): ParsedUserAgent["device"] {
  if (/bot|crawler|spider|crawling/i.test(userAgent)) return "bot";
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) {
    return "mobile";
  }
  if (userAgent.trim()) return "desktop";

  return "unknown";
}

function parseBrowser(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\//i.test(userAgent)) return "Opera";
  if (/samsungbrowser/i.test(userAgent)) return "Samsung Internet";
  if (/firefox\//i.test(userAgent)) return "Firefox";
  if (/chrome\//i.test(userAgent) || /crios\//i.test(userAgent)) return "Chrome";
  if (/safari\//i.test(userAgent)) return "Safari";
  if (/bot|crawler|spider|crawling/i.test(userAgent)) return "Bot";

  return "Unknown";
}

function parseOs(userAgent: string): string {
  if (/windows nt/i.test(userAgent)) return "Windows";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/mac os x|macintosh/i.test(userAgent)) return "macOS";
  if (/cros/i.test(userAgent)) return "Chrome OS";
  if (/linux/i.test(userAgent)) return "Linux";

  return "Unknown";
}

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  const value = userAgent ?? "";

  return {
    browser: parseBrowser(value),
    device: parseDevice(value),
    os: parseOs(value),
  };
}
