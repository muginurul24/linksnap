import { UAParser } from "ua-parser-js";

export type DeviceType = "bot" | "desktop" | "mobile" | "tablet" | "unknown";

export type DeviceDetectionResult = {
  browser: string;
  device: DeviceType;
  os: string;
};

const BOT_USER_AGENT_PATTERN = /bot|crawler|spider|crawling|slurp|bingpreview/i;

function normalizeDeviceType(
  userAgent: string,
  deviceType: string | undefined,
): DeviceType {
  if (BOT_USER_AGENT_PATTERN.test(userAgent)) return "bot";
  if (deviceType === "mobile") return "mobile";
  if (deviceType === "tablet") return "tablet";
  if (userAgent.trim()) return "desktop";

  return "unknown";
}

function normalizeBrowserName(
  userAgent: string,
  browserName: string | undefined,
): string {
  if (BOT_USER_AGENT_PATTERN.test(userAgent)) return "Bot";
  if (!browserName) return "Unknown";
  if (browserName === "Mobile Safari") return "Safari";
  if (browserName === "Chrome WebView") return "Chrome";
  if (browserName === "Microsoft Edge") return "Edge";

  return browserName;
}

function normalizeOsName(osName: string | undefined): string {
  if (!osName) return "Unknown";
  if (osName === "Mac OS") return "macOS";
  if (osName === "Chromium OS") return "Chrome OS";

  return osName;
}

export function detectDevice(userAgent: string | null): DeviceDetectionResult {
  const value = userAgent ?? "";
  const parsed = new UAParser(value).getResult();

  return {
    browser: normalizeBrowserName(value, parsed.browser.name),
    device: normalizeDeviceType(value, parsed.device.type),
    os: normalizeOsName(parsed.os.name),
  };
}
