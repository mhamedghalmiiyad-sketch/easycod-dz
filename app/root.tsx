import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

// --- ADD THESE CSS IMPORTS ---
import "./tailwind.css";
import "./rtl.css";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        
        {/* --- THIS IS THE CORRECT SCRIPT TAG --- */}
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          type="text/javascript"
          defer={false}
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

// Keep your existing ErrorBoundary
export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div style={{ 
          padding: '2rem', 
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h1>Something went wrong</h1>
          <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}