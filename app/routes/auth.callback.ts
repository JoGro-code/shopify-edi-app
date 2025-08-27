import type { LoaderFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await shopify.auth.callback({ shopify, request });

  // Ensure tenant exists and link
  let tenant = await prisma.tenant.findFirst({ where: { shop: session.shop } });
  if (!tenant) tenant = await prisma.tenant.create({ data: { shop: session.shop } });

  // Link Prisma Session row to tenant for easier lookups (best-effort)
  // Session id is provided by the library; we update our extended Session table if present.
  try {
    await prisma.session.update({
      where: { id: session.id },
      data: { tenantId: tenant.id }
    });
  } catch (e) {
    // ignore if not present yet
  }

  return shopify.redirectToShopifyOrAppRoot({ request, admin, shopify, session });
};
