#!/usr/bin/env node
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import { execSync } from "child_process";
import { config } from "dotenv";

// Load environment variables from .env file (for local development)
// In production (Render), environment variables are automatically available
config();

// Ensure environment variables are available globally
// This is critical for the build import process
if (typeof global !== 'undefined') {
  global.process = global.process || process;
  global.process.env = global.process.env || process.env;
}

// Initialize Remix globals
installGlobals();

// --- Main startup function ---
async function startServer() {
  // --- Environment Variable Validation ---
  console.log("=== Environment Variable Validation ===");
  const requiredEnvVars = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "SCOPES",
    "DATABASE_URL",
    "SESSION_SECRET",
  ];
  
  // Check for missing variables
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.error(
      `❌ Missing required environment variables: ${missingVars.join(", ")}`
    );
    process.exit(1);
  }
  
  // Check for empty values (common issue with Render)
  const emptyVars = requiredEnvVars.filter((v) => process.env[v] && process.env[v].trim() === "");
  if (emptyVars.length > 0) {
    console.error(
      `❌ Empty required environment variables: ${emptyVars.join(", ")}`
    );
    console.error("🔧 These variables are set but contain empty values. Check your Render dashboard.");
    process.exit(1);
  }
  
  // Validate specific Shopify credentials
  if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY.length < 10) {
    console.error("❌ SHOPIFY_API_KEY is missing or too short");
    console.error(`Current value: "${process.env.SHOPIFY_API_KEY}"`);
    process.exit(1);
  }
  
  if (!process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_SECRET.length < 10) {
    console.error("❌ SHOPIFY_API_SECRET is missing or too short");
    console.error(`Current value: "${process.env.SHOPIFY_API_SECRET}"`);
    process.exit(1);
  }
  
  console.log("✅ All required environment variables are present and valid.");
  console.log(`✅ SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY.substring(0, 8)}...`);
  console.log(`✅ SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET.substring(0, 8)}...`);
  
  // Check SHOPIFY_APP_URL with fallback
  if (!process.env.SHOPIFY_APP_URL) {
    console.log("⚠️ SHOPIFY_APP_URL not set, using fallback: https://easycod-dz-1.onrender.com");
  } else {
    console.log(`✅ SHOPIFY_APP_URL is set: ${process.env.SHOPIFY_APP_URL}`);
  }
  
  // --- SESSION_SECRET Runtime Check ---
  if (!process.env.SESSION_SECRET) {
    console.error("❌ SESSION_SECRET is missing at runtime!");
    console.error("🔧 Add SESSION_SECRET to Render environment variables and redeploy.");
    process.exit(1);
  } else {
    console.log("✅ SESSION_SECRET is present and loaded (length:", process.env.SESSION_SECRET.length, ")");
  }

  // --- Database Migration Check ---
  try {
    console.log("📦 Running database migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Database migrations completed successfully.");
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    process.exit(1);
  }

  // --- Wilaya Data Check ---
  try {
    console.log("🏛️ Ensuring wilaya data is available...");
    execSync("npm run ensure-wilaya-data", { stdio: "inherit" });
    console.log("✅ Wilaya data check completed successfully.");
  } catch (error) {
    console.error("⚠️ Wilaya data check failed, but continuing with fallback data:", error.message);
    // Don't exit - the app has fallback data in the route
  }

  // --- CRITICAL FIX: Load the build AFTER ensuring environment variables are available ---
  // Ensure environment variables are available before importing the build
  console.log("🔧 Environment variables before build import:");
  console.log(`   SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY ? 'PRESENT' : 'MISSING'}`);
  console.log(`   SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET ? 'PRESENT' : 'MISSING'}`);
  console.log(`   SCOPES: ${process.env.SCOPES ? 'PRESENT' : 'MISSING'}`);
  
  // Double-check that all required environment variables are present
  const requiredForBuild = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SCOPES"];
  const missingForBuild = requiredForBuild.filter((v) => !process.env[v]);
  if (missingForBuild.length > 0) {
    console.error(`❌ Missing environment variables for build import: ${missingForBuild.join(", ")}`);
    process.exit(1);
  }
  
  // Force environment variables to be available in the global process.env
  // This ensures they are accessible when the build modules are imported
  global.process = global.process || process;
  global.process.env = global.process.env || process.env;
  
  // Prevent Remix build-time env caching
  delete process.env.NODE_ENV;
  
  let build;
  try {
    build = await import("./build/server/index.js");
    console.log("✅ Remix build loaded successfully from ./build/server/index.js");
    console.log("🧠 Using Prisma session storage — verifying persistence...");
  } catch (error) {
    console.error("❌ Failed to import build:", error);
    console.error("🔧 Environment variables at time of error:");
    console.error(`   SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY ? 'PRESENT' : 'MISSING'}`);
    console.error(`   SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET ? 'PRESENT' : 'MISSING'}`);
    console.error(`   SCOPES: ${process.env.SCOPES ? 'PRESENT' : 'MISSING'}`);
    throw error;
  }

  // --- Express App Setup ---
  const app = express();
  const port = process.env.PORT || 3000;
  const host = "0.0.0.0";
  
  // --- CRITICAL: Trust Proxy for Render HTTPS ---
  app.set("trust proxy", 1);
  console.log("✅ Express trust proxy enabled for Render HTTPS termination");
  
  // Log port information for debugging
  console.log(`🔧 Port configuration: ${port} (from PORT env: ${process.env.PORT})`);
  console.log(`🔧 Host configuration: ${host}`);

  // ✅ Serve all built client assets (Vite output)
  app.use(express.static("build/client", { immutable: true, maxAge: "1y" }));
  
  // ✅ Serve assets from the assets subdirectory
  app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
  
  // ✅ Serve public folder (favicon, logo, etc.)
  app.use(express.static("public", { maxAge: "1h" }));

  // Health check endpoint for Render
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      port: port,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || "1.0.0",
      uptime: process.uptime()
    });
  });

  // Wilaya data health check endpoint
  app.get("/health/wilaya", async (req, res) => {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      const count = await prisma.algeriaCities.count();
      await prisma.$disconnect();
      
      res.status(200).json({ 
        status: "ok", 
        wilayaCount: count,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Debug session endpoint to check if sessions are being stored
  app.get("/debug/session", async (req, res) => {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      const sessions = await prisma._Session.findMany({
        take: 5,
        orderBy: { id: "desc" },
      });
      await prisma.$disconnect();
      
      res.json({
        count: sessions.length,
        sample: sessions.map((s) => ({ 
          id: s.id, 
          shop: s.shop, 
          isOnline: s.isOnline,
          expires: s.expires 
        })),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Let Remix handle all other requests
  app.all(
    "*",
    createRequestHandler({
      build: build, // <-- Use the pre-loaded build here
      mode: process.env.NODE_ENV,
    })
  );

  // --- Start Server ---
  const server = app.listen(port, host, () => {
    console.log(`🚀 Server is running and ready on http://${host}:${port}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV}`);
    console.log(`🔧 Server listening on port: ${server.address()?.port}`);
  });

  // Ensure server is properly bound
  server.on('listening', () => {
    const addr = server.address();
    if (addr && typeof addr === 'object') {
      console.log(`✅ Server successfully bound to ${addr.address}:${addr.port}`);
    }
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});