import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Minimal loader for the index page
export const loader = async (args: LoaderFunctionArgs) => {
  await authenticate.admin(args); // Still protect the route
  console.log(`--- DEBUG: Simplified app._index.tsx loader ran.`);
  return json({ message: "Index data loaded" });
};

// Radically simplified index page component
export default function AppIndex() {
  console.log('--- DEBUG: Simplified app._index.tsx component is attempting to render! ---');

  return (
    <div style={{ padding: "20px", border: "10px solid orange" }}>
      <h2>App Index Page Rendered!</h2>
      <p>If you see this orange border, the index page is working.</p>
    </div>
  );
}