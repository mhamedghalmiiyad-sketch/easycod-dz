// scripts/ensure-wilaya-data.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureWilayaData() {
  try {
    console.log("🔍 Checking if wilaya data exists...");
    
    const count = await prisma.algeriaCities.count();
    console.log(`📊 Current wilaya records: ${count}`);
    
    if (count === 0) {
      console.log("⚠️ No wilaya data found. Running seed script...");
      
      // Import and run the seed function
      const { execSync } = await import('child_process');
      execSync('npx prisma db seed', { stdio: 'inherit' });
      
      const newCount = await prisma.algeriaCities.count();
      console.log(`✅ Seed completed. New wilaya records: ${newCount}`);
    } else {
      console.log("✅ Wilaya data already exists.");
    }
  } catch (error) {
    console.error("❌ Error ensuring wilaya data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

ensureWilayaData()
  .then(() => {
    console.log("🎉 Wilaya data check completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Wilaya data check failed:", error);
    process.exit(1);
  });
