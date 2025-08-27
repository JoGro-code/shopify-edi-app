import { Outlet, useLoaderData, NavLink } from "@remix-run/react";
import { json } from "@remix-run/node";
import { PolarisProvider, Frame, Navigation } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";

export const loader = async () => {
  return json({});
};

export default function AdminLayout() {
  const items = [
    { url: "/admin", label: "Dashboard" },
    { url: "/admin/documents", label: "Documents" },
    { url: "/admin/partners", label: "Partners" },
    { url: "/admin/mappings", label: "Mappings" },
    { url: "/admin/billing", label: "Billing" },
    { url: "/admin/settings", label: "Settings" },
  ];

  return (
    <PolarisProvider>
      <Frame
        navigation={
          <Navigation location="/admin">
            <Navigation.Section
              items={items.map(i => ({ url: i.url, label: i.label }))}
            />
          </Navigation>
        }
      >
        <div style={{ padding: 16 }}>
          <Outlet />
        </div>
      </Frame>
    </PolarisProvider>
  );
}
