#!/usr/bin/env node
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import { execSync } from "child_process";

// Initialize Remix globals
installGlobals();

// --- Environment Variable Validation ---
console.log("=== Environment Variable Validation ===");
const requiredEnvVars = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
  "SCOPES",
  "DATABASE_URL",
];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error(
    `❌ Missing required environment variables: ${missingVars.join(", ")}`
  );
  process.exit(1);
}
console.log("✅ All required environment variables are present.");

// --- Database Migration Check ---
try {
  console.log("📦 Running database migrations...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("✅ Database migrations completed successfully.");
} catch (error) {
  console.error("❌ Database migration failed:", error);
  process.exit(1);
}

// --- Express App Setup ---
const app = express();
const port = process.env.PORT || 8080;

// Serve build assets with aggressive caching
// Requests for /assets/* are mapped to the build/client/assets/* directory
app.use(
  "/assets",
  express.static("build/client/assets", { immutable: true, maxAge: "1y" })
);

// Serve other public files (e.g., favicon.ico)
app.use(express.static("public", { maxAge: "1h" }));

// Let Remix handle all other requests
app.all(
  "*",
  createRequestHandler({
    build: await import("./build/server/index.js"),
    mode: process.env.NODE_ENV,
  })
);

// --- Start Server ---
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV}`);
});