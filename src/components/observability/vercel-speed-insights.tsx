"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { sanitizeSpeedInsightsEvent } from "@/lib/observability/speed-insights";

export function VercelSpeedInsights() {
  return <SpeedInsights beforeSend={sanitizeSpeedInsightsEvent} />;
}
