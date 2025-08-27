import { describe, it, expect } from "vitest";
import { normalizeEdifactOrders, normalizeX12_850 } from "../core/edi/parser/normalize";

describe("EDI Normalization", () => {
  it("parses EDIFACT ORDERS sample", () => {
    const raw = "UNH+1+ORDERS:D:96A:UN'BGM+220+PO12345+9'DTM+137:20250101:102'NAD+BY+BuyerName'LIN+1++SKU-001:EN'QTY+21:2'PRI+AAA:19.95'";
    const norm = normalizeEdifactOrders(raw);
    expect(norm.poNumber).toBeDefined();
    expect(norm.lines.length).toBeGreaterThan(0);
  });
  it("parses X12 850 sample", () => {
    const raw = "ST*850*0001~BEG*00*SA*PO7890**20250101~CUR*USD~PO1*2*10.00*EA***VP*SKU-001~";
    const norm = normalizeX12_850(raw);
    expect(norm.poNumber).toBe("PO7890");
  });
});
