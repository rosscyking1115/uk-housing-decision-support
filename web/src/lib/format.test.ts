import { describe, expect, it } from "vitest";
import { salePriceEvidence } from "./format";

describe("sale-price evidence", () => {
  it("does not present a price context when no sales matched", () => {
    expect(salePriceEvidence(0, 2025, "none")).toBe("No matched sales");
  });

  it("labels a below-threshold sample as indicative", () => {
    expect(salePriceEvidence(2, 2025, "indicative")).toBe(
      "2 matched sales in 2025; indicative",
    );
  });

  it("labels a threshold-sized sample as reliable", () => {
    expect(salePriceEvidence(5, 2025, "reliable")).toBe(
      "5 matched sales in 2025; reliable",
    );
  });

  it("does not invent a period when the reference year is absent", () => {
    expect(salePriceEvidence(5, null, "reliable")).toBe(
      "5 matched sales; reliable",
    );
  });
});
