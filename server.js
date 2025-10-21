#!/usr/bin/env node
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import { execSync } from "child_process";
import { config } from "dotenv";

// Load .env file FIRST
config();

// --- VERSION LOG: This proves the new code is deployed ---
console.log("--- RUNNING VERSION: 1.0.6 - FINAL I18N WRAPPER FIX ---");
console.log("--- AUTH SESSION TOKEN FIX: Loader function added ---");
console.log("--- TRANSLATION FIX: i18next instance properly initialized ---");
console.log("--- SERVER-SIDE I18N FIX: I18nextProvider added to entry.server.tsx ---");
console.log("--- APP BRIDGE SCRIPT FIX: Corrected script URLs ---");
console.log("--- ROOT.TSX FIX: Correct App Bridge script URL and CSS imports ---");
// --- END VERSION LOG ---

// --- CRITICAL FIX: Set global variable AT THE TOP ---
// This ensures it's available even during early module loads like entry.server.tsx
global.SHOPIFY_ENV_VARS = {
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES,
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
  SESSION_SECRET: process.env.SESSION_SECRET, // Include session secret if needed elsewhere
};
// --- END CRITICAL FIX ---

// Now install Remix globals
installGlobals();


// The rest of the file remains the same...
const SHOPIFY_ENV_FOR_CONTEXT = { ...global.SHOPIFY_ENV_VARS }; // Use the global var for context too

async function startServer() {
  console.log("=== Environment Variable Validation (using global) ===");
  const requiredEnvVars = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SCOPES", "SESSION_SECRET", "SHOPIFY_APP_URL"];

  // Validate using the global variable now
  for (const v of requiredEnvVars) {
    if (!global.SHOPIFY_ENV_VARS[v]) {
      console.error(`❌ Missing required environment variable in global: ${v}`);
      // Also check process.env for debugging comparison
      console.error(`   Value in process.env: ${process.env[v]}`);
      process.exit(1);
    }
  }

  console.log("✅ All required environment variables are present in global.");
  console.log(`✅ SHOPIFY_API_KEY: ${global.SHOPIFY_ENV_VARS.SHOPIFY_API_KEY.substring(0, 8)}...`);
  console.log(`✅ SHOPIFY_APP_URL is set: ${global.SHOPIFY_ENV_VARS.SHOPIFY_APP_URL}`);

  try {
    console.log("📦 Running database migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Database migrations completed.");
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    process.exit(1);
  }

  console.log("🔧 Loading Remix build...");
  const build = await import("./build/server/index.js");
  console.log("✅ Remix build loaded.");

  const app = express();
  app.set("trust proxy", 1);

  // ADD EARLY REQUEST LOGGING TO TRACK ALL INCOMING REQUESTS (excluding health checks)
  app.use((req, res, next) => {
    // Skip logging for health check requests to reduce noise
    if (req.originalUrl === '/health') {
      next();
      return;
    }
    
    console.log(`---> SERVER.JS HIT: ${req.method} ${req.originalUrl}`);
    console.log(`     User-Agent: ${req.headers['user-agent'] || 'N/A'}`);
    console.log(`     Content-Type: ${req.headers['content-type'] || 'N/A'}`);
    console.log(`     Content-Length: ${req.headers['content-length'] || 'N/A'}`);
    next(); // Pass the request along
  });

  app.use(express.static("build/client", { immutable: true, maxAge: "1y" }));
  app.use(express.static("public", { maxAge: "1h" }));

  app.get("/health", (req, res) => res.status(200).send("ok"));

  app.all(
    "*",
    createRequestHandler({
      build,
      mode: process.env.NODE_ENV || 'production', // Ensure NODE_ENV is set
      getLoadContext: () => ({
        // Pass the already populated object to the context
        shopify: SHOPIFY_ENV_FOR_CONTEXT,
      }),
    })
  );

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Server is running and ready on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});