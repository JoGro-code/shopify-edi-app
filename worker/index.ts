import { Worker } from "bullmq";
import IORedis from "ioredis";
import { queueName } from "./queue";
import { PrismaClient } from "@prisma/client";
import { normalizeEdifactOrders, normalizeX12_850 } from "../core/edi/parser/normalize.js";
import { orderToShopifyDraft, fulfillmentToDesadv } from "../core/edi/mapping/engine.js";
import { outboundDispatch } from "../connectors/dispatcher.js";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const sessionStorage = new PrismaSessionStorage(prisma);

async function getOfflineAccessTokenForTenant(tenantId: string): Promise<{ shop: string, token: string } | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.shop) return null;
  const offlineId = `offline_${tenant.shop}`;
  const session = await sessionStorage.loadSession(offlineId as any);
  const token = (session as any)?.accessToken;
  if (!token) return null;
  return { shop: tenant.shop, token };
}

async function appUsageRecordCreate(shop: string, token: string, subscriptionLineItemId: string, amount: number, description: string) {
  const m = `#graphql
    mutation($subscriptionLineItemId: ID!, $description: String!, $price: MoneyInput!) {
      appUsageRecordCreate(subscriptionLineItemId: $subscriptionLineItemId, description: $description, price: $price) {
        userErrors { field message }
        appUsageRecord { id }
      }
    }`;
  const res = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: m,
      variables: {
        subscriptionLineItemId,
        description,
        price: { amount, currencyCode: "EUR" }
      }
    })
  });
  return await res.json();
}

async function resolveVariantIdBySku(shop: string, token: string, sku: string): Promise<string | null> {
  const q = `#graphql
    query($query: String!) {
      productVariants(first: 1, query: $query) { nodes { id sku } }
    }`;
  const res = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, variables: { query: `sku:${JSON.stringify(sku)}` } })
  });
  const js = await res.json();
  return js?.data?.productVariants?.nodes?.[0]?.id ?? null;
}

async function draftOrderCreate(shop: string, token: string, input: any) {
  const m = `#graphql
    mutation($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) { draftOrder { id name } userErrors { field message } }
    }`;
  const res = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ query: m, variables: { input } })
  });
  return await res.json();
}

async function draftOrderComplete(shop: string, token: string, id: string) {
  const m = `#graphql
    mutation($id: ID!) {
      draftOrderComplete(id: $id, paymentPending: true) { draftOrder { id name } userErrors { field message } }
    }`;
  const res = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ query: m, variables: { id } })
  });
  return await res.json();
}

new Worker(queueName, async (job) => {
  const { name, data } = job;

  if (name === "SHOPIFY_CREATE_ORDER") {
    const { documentId, tenantId } = data as { documentId: string, tenantId: string };
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error("Document not found");

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId || doc.tenantId } });
    if (!tenant) throw new Error("Tenant not found");

    const shopToken = await getOfflineAccessTokenForTenant(tenant.id);
    if (!shopToken) throw new Error("Offline session/access token not found for tenant");
    const { shop, token } = shopToken;

    const raw = (doc.payload as any);
    const rawStr = typeof raw === "string" ? raw : raw.raw;
    const type = doc.docType;
    let norm;
    if (type === "ORDERS") {
      norm = normalizeEdifactOrders(rawStr);
    } else if (type === "X12_850") {
      norm = normalizeX12_850(rawStr);
    } else {
      throw new Error("Unsupported docType for order creation");
    }
    const draft = orderToShopifyDraft(norm);
    for (const li of draft.input.lineItems) {
      if (li.sku) {
        const vid = await resolveVariantIdBySku(shop, token, li.sku);
        if (vid) li.variantId = vid;
      }
    }
    const created = await draftOrderCreate(shop, token, draft.input);
    const errors = created?.data?.draftOrderCreate?.userErrors;
    if (errors && errors.length) throw new Error("Shopify draftOrderCreate error: " + JSON.stringify(errors));
    const id = created?.data?.draftOrderCreate?.draftOrder?.id;
    await draftOrderComplete(shop, token, id);
    await prisma.document.update({ where: { id: documentId }, data: { status: "PROCESSED" } });

    // Usage record: Inbound success
    if (tenant.usageLineItemId && tenant.usagePrice && tenant.usagePrice > 0) {
      await appUsageRecordCreate(shop, token, tenant.usageLineItemId, tenant.usagePrice, "Inbound EDI → Order processed");
    }
  }

  if (name === "SEND_DESADV") {
    const { documentId, outboundCfg } = data;
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error("Document not found");

    const tenant = await prisma.tenant.findUnique({ where: { id: doc.tenantId } });
    if (!tenant) throw new Error("Tenant not found");

    const out = doc.outPayload as any;
    const filename = `DESADV_${doc.correlation || doc.id}.edi`;
    const res = await outboundDispatch(outboundCfg, filename, typeof out === "string" ? out : JSON.stringify(out));
    await prisma.document.update({ where: { id: documentId }, data: { status: "SENT" } });

    // Usage record: Outbound success
    const shopToken = await getOfflineAccessTokenForTenant(tenant.id);
    if (tenant.usageLineItemId && tenant.usagePrice && tenant.usagePrice > 0 && shopToken) {
      await appUsageRecordCreate(shopToken.shop, shopToken.token, tenant.usageLineItemId, tenant.usagePrice, "Outbound DESADV sent");
    }
    return res;
  }
}, { connection });

console.log("Worker started with session-based Shopify access and usage billing.");
