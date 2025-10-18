#!/usr/bin/env node
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import { execSync } from "child_process";
import { config } from "dotenv";

// Load .env file for local development
config();

// --- CRITICAL FIX: Create a dedicated global for environment variables ---
// This is more reliable than modifying global.process in some environments.
if (typeof global !== 'undefined') {
  global.SHOPIFY_ENV_VARS = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SCOPES,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    SHOP_CUSTOM_DOMAIN: process.env.SHOP_CUSTOM_DOMAIN,
  };
}

// Initialize Remix globals
installGlobals();

async function startServer() {
  console.log("=== Environment Variable Validation ===");
  const requiredEnvVars = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "SCOPES",
    "DATABASE_URL",
    "SESSION_SECRET",
  ];
  
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(", ")}`);
    process.exit(1);
  }
  
  console.log("✅ All required environment variables are present and valid.");
  console.log(`✅ SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY.substring(0, 8)}...`);
  console.log(`✅ SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET.substring(0, 8)}...`);
  
  if (process.env.SHOPIFY_APP_URL) {
    console.log(`✅ SHOPIFY_APP_URL is set: ${process.env.SHOPIFY_APP_URL}`);
  } else {
    console.error("❌ SHOPIFY_APP_URL is not set. This is required for deployment.");
    process.exit(1);
  }

  console.log("✅ SESSION_SECRET is present and loaded (length:", process.env.SESSION_SECRET.length, ")");

  try {
    console.log("📦 Running database migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Database migrations completed successfully.");
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    process.exit(1);
  }

  try {
    console.log("🏛️ Ensuring wilaya data is available...");
    execSync("npm run ensure-wilaya-data", { stdio: "inherit" });
    console.log("✅ Wilaya data check completed successfully.");
  } catch (error) {
    console.warn("⚠️ Wilaya data check failed, but continuing:", error.message);
  }

  console.log("🔧 Loading Remix build...");
  let build;
  try {
    build = await import("./build/server/index.js");
    console.log("✅ Remix build loaded successfully");
  } catch (error) {
    console.error("❌ Failed to import build:", error);
    throw error;
  }

  const app = express();
  const port = process.env.PORT || 3000;
  const host = "0.0.0.0";
  
  app.set("trust proxy", 1);
  console.log("✅ Express trust proxy enabled for Render HTTPS termination");
  
  app.use(express.static("build/client", { immutable: true, maxAge: "1y" }));
  app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
  app.use(express.static("public", { maxAge: "1h" }));

  app.get("/health", (req, res) => res.status(200).send("ok"));

  app.all(
    "*",
    createRequestHandler({
      build: build,
      mode: process.env.NODE_ENV,
    })
  );

  app.listen(port, host, () => {
    console.log(`🚀 Server is running and ready on http://${host}:${port}`);
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});