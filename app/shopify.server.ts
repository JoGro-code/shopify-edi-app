import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sessionStorage = new PrismaSessionStorage(prisma);

export const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SCOPES || "").split(","),
    hostScheme: process.env.APP_URL?.startsWith("https") ? "https" : "http",
    hostName: process.env.APP_URL?.replace(/^https?:\/\//,"") || "localhost",
    apiVersion: "2024-07"
  },
  auth: { path: "/auth", callbackPath: "/auth/callback" },
  sessionStorage,
  webhooks: {
    path: "/webhooks",
  }
});

export type Shopify = typeof shopify;
