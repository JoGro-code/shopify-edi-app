import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";
import { Page, Card, TextField, Button, InlineStack } from "@shopify/polaris";

const prisma = new PrismaClient();

export const loader = async () => {
  const partners = await prisma.partner.findMany({ take: 50, orderBy: { createdAt: "desc" } });
  return json({ partners });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();
  const op = String(form.get("op") || "create");
  if (op === "create") {
    const name = String(form.get("name"));
    const inbound = form.get("inbound") as string;
    const outbound = form.get("outbound") as string;
    await prisma.partner.create({ data: { tenantId: (await prisma.tenant.findFirst())!.id, name, inbound: JSON.parse(inbound||"{}"), outbound: JSON.parse(outbound||"{}") } });
    return json({ ok: true });
  }
  if (op === "sftpTest") {
    const id = String(form.get("id"));
    const p = await prisma.partner.findUnique({ where: { id } });
    const cfg:any = p?.inbound as any;
    if (!p || cfg?.type !== "sftp") return json({ ok: false, error: "Not SFTP" });
    const { sftpPoll } = await import("../../connectors/sftp");
    const files = await sftpPoll(cfg);
    return json({ ok: true, files: files.map(f=>f.name) });
  }
  if (op === "httpsPing") {
    const id = String(form.get("id"));
    const p = await prisma.partner.findUnique({ where: { id } });
    const cfg:any = p?.outbound as any;
    if (!p || cfg?.type !== "https") return json({ ok: false, error: "Not HTTPS outbound" });
    const { httpsPost } = await import("../../connectors/https");
    const res = await httpsPost(cfg.endpoint, { ping: true }, cfg.headers || {});
    return json({ ok: true, response: res });
  }
  const inbound = form.get("inbound") as string;
  const outbound = form.get("outbound") as string;
  await prisma.partner.create({ data: { tenantId: (await prisma.tenant.findFirst())!.id, name, inbound: JSON.parse(inbound||"{}"), outbound: JSON.parse(outbound||"{}") } });
  return json({ ok: true });
};

export default function Partners() {
  const { partners } = useLoaderData<typeof loader>();
  return (
    <Page title="Partners">
      <Card title="Add Partner">
        <Form method="post">
          <input type="hidden" name="op" value="create" />
          <InlineStack align="start" gap="400">
            <TextField name="name" label="Name" />
            <TextField name="inbound" label="Inbound JSON" multiline={4} />
            <TextField name="outbound" label="Outbound JSON" multiline={4} />
            <Button submit>Add</Button>
          </InlineStack>
        </Form>
      </Card>
      <Card title="Existing">
        {partners.map((p:any) => (
          <div key={p.id} style={{marginBottom:12}}>
            <pre>{JSON.stringify(p, null, 2)}</pre>
            <Form method="post" style={{display:"inline-block", marginRight:8}}>
              <input type="hidden" name="op" value="sftpTest" />
              <input type="hidden" name="id" value={p.id} />
              <Button submit>SFTP Check</Button>
            </Form>
            <Form method="post" style={{display:"inline-block"}}>
              <input type="hidden" name="op" value="httpsPing" />
              <input type="hidden" name="id" value={p.id} />
              <Button submit>HTTPS Ping</Button>
            </Form>
          </div>
        ))}
      </Card>
    </Page>
  );
}
