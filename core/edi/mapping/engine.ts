/**
 * Template + overrides mapping engine. The template defines extraction paths; overrides
 * allow per-partner field tweaks (constants, transforms).
 */
import { NormalizedOrder } from "../parser/normalize";

export type Template = {
  // simple structure; real-life can be extended.
  type: "ORDERS" | "X12_850" | "DESADV" | "X12_856";
  fields?: Record<string, any>;
};

export function applyOverrides<T extends object>(base: T, overrides: Record<string, any>): T {
  const out: any = JSON.parse(JSON.stringify(base));
  for (const [k, v] of Object.entries(overrides || {})) {
    // dot-path set
    const parts = k.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur) || typeof cur[p] !== "object") cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = v;
  }
  return out as T;
}

export function orderToShopifyDraft(order: NormalizedOrder) {
  return {
    input: {
      note: `PO ${order.poNumber}`,
      lineItems: order.lines.map(l => ({
        variantId: null, // resolved later by SKU lookup
        sku: l.sku,
        quantity: l.qty,
        originalUnitPrice: l.price ?? undefined,
        custom: !l.sku,
        title: l.sku ? undefined : (l.description || "Custom line"),
      })),
      currencyCode: order.currency || "EUR",
      useCustomerDefaultAddress: true,
    }
  };
}

export function fulfillmentToDesadv(fulfillment: any) {
  // Very simplified DESADV (EDIFACT) string builder
  const now = new Date();
  const header = [
    "UNH+1+DESADV:D:96A:UN'",
    "BGM+351+1+9'",
    `DTM+137:${now.toISOString().replace(/[-:]/g,'').slice(0,8)}:102'`
  ].join("");
  const lines = (fulfillment?.line_items || []).map((l: any, idx: number) => {
    return `LIN+${idx+1}++${l.sku}:EN'QTY+12:${l.quantity}'`;
  }).join("");
  const footer = "UNT+0+1'";
  return header + lines + footer;
}
