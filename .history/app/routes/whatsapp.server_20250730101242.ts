// Implement your WhatsApp service (using Twilio, etc.)
export async function sendWhatsApp(params: {
  phone: string;
  message: string;
  shopId: string;
}) {
  // Implementation depends on your WhatsApp provider
  console.log('📱 Sending WhatsApp:', params);
}