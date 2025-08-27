import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

export function meta() { return [{ title: "Shopify EDI App" }]; }

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
