import { Page, Card, TextField, Button } from "@shopify/polaris";

export default function Settings() {
  return (
    <Page title="Settings">
      <Card>
        <p>Timezone, default location, webhook status, secret rotation, notifications.</p>
        <TextField label="Timezone" />
        <Button>Save</Button>
      </Card>
    </Page>
  );
}
