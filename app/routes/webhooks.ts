import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { fulfillmentToDesadv } from "../core/edi/mapping/engine";
import { queue, jobOptions } from "../worker/queue";

const prisma = new PrismaClient();

function verifyHmac(body: string, header?: string | null) {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  const gen = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return gen === header;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const raw = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  if (!verifyHmac(raw, hmac)) return json({ error: "HMAC verification failed" }, { status: 401 });

  const topic = request.headers.get("X-Shopify-Topic") || "";
  const shop = request.headers.get("X-Shopify-Shop-Domain") || "";

  const payload = JSON.parse(raw);
  if (topic === "fulfillments/create" || topic === "fulfillment_events/create") {
    const desadv = fulfillmentToDesadv(payload);
    const tenantId = (await prisma.tenant.findFirst())!.id;
    const doc = await prisma.document.create({
      data: {
        tenantId, direction: "OUTBOUND", docType: "DESADV", status: "VALIDATED",
        outPayload: desadv, correlation: String(payload?.id || payload?.name || Date.now())
      }
    });
    // Lookup partner & outbound config: simplified here
    const outboundCfg = (await prisma.partner.findFirst())?.outbound || { type: "https", endpoint: "https://httpbin.org/post" };
    await queue.add("SEND_DESADV", { documentId: doc.id, outboundCfg }, jobOptions());
  }

  return json({ ok: true });
};
