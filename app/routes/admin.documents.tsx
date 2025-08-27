import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";
import { Page, Card, DataTable, Button, TextField, Select, InlineStack } from "@shopify/polaris";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const q = {
    direction: url.searchParams.get("direction") || undefined,
    status: url.searchParams.get("status") || undefined,
    docType: url.searchParams.get("docType") || undefined,
    partnerId: url.searchParams.get("partnerId") || undefined,
  };
  const where:any = { };
  for (const [k,v] of Object.entries(q)) if (v) where[k] = v;
  const docs = await prisma.document.findMany({ where, take: 100, orderBy: { createdAt: "desc" } });
  return json({ docs });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();
  const op = String(form.get("op"));
  const ids = (form.getAll("ids") as string[]) || [];
  const id = form.get("id") as string | null;
  if (op === "retry" && id) {
    await prisma.document.update({ where: { id }, data: { status: "RECEIVED" } });
    return json({ ok: true });
  }
  if (op === "bulkRetry" && ids.length) {
    await prisma.document.updateMany({ where: { id: { in: ids } }, data: { status: "RECEIVED" } });
    return json({ ok: true });
  }
  if (op === "restoreDlq") {
    await prisma.job.updateMany({ where: { dlq: true }, data: { dlq: false } });
    return json({ ok: true });
  }
    // simple retry: reset status to RECEIVED
    await prisma.document.update({ where: { id }, data: { status: "RECEIVED" } });
    return json({ ok: true });
  }
  return json({ ok: false });
};

export default function Documents() {
  const { docs } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  return (
    <Page title="Documents">
      <Card>
        <Form method="post" style={{marginBottom: 12}}>
          <input type="hidden" name="op" value="bulkRetry" />
          <Button submit>Bulk Retry (Filter-Ergebnis)</Button>
        </Form>
        <Form method="post" style={{marginBottom: 12}}>
          <input type="hidden" name="op" value="restoreDlq" />
          <Button submit>DLQ Restore</Button>
        </Form>

        <DataTable
          columnContentTypes={["text","text","text","text","text","text"]}
          headings={["ID","Partner","Typ","Richtung","Status","Aktion"]}
          rows={docs.map((d:any) => [
            d.id, d.partnerId || "-", d.docType, d.direction, d.status,
            <Form method="post" key={d.id}>
              <input type="hidden" name="op" value="retry" />
              <input type="hidden" name="id" value={d.id} />
              <Button submit loading={nav.state!=='idle'}>Retry</Button>
            </Form>
          ])}
        />
      </Card>
    </Page>
  );
}
