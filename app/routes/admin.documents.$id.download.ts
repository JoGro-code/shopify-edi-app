
import type { LoaderFunctionArgs } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const id = params.id!;
  const url = new URL(request.url);
  const t = url.searchParams.get("type") || "raw";
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return new Response("Not found", { status: 404 });
  let body = "";
  let contentType = "application/json";
  if (t === "raw") {
    body = typeof (doc.payload as any)?.raw === "string" ? (doc.payload as any).raw : JSON.stringify(doc.payload);
    contentType = "text/plain";
  } else if (t === "normalized") {
    body = JSON.stringify((doc.payload as any)?.normalized ?? {}, null, 2);
  } else if (t === "out") {
    body = typeof doc.outPayload === "string" ? (doc.outPayload as string) : JSON.stringify(doc.outPayload ?? {} , null, 2);
  }
  return new Response(body, { headers: { "Content-Type": contentType } });
};
