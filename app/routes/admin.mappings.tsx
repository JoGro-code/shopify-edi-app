import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";
import { Page, Card, TextField, Button, InlineStack } from "@shopify/polaris";

const prisma = new PrismaClient();

export const loader = async () => {
  const mappings = await prisma.mapping.findMany({ take: 50, orderBy: { createdAt: "desc" } });
  return json({ mappings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();
  const partnerId = form.get("partnerId") as string || null;
  const docType = form.get("docType") as string;
  const direction = form.get("direction") as string;
  const overrides = JSON.parse((form.get("overrides") as string) || "{}");
  await prisma.mapping.create({
    data: { tenantId: (await prisma.tenant.findFirst())!.id, partnerId, docType, direction, template: {}, overrides, active: true }
  });
  return json({ ok: true });
};

export default function Mappings() {
  const { mappings } = useLoaderData<typeof loader>();
  return (
    <Page title="Mappings">
      <Card title="Add Mapping Override">
        <Form method="post">
          <InlineStack align="start" gap="400">
            <TextField name="partnerId" label="Partner ID (optional)" />
            <TextField name="docType" label="Doc Type" />
            <TextField name="direction" label="Direction (INBOUND/OUTBOUND)" />
            <TextField name="overrides" label="Overrides JSON" multiline={6} helpText="Tip: Quick-Insert unten nutzen" />
          </InlineStack>
        </Form>
      </Card>
      <Card title="Quick-Insert (Overrides Keys)">
        <p>Häufige Keys: <code>lines[0].price</code>, <code>currency</code>, <code>buyer.name</code></p>
        <p>Füge Schlüssel/Werte paarweise in JSON ein, z.B. {"{"}"currency":"EUR", "buyer.name":"ACME"{"}"}.</p>
      </Card>
      <Card title="Existing">
            <Button submit>Save</Button>
          </InlineStack>
        </Form>
      </Card>
      <Card title="Existing">
        <pre>{JSON.stringify(mappings, null, 2)}</pre>
      </Card>
    </Page>
  );
}
