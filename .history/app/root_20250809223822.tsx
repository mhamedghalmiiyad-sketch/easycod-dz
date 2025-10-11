import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

// Import both stylesheets using the `?url` suffix
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import tailwindStyles from "./tailwind.css?url";

// Add both stylesheets to the links array
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: tailwindStyles },
];

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
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