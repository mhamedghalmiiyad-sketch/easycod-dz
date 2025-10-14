#!/usr/bin/env node
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import { execSync } from "child_process";

// Initialize Remix globals
installGlobals();

// --- Main startup function ---
async function startServer() {
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

  // --- CRITICAL FIX: Load the build BEFORE starting the server ---
  const build = await import("./build/server/index.js");
  console.log("✅ Remix build loaded successfully from ./build/server/index.js");

  // --- Express App Setup ---
  const app = express();
  const port = process.env.PORT || 10000;
  const host = "0.0.0.0";
  
  // Log port information for debugging
  console.log(`🔧 Port configuration: ${port} (from PORT env: ${process.env.PORT})`);
  console.log(`🔧 Host configuration: ${host}`);

  // ✅ Serve all built client assets (Vite output)
  app.use(express.static("build/client", { immutable: true, maxAge: "1y" }));
  
  // ✅ Serve public folder (favicon, logo, etc.)
  app.use(express.static("public", { maxAge: "1h" }));

  // Health check endpoint for Render
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      port: port,
      environment: process.env.NODE_ENV 
    });
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