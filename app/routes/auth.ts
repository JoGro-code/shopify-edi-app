import type { LoaderFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return shopify.auth.begin({ shopify, request });
};
