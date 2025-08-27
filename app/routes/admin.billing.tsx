import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form } from "@remix-run/react";
import { Page, Card, Button, Text, Divider } from "@shopify/polaris";
import { shopify } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MUTATION = `#graphql
mutation($name: String!, $returnUrl: URL!, $test: Boolean, $trialDays: Int, $lineItems: [AppSubscriptionLineItemInput!]!) {
  appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, trialDays: $trialDays, lineItems: $lineItems) {
    appSubscription { id status lineItems { id plan { pricingDetails { __typename } } } }
    confirmationUrl
    userErrors { field message }
  }
}`;

type PlanChoice = "MONTHLY" | "YEARLY_SAVER";

function planConfig(plan: PlanChoice) {
  if (plan === "MONTHLY") {
    return {
      name: "Monthly 99€ + usage",
      recurring: { amount: 99, currencyCode: "EUR", interval: "EVERY_30_DAYS" },
      usage: { cappedAmount: 1000, currencyCode: "EUR", terms: "€0.05 per EDI transaction" },
      usagePrice: 0.05
    };
  }
  // YEARLY_SAVER billed every 30 days to allow usage
  return {
    name: "Yearly Saver 41.58€/30d + usage",
    recurring: { amount: 41.58, currencyCode: "EUR", interval: "EVERY_30_DAYS" },
    usage: { cappedAmount: 1000, currencyCode: "EUR", terms: "€0.02 per EDI transaction" },
    usagePrice: 0.02
  };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();
  const plan = ((form.get("plan") as string) === "MONTHLY" ? "MONTHLY" : "YEARLY_SAVER") as PlanChoice;
  const cfg = planConfig(plan);

  // Auth via active admin session
  const { admin, session } = await shopify.authenticate.admin(request);

  const lineItems = [
    { plan: { appRecurringPricingDetails: { price: { amount: cfg.recurring.amount, currencyCode: cfg.recurring.currencyCode }, interval: cfg.recurring.interval } } },
    { plan: { appUsagePricingDetails: { cappedAmount: { amount: cfg.usage.cappedAmount, currencyCode: cfg.usage.currencyCode }, terms: cfg.usage.terms } } },
  ];

  const res = await admin.graphql(MUTATION, {
    variables: {
      name: cfg.name,
      returnUrl: (process.env.APP_URL || "https://example.com") + "/admin/billing",
      test: true,
      trialDays: 14,
      lineItems
    }
  });
  const data = await res.json();

  const sub = data?.data?.appSubscriptionCreate?.appSubscription;
  const subId = sub?.id || null;
  const lineItemsResp = sub?.lineItems || [];
  const usageLine = lineItemsResp.find((li: any) => li?.plan?.pricingDetails?.__typename === "AppUsagePricing");
  const usageLineId = usageLine?.id || null;

  if (subId) {
    let tenant = await prisma.tenant.findFirst({ where: { shop: session.shop } });
    if (!tenant) tenant = await prisma.tenant.create({ data: { shop: session.shop } });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { subscriptionId: subId, usageLineItemId: usageLineId, plan, usagePrice: cfg.usagePrice }
    });
  }

  return json({ data });
};

export default function Billing() {
  const actionData = useActionData<typeof action>();
  const confirmationUrl = actionData?.data?.appSubscriptionCreate?.confirmationUrl;
  const errors = actionData?.data?.appSubscriptionCreate?.userErrors;

  return (
    <Page title="Billing">
      <Card>
        <Text as="p">Wähle deinen Plan (Session-basiert, 14 Tage Trial, test=true).</Text>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <Card>
            <Text as="h3" variant="headingMd">Monatlich</Text>
            <Text as="p">99 € / 30 Tage + 0,05 € pro Transaktion</Text>
            <Form method="post">
              <input type="hidden" name="plan" value="MONTHLY" />
              <Button submit>Plan wählen</Button>
            </Form>
          </Card>
          <Card>
            <Text as="h3" variant="headingMd">Yearly Saver (billed monthly)</Text>
            <Text as="p">41,58 € / 30 Tage + 0,02 € pro Transaktion</Text>
            <Text as="p" tone="subdued">Hinweis: Shopify erlaubt Usage nur bei 30-Tage-Intervallen.</Text>
            <Form method="post">
              <input type="hidden" name="plan" value="YEARLY_SAVER" />
              <Button submit>Plan wählen</Button>
            </Form>
          </Card>
        </div>

        {confirmationUrl && (
          <div style={{ marginTop: 16 }}>
            <Text as="p">Bestätigungslink:</Text>
            <a href={confirmationUrl} target="_blank" rel="noreferrer">{confirmationUrl}</a>
          </div>
        )}
        {errors && errors.length > 0 && (
          <pre style={{ marginTop: 16, color: "crimson" }}>{JSON.stringify(errors, null, 2)}</pre>
        )}
      </Card>
    </Page>
  );
}
