import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  // ✅ Server-only imports are moved inside the action
  const { authenticate } = await import("../shopify.server");
import { db } from "../db.server";

  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // The payload's type for scope updates might need specific handling.
  // Assuming payload.current is an array of strings representing the new scopes.
  const currentScopes = (payload as any).current as string[];

  if (session && Array.isArray(currentScopes)) {
    await db.session.update({
      where: {
        id: session.id,
      },
      data: {
        scope: currentScopes.join(","), // Store scopes as a comma-separated string
      },
    });
  } else {
    console.log(`Webhook for ${topic} received, but no session found or payload format is unexpected.`);
  }

  return new Response();
};
