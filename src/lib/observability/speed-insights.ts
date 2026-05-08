export type SpeedInsightsEvent = {
  type: "vital";
  url: string;
  route?: string;
};

export function sanitizeSpeedInsightsEvent<T extends SpeedInsightsEvent>(
  event: T,
): T {
  try {
    const url = new URL(event.url);

    if (event.route?.startsWith("/")) {
      url.pathname = event.route;
    }

    url.search = "";
    url.hash = "";

    return {
      ...event,
      url: url.toString(),
    };
  } catch {
    return event;
  }
}
