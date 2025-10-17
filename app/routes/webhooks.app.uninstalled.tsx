import type { ActionFunctionArgs } from "@remix-run/node";
// Dynamic import to avoid build conflicts
import { db } from "../db.server";  // ✅ correct

export const action = async ({ request }: ActionFunctionArgs) => {
  const { getAuthenticate } = await import("../lib/shopify.lazy.server");
  const authenticate = await getAuthenticate();
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
