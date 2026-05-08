import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";

describe("DropdownMenuLabel", () => {
  it("should render outside a Base UI menu group without throwing", () => {
    expect(() =>
      renderToStaticMarkup(<DropdownMenuLabel>My Account</DropdownMenuLabel>),
    ).not.toThrow();
  });
});
