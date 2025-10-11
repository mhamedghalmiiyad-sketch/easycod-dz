import { processAbandonedCartReminders } from "./abandonedCart";

export async function runAbandonedCartJob() {
  console.log('🔄 Running abandoned cart recovery job...');
  await processAbandonedCartReminders();
  console.log('✅ Abandoned cart recovery job completed');
}

// Set up a recurring job (you can use cron or a task scheduler)
if (process.env.NODE_ENV === 'production') {
  setInterval(runAbandonedCartJob, 15 * 60 * 1000); // Run every 15 minutes
}