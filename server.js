#!/usr/bin/env node
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import { execSync } from "child_process";
import { config } from "dotenv";

config();
installGlobals();

// --- THIS IS THE FIX: PART 1 ---
// We create an object with the environment variables that we will inject.
const SHOPIFY_ENV = {
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES,
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
};
// --- END FIX PART 1 ---

async function startServer() {
  console.log("=== Environment Variable Validation ===");
  const requiredEnvVars = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SCOPES", "SESSION_SECRET", "SHOPIFY_APP_URL"];
  
  for (const v of requiredEnvVars) {
    if (!process.env[v]) {
      console.error(`❌ Missing required environment variable: ${v}`);
      process.exit(1);
    }
  }
  
  console.log("✅ All required environment variables are present.");
  console.log(`✅ SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY.substring(0, 8)}...`);
  console.log(`✅ SHOPIFY_APP_URL is set: ${process.env.SHOPIFY_APP_URL}`);

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
  
  app.use(express.static("build/client", { immutable: true, maxAge: "1y" }));
  app.use(express.static("public", { maxAge: "1h" }));

  app.get("/health", (req, res) => res.status(200).send("ok"));

  app.all(
    "*",
    createRequestHandler({
      build,
      mode: process.env.NODE_ENV,
      // --- THIS IS THE FIX: PART 2 ---
      // This function runs on every request and passes the SHOPIFY_ENV object
      // into the `context` argument of your loaders and actions.
      getLoadContext: () => ({
        shopify: SHOPIFY_ENV,
      }),
      // --- END FIX PART 2 ---
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