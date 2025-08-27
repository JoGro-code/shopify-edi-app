import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Card, Grid, Page, Text, DataTable } from "@shopify/polaris";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const seven = new Date(); seven.setDate(seven.getDate()-7);
  const processedToday = await prisma.document.count({ where: { createdAt: { gte: todayStart }, status: "PROCESSED" } });
  const failedToday = await prisma.document.count({ where: { createdAt: { gte: todayStart }, status: "FAILED" } });
  const dlq = await prisma.job.count({ where: { dlq: true } });
  const recent = await prisma.document.findMany({ take: 10, orderBy: { createdAt: "desc" } });
  return json({ processedToday, failedToday, dlq, recent });
};

export default function Dashboard() {
  const { processedToday, failedToday, dlq, recent } = useLoaderData<typeof loader>();
  return (
    <Page title="Dashboard">
      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
          <Card>
            <Text as="h2" variant="headingMd">Heute verarbeitet</Text>
            <Text as="p" tone="success">{processedToday}</Text>
          </Card>
        </Grid.Cell>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
          <Card>
            <Text as="h2" variant="headingMd">Heute failed</Text>
            <Text as="p" tone="critical">{failedToday}</Text>
          </Card>
        </Grid.Cell>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
          <Card>
            <Text as="h2" variant="headingMd">DLQ</Text>
            <Text as="p">{dlq}</Text>
          </Card>
        </Grid.Cell>
      </Grid>

      <Card title="Letzte Ereignisse">
        <DataTable
          columnContentTypes={["text","text","text","text","text"]}
          headings={["ID","Typ","Richtung","Status","Zeit"]}
          rows={recent.map(r => [r.id, r.docType, r.direction, r.status, new Date(r.createdAt).toLocaleString()])}
        />
      </Card>
    </Page>
  );
}
