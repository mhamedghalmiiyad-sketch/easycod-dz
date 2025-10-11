// Implement your email service (using SendGrid, Mailgun, etc.)
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  shopId: string;
}) {
  // Implementation depends on your email provider
  console.log('📧 Sending email:', params);
}