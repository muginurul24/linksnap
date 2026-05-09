import { describe, expect, it } from "vitest";
import {
  sortQrCodeLinks,
  type ListedQrCodeLink,
} from "../../src/lib/db/queries/links";

function makeQrCodeLink(
  overrides: Pick<ListedQrCodeLink, "id" | "slug"> & Partial<ListedQrCodeLink>,
): ListedQrCodeLink {
  const { id, slug, ...rest } = overrides;
  const createdAt = overrides.createdAt ?? new Date("2026-05-01T00:00:00Z");

  return {
    campaignId: null,
    clickCount: 0,
    createdAt,
    destinationUrl: `https://example.com/${slug}`,
    hasLinkPage: false,
    id,
    isActive: true,
    lastScanAt: null,
    qrScanCount: 0,
    qrScansLast30Days: 0,
    slug,
    title: null,
    updatedAt: createdAt,
    ...rest,
  };
}

describe("QR code list helpers", () => {
  it("should sort QR code links by created date when recently-created is selected", () => {
    const older = makeQrCodeLink({
      createdAt: new Date("2026-05-01T00:00:00Z"),
      id: "older",
      slug: "older",
    });
    const newer = makeQrCodeLink({
      createdAt: new Date("2026-05-03T00:00:00Z"),
      id: "newer",
      slug: "newer",
    });

    expect(sortQrCodeLinks([older, newer], "recently-created").map((link) => link.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("should sort QR code links by total and recent scans when most-scanned is selected", () => {
    const newest = makeQrCodeLink({
      createdAt: new Date("2026-05-04T00:00:00Z"),
      id: "newest",
      qrScanCount: 2,
      qrScansLast30Days: 2,
      slug: "newest",
    });
    const strongestRecent = makeQrCodeLink({
      createdAt: new Date("2026-05-01T00:00:00Z"),
      id: "strongest-recent",
      qrScanCount: 7,
      qrScansLast30Days: 5,
      slug: "strongest-recent",
    });
    const strongestTotal = makeQrCodeLink({
      createdAt: new Date("2026-05-02T00:00:00Z"),
      id: "strongest-total",
      qrScanCount: 7,
      qrScansLast30Days: 2,
      slug: "strongest-total",
    });

    expect(
      sortQrCodeLinks([newest, strongestTotal, strongestRecent], "most-scanned").map(
        (link) => link.id,
      ),
    ).toEqual(["strongest-recent", "strongest-total", "newest"]);
  });

  it("should keep original QR code link array unchanged when sorting", () => {
    const first = makeQrCodeLink({ id: "first", qrScanCount: 1, slug: "first" });
    const second = makeQrCodeLink({ id: "second", qrScanCount: 4, slug: "second" });
    const items = [first, second];

    expect(sortQrCodeLinks(items, "most-scanned").map((link) => link.id)).toEqual([
      "second",
      "first",
    ]);
    expect(items.map((link) => link.id)).toEqual(["first", "second"]);
  });
});
