import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  filterCountries,
  getCountryByCode,
  getCountryFlagEmoji,
  getNextCountryIndex,
} from "../../src/lib/countries";

describe("country combobox helpers", () => {
  it("should expose ISO country data with names, codes, and flag emoji", () => {
    const indonesia = getCountryByCode("ID");

    expect(COUNTRIES.length).toBeGreaterThan(200);
    expect(indonesia).toMatchObject({
      code: "ID",
      flag: "🇮🇩",
      name: "Indonesia",
    });
  });

  it("should filter countries by name or code", () => {
    expect(filterCountries("indo").map((country) => country.code)).toContain("ID");
    expect(filterCountries("sg").map((country) => country.code)).toEqual(["SG"]);
  });

  it("should return an empty list when no country matches the query", () => {
    expect(filterCountries("not-a-country-name")).toEqual([]);
  });

  it("should normalize selected country codes before lookup", () => {
    expect(getCountryByCode(" id ")?.name).toBe("Indonesia");
  });

  it("should generate flag emoji from alpha-2 country codes", () => {
    expect(getCountryFlagEmoji("US")).toBe("🇺🇸");
    expect(getCountryFlagEmoji("bad")).toBe("");
  });

  it("should move keyboard focus with wraparound semantics", () => {
    expect(
      getNextCountryIndex({ currentIndex: -1, direction: "next", total: 3 }),
    ).toBe(0);
    expect(
      getNextCountryIndex({ currentIndex: 2, direction: "next", total: 3 }),
    ).toBe(0);
    expect(
      getNextCountryIndex({ currentIndex: 0, direction: "previous", total: 3 }),
    ).toBe(2);
    expect(
      getNextCountryIndex({ currentIndex: 0, direction: "next", total: 0 }),
    ).toBe(-1);
  });
});
