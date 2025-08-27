import { z } from "zod";
import { parseEdifact, edifactIndex } from "./edifact";
import { parseX12, x12Index } from "./x12";

export const NormalizedOrderSchema = z.object({
  poNumber: z.string(),
  currency: z.string().default("EUR"),
  buyer: z.object({
    name: z.string().optional(),
  }).optional(),
  shipping: z.object({
    name: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  lines: z.array(z.object({
    sku: z.string().optional(),
    description: z.string().optional(),
    qty: z.number().int().positive(),
    price: z.number().nonnegative().optional(),
  })).min(1),
});

export type NormalizedOrder = z.infer<typeof NormalizedOrderSchema>;

export function normalizeEdifactOrders(raw: string): NormalizedOrder {
  const segs = parseEdifact(raw);
  const idx = edifactIndex(segs);
  const po = (idx["BGM"]?.[0]?.elements[1]) || (idx["BGM"]?.[0]?.elements[0]) || "UNKNOWN";
  const currency = idx["CUX"]?.[0]?.elements?.[0]?.split(":")?.[1] || "EUR";
  const name = idx["NAD"]?.find(s => s.elements[0].startsWith("BY"))?.elements?.[1]?.split(":")?.[0];
  const lines = (idx["LIN"] || []).map((lin, i) => {
    const sku = lin.elements?.[1]?.split(":")?.[0];
    const qtySeg = (idx["QTY"] || [])[i];
    const priceSeg = (idx["PRI"] || [])[i];
    const qty = Number(qtySeg?.elements?.[0]?.split(":")?.[1] || "1");
    const price = Number(priceSeg?.elements?.[0]?.split(":")?.1 || 0);
    return { sku, qty, price };
  }).filter(l => l.qty > 0);

  const parsed = NormalizedOrderSchema.safeParse({
    poNumber: po,
    currency,
    buyer: { name },
    lines
  });

  if (!parsed.success) {
    const err = parsed.error.flatten();
    throw new Error("Validation failed: " + JSON.stringify(err));
  }
  return parsed.data;
}

export function normalizeX12_850(raw: string): NormalizedOrder {
  const segs = parseX12(raw);
  const idx = x12Index(segs);
  const po = idx["BEG"]?.[0]?.elements?.[2] || "UNKNOWN";
  const currency = idx["CUR"]?.[0]?.elements?.[0] || "USD";
  const lines = (idx["PO1"] || []).map(row => ({
    sku: row.elements?.[6],
    qty: Number(row.elements?.[0] || "1"),
    price: Number(row.elements?.[2] || "0"),
  }));

  const parsed = NormalizedOrderSchema.safeParse({
    poNumber: po,
    currency,
    lines
  });

  if (!parsed.success) {
    throw new Error("Validation failed: " + JSON.stringify(parsed.error.flatten()));
  }
  return parsed.data;
}
