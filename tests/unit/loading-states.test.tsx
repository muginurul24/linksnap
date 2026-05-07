import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DashboardOverviewSkeleton,
  TableSkeleton,
} from "@/components/dashboard/loading-states";

function countOccurrences(value: string, pattern: string): number {
  return value.split(pattern).length - 1;
}

describe("dashboard loading states", () => {
  it("should render dashboard skeleton with stats charts and recent table", () => {
    const markup = renderToStaticMarkup(<DashboardOverviewSkeleton />);

    expect(countOccurrences(markup, 'data-slot="card"')).toBeGreaterThanOrEqual(7);
    expect(countOccurrences(markup, 'data-slot="table-row"')).toBeGreaterThanOrEqual(6);
  });

  it("should render table skeleton with configured rows and columns", () => {
    const markup = renderToStaticMarkup(<TableSkeleton columns={3} rows={2} />);

    expect(countOccurrences(markup, 'data-slot="table-head"')).toBe(3);
    expect(countOccurrences(markup, 'data-slot="table-cell"')).toBe(6);
  });
});
