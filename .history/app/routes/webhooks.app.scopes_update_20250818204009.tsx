import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server"; // ✅ named import, matches your setup

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // 🚫 Prevent Shopify from uninstalling the app every time you restart dev
  if (process.env.NODE_ENV === "development" && topic === "APP_UNINSTALLED") {
    console.log("Skipping APP_UNINSTALLED webhook in dev mode");
    return new Response("OK");
  }

  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
