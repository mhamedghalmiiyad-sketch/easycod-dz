// app/models/abandonedCart.server.ts
// This file contains all server-side logic for handling abandoned carts.
// It follows Remix's convention for server-only modules.

import { db } from "../db.server";
import { sendEmail } from "../routes/email";
import { sendWhatsApp } from "../routes/whatsapp";

interface AbandonedCartData {
  shopId: string;
  sessionId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  cartData: any;
  formData?: any;
}

/**
 * Tracks an abandoned cart using an "upsert" operation.
 * It creates a new record if one doesn't exist for the session,
 * or updates the existing one.
 * @param data The abandoned cart data.
 */
export async function trackAbandonedCart(data: AbandonedCartData) {
  try {
    await db.abandonedCart.upsert({
      where: { sessionId: data.sessionId },
      update: {
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        cartData: JSON.stringify(data.cartData),
        formData: JSON.stringify(data.formData || {}),
        abandonedAt: new Date(),
      },
      create: {
        ...data,
        cartData: JSON.stringify(data.cartData),
        formData: JSON.stringify(data.formData || {}),
      },
    });
    console.log(`✅ Tracked abandoned cart for session: ${data.sessionId}`);
  } catch (error) {
    console.error('❌ Error tracking abandoned cart:', error);
  }
}

/**
 * Marks a cart as recovered after an order has been placed.
 * @param sessionId The ID of the session to mark as recovered.
 * @param orderId The ID of the new order.
 */
export async function markCartAsRecovered(sessionId: string, orderId: string) {
  try {
    await db.abandonedCart.update({
      where: { sessionId },
      data: {
        isRecovered: true,
        recoveredAt: new Date(),
        recoveryOrderId: orderId,
      },
    });
    console.log(`✅ Marked cart as recovered: ${sessionId}`);
  } catch (error) {
    // It's possible the cart was never tracked, so we don't want to throw a fatal error.
    console.warn(`⚠️ Could not mark cart as recovered for session ${sessionId}:`, error);
  }
}

/**
 * Processes abandoned carts and sends out reminders based on shop settings.
 * This function can be called from a cron job or a scheduled task.
 */
export async function processAbandonedCartReminders() {
  try {
    // Get all shops with abandoned cart recovery enabled
    const shops = await db.shopSettings.findMany({
      where: {
        generalSettings: {
          contains: '"enableAbandonedCartRecovery":true',
        },
      },
    });

    for (const shop of shops) {
      const settings = JSON.parse(shop.generalSettings || '{}');
      if (!settings.enableAbandonedCartRecovery) continue;

      const delayMinutes = parseInt(settings.abandonedCartDelayMinutes || '30', 10);
      const maxReminders = parseInt(settings.abandonedCartMaxReminders || '3', 10);
      const intervalHours = parseInt(settings.abandonedCartReminderIntervalHours || '24', 10);

      const cutoffTime = new Date(Date.now() - delayMinutes * 60 * 1000);
      const intervalTime = new Date(Date.now() - intervalHours * 60 * 60 * 1000);

      const abandonedCarts = await db.abandonedCart.findMany({
        where: {
          shopId: shop.shopId,
          isRecovered: false,
          reminderCount: { lt: maxReminders },
          abandonedAt: { lte: cutoffTime },
          OR: [
            { lastReminderAt: null },
            { lastReminderAt: { lte: intervalTime } },
          ],
        },
      });

      for (const cart of abandonedCarts) {
        await sendAbandonedCartReminder(cart, settings);

        await db.abandonedCart.update({
          where: { id: cart.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error('❌ Error processing abandoned cart reminders:', error);
  }
}

// --- Helper Functions ---

/**
 * Sends a reminder to the customer via the configured method (email/WhatsApp).
 * @param cart The cart object from the database.
 * @param settings The shop's configuration settings.
 */
async function sendAbandonedCartReminder(cart: any, settings: any) {
  const cartData = JSON.parse(cart.cartData);
  // NOTE: Ensure your storefront URL is correctly configured.
  const recoveryLink = `https://${cart.shopId}/apps/proxy?recovery=${cart.sessionId}`;

  const replacements = {
    '{customer_name}': cart.customerName || 'Valued Customer',
    '{cart_total}': formatCurrency(cartData.total_price / 100, cartData.currency),
    '{cart_items}': formatCartItems(cartData.items),
    '{recovery_link}': recoveryLink,
  };

  const method = settings.abandonedCartRecoveryMethod || 'email';

  if ((method === 'email' || method === 'both') && cart.customerEmail) {
    const subject = replaceTemplateVars(settings.abandonedCartEmailSubject, replacements);
    const body = replaceTemplateVars(settings.abandonedCartEmailTemplate, replacements);
    await sendEmail({
      to: cart.customerEmail,
      subject,
      body,
      shopId: cart.shopId,
    });
  }

  if ((method === 'whatsapp' || method === 'both') && cart.customerPhone) {
    const message = replaceTemplateVars(settings.abandonedCartWhatsAppTemplate, replacements);
    await sendWhatsApp({
      phone: cart.customerPhone,
      message,
      shopId: cart.shopId,
    });
  }
}

/**
 * Replaces placeholder variables in a template string.
 * @param template The template string (e.g., "Hello, {customer_name}!").
 * @param replacements An object of key-value pairs to replace.
 * @returns The formatted string.
 */
function replaceTemplateVars(template: string, replacements: Record<string, string>): string {
  if (!template) return '';
  return Object.entries(replacements).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(key, 'g'), value);
  }, template);
}

/**
 * Formats a numeric amount into a currency string.
 * @param amount The amount in the main currency unit (e.g., 19.99).
 * @param currency The 3-letter currency code (e.g., "USD").
 * @returns The formatted currency string (e.g., "$19.99").
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats an array of cart line items into a human-readable string.
 * @param items The array of cart items from Shopify's cart object.
 * @returns A formatted string like "2x T-Shirt, 1x Mug".
 */
function formatCartItems(items: any[]): string {
  if (!items || items.length === 0) return 'your items';
  return items.map(item => `${item.quantity}x ${item.product_title}`).join(', ');
}