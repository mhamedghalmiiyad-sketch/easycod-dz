// 📁 app/routes/track-abandonment.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import db from "../db.server"; // Assuming your model is in this path

// Helper function to save or update abandonment data
export async function trackAbandonedCart(data: {
    shopId: string;
    sessionId: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    cartData: any;
    formData: any;
}) {
    return await db.abandonedCart.upsert({
        where: { sessionId: data.sessionId },
        update: {
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            customerName: data.customerName,
            cartData: JSON.stringify(data.cartData),
            formData: JSON.stringify(data.formData),
            updatedAt: new Date(),
        },
        create: {
            shopId: data.shopId,
            sessionId: data.sessionId,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            customerName: data.customerName,
            cartData: JSON.stringify(data.cartData),
            formData: JSON.stringify(data.formData),
            isRecovered: false,
        },
    });
}

// Loader to block GET requests
export const loader = async () =>
  new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });

// Action to handle the POST request
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const data = await request.json();
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    if (!shop) return json({ error: 'Shop parameter missing' }, { status: 400 });

    await trackAbandonedCart({
        shopId: shop,
        sessionId: data.sessionId,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        cartData: data.cartData,
        formData: data.formData,
    });

    console.log("🧭 track-abandonment payload received for shop:", shop);
    return json({ success: true });
  } catch (e) {
    console.error("Error in track-abandonment:", e);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};