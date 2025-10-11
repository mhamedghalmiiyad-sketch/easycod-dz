import { ActionFunctionArgs, json } from "@remix-run/node";
import { trackAbandonedCart } from "./abandonedCart";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const data = await request.json();
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      return json({ error: 'Shop parameter missing' }, { status: 400 });
    }

    await trackAbandonedCart({
      shopId: shop,
      sessionId: data.sessionId,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerName: data.customerName,
      cartData: data.cartData,
      formData: data.formData,
    });

    return json({ success: true });
  } catch (error) {
    console.error('Error tracking abandonment:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};