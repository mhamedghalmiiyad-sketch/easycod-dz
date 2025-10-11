// This file is updated to fix the Remix server-only module error.
// The database import has been moved from the top level into the
// async functions that require it.

import { sendEmail } from "./email"; // You'll need to implement this
import { sendWhatsApp } from "./whatsapp"; // You'll need to implement this

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
 * Tracks an abandoned cart, creating a new record or updating an existing one.
 * @param data The abandoned cart data.
 */
export async function trackAbandonedCart(data: AbandonedCartData) {
  try {
    // Dynamically import the database module inside the server function.
    const dbModule = await import("../db.server");
    const db = dbModule.default;

    // Check if this session already has an abandoned cart record
    const existing = await db.abandonedCart.findUnique({
      where: { sessionId: data.sessionId }
    });

    if (existing) {
      // Update existing record
      await db.abandonedCart.update({
        where: { sessionId: data.sessionId },
        data: {
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          cartData: JSON.stringify(data.cartData),
          formData: JSON.stringify(data.formData || {}),
          abandonedAt: new Date(),
        }
      });
    } else {
      // Create new record
      await db.abandonedCart.create({
        data: {
          ...data,
          cartData: JSON.stringify(data.cartData),
          formData: JSON.stringify(data.formData || {}),
        }
      });
    }

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
    // Dynamically import the database module inside the server function.
    const dbModule = await import("../db.server");
    const db = dbModule.default;

    await db.abandonedCart.update({
      where: { sessionId },
      data: {
        isRecovered: true,
        recoveredAt: new Date(),
        recoveryOrderId: orderId,
      }
    });
    console.log(`✅ Marked cart as recovered: ${sessionId}`);
  } catch (error) {
    console.error('❌ Error marking cart as recovered:', error);
  }
}

/**
 * Processes abandoned carts and sends out reminders based on shop settings.
 */
export async function processAbandonedCartReminders() {
  try {
    // Dynamically import the database module inside the server function.
    const dbModule = await import("../db.server");
    const db = dbModule.default;

    // Get all shops with abandoned cart recovery enabled
    const shops = await db.shopSettings.findMany({
      where: {
        generalSettings: {
          contains: '"enableAbandonedCartRecovery":true'
        }
      }
    });

    for (const shop of shops) {
      const settings = JSON.parse(shop.generalSettings || '{}');
      
      if (!settings.enableAbandonedCartRecovery) continue;

      const delayMinutes = parseInt(settings.abandonedCartDelayMinutes || '30');
      const maxReminders = parseInt(settings.abandonedCartMaxReminders || '3');
      const intervalHours = parseInt(settings.abandonedCartReminderIntervalHours || '24');

      // Find abandoned carts ready for reminders
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
            { lastReminderAt: { lte: intervalTime } }
          ]
        }
      });

      for (const cart of abandonedCarts) {
        await sendAbandonedCartReminder(cart, settings);
        
        // Update reminder count and timestamp
        await db.abandonedCart.update({
          where: { id: cart.id },
          data: {
            reminderCount: cart.reminderCount + 1,
            lastReminderAt: new Date(),
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Error processing abandoned cart reminders:', error);
  }
}

/**
 * Sends a reminder to the customer about their abandoned cart.
 * @param cart The cart object.
 * @param settings The shop settings.
 */
async function sendAbandonedCartReminder(cart: any, settings: any) {
  const cartData = JSON.parse(cart.cartData);
  const recoveryLink = `https://${cart.shopId}/apps/proxy?recovery=${cart.sessionId}`;
  
  const replacements = {
    '{customer_name}': cart.customerName || 'Valued Customer',
    '{cart_total}': formatCurrency(cartData.total_price / 100, cartData.currency),
    '{cart_items}': formatCartItems(cartData.items),
    '{recovery_link}': recoveryLink,
  };

  const method = settings.abandonedCartRecoveryMethod || 'email';

  if (method === 'email' || method === 'both') {
    if (cart.customerEmail) {
      const subject = replaceTemplateVars(settings.abandonedCartEmailSubject, replacements);
      const body = replaceTemplateVars(settings.abandonedCartEmailTemplate, replacements);
      
      await sendEmail({
        to: cart.customerEmail,
        subject,
        body,
        shopId: cart.shopId,
      });
    }
  }

  if (method === 'whatsapp' || method === 'both') {
    if (cart.customerPhone) {
      const message = replaceTemplateVars(settings.abandonedCartWhatsAppTemplate, replacements);
      
      await sendWhatsApp({
        phone: cart.customerPhone,
        message,
        shopId: cart.shopId,
      });
    }
  }
}

/**
 * Replaces template variables in a string.
 * @param template The template string.
 * @param replacements The key-value pairs for replacements.
 * @returns The string with replaced variables.
 */
function replaceTemplateVars(template: string, replacements: Record<string, string>): string {
  let result = template;
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(key, 'g'), value);
  });
  return result;
}

/**
 * Formats a currency amount.
 * @param amount The amount to format.
 * @param currency The currency code.
 * @returns The formatted currency string.
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Formats a list of cart items into a single string.
 * @param items The array of cart items.
 * @returns A formatted string of cart items.
 */
function formatCartItems(items: any[]): string {
  return items.map(item => `${item.quantity}x ${item.product_title}`).join(', ');
}