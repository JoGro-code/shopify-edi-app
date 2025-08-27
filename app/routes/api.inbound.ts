import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { queue, jobOptions } from "../../worker/queue";

const prisma = new PrismaClient();

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const partnerId = url.searchParams.get("partnerId");
  if (!partnerId) return json({ error: "partnerId is required" }, { status: 400 });
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) return json({ error: "partner not found" }, { status: 404 });

  const raw = await request.text();
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  const docType = raw.includes("ORDERS")
    ? "ORDERS"
    : (raw.includes("ST*850") || raw.includes("850~") || raw.includes("~850~"))
      ? "X12_850"
      : "UNKNOWN";
  if (docType === "UNKNOWN") return json({ error: "Unsupported EDI type" }, { status: 400 });

  const dupe = await prisma.document.findFirst({ where: { hash } });
  if (dupe) return json({ ok: true, dedupedId: dupe.id });

  const tenantId = partner.tenantId;
  const doc = await prisma.document.create({
    data: {
      tenantId,
      partnerId,
      direction: "INBOUND",
      docType,
      status: "RECEIVED",
      payload: { raw },
      hash
    }
  });

  // Enqueue order creation; the worker will resolve shop + offline token from tenant/session storage
  await queue.add("SHOPIFY_CREATE_ORDER", { documentId: doc.id, tenantId }, jobOptions());

  return json({ ok: true, id: doc.id });
};
