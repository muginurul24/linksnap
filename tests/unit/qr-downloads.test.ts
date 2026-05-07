import { describe, expect, it } from "vitest";
import {
  getQrDownloadFilename,
  getQrDownloadHref,
} from "../../src/lib/qr/downloads";

describe("QR downloads", () => {
  it("should build PNG and SVG download targets for a slug", () => {
    expect(getQrDownloadHref("promo", "png")).toBe(
      "/api/v1/qr/promo?format=png",
    );
    expect(getQrDownloadHref("promo", "svg")).toBe(
      "/api/v1/qr/promo?format=svg",
    );
    expect(getQrDownloadFilename("promo", "png")).toBe("promo.png");
    expect(getQrDownloadFilename("promo", "svg")).toBe("promo.svg");
  });
});
