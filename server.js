#!/usr/bin/env node

/**
 * Custom server script for Render deployment
 * Ensures proper environment variable handling and validation
 */

import { createRequestHandler } from "@remix-run/node";
import { installGlobals } from "@remix-run/node";

installGlobals();

// Environment variable validation
const requiredEnvVars = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET', 
  'SHOPIFY_APP_URL',
  'SCOPES'
];

console.log('=== Environment Variable Validation ===');
const missingVars = [];
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: MISSING`);
  } else {
    console.log(`✅ ${varName}: SET`);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your Render service environment variables configuration.');
  process.exit(1);
}

const port = process.env.PORT || 8080;
const host = "0.0.0.0";

console.log(`✅ All required environment variables are present`);
console.log(`🚀 Starting server on ${host}:${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Import the built server
const build = await import("./build/server/index.js");

const requestHandler = createRequestHandler(build, process.env.NODE_ENV);

// Create a simple HTTP server
import { createServer } from "http";

const server = createServer((req, res) => {
  requestHandler(req, res).catch((error) => {
    console.error("Request handler error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  });
});

server.listen(port, host, () => {
  console.log(`✅ Server is running on http://${host}:${port}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
