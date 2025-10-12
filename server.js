#!/usr/bin/env node

/**
 * Custom server script for Render deployment
 * Ensures proper environment variable handling and validation
 */

// CRITICAL: Log environment variables IMMEDIATELY at startup
console.log('=== EARLY ENVIRONMENT VARIABLE DIAGNOSTIC ===');
console.log('Timestamp:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current working directory:', process.cwd());
console.log('Process arguments:', process.argv);

// Log ALL environment variables (be careful with secrets in production)
console.log('\n=== ALL ENVIRONMENT VARIABLES ===');
Object.keys(process.env).sort().forEach(key => {
  if (key.includes('SHOPIFY') || key.includes('SCOPE') || key.includes('NODE') || key.includes('PORT')) {
    const value = process.env[key];
    if (key.includes('SECRET') || key.includes('KEY')) {
      console.log(`${key}: ${value ? '[PRESENT - ' + value.length + ' chars]' : '[MISSING]'}`);
    } else {
      console.log(`${key}: ${value || '[MISSING]'}`);
    }
  }
});

console.log('\n=== SHOPIFY-SPECIFIC VARIABLES ===');
console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY ? '[PRESENT - ' + process.env.SHOPIFY_API_KEY.length + ' chars]' : '[MISSING]');
console.log('SHOPIFY_API_SECRET:', process.env.SHOPIFY_API_SECRET ? '[PRESENT - ' + process.env.SHOPIFY_API_SECRET.length + ' chars]' : '[MISSING]');
console.log('SHOPIFY_APP_URL:', process.env.SHOPIFY_APP_URL || '[MISSING]');
console.log('SCOPES:', process.env.SCOPES || '[MISSING]');
console.log('SHOP_CUSTOM_DOMAIN:', process.env.SHOP_CUSTOM_DOMAIN || '[NOT SET]');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[PRESENT]' : '[MISSING]');
console.log('NODE_ENV:', process.env.NODE_ENV || '[NOT SET]');
console.log('PORT:', process.env.PORT || '[NOT SET]');
console.log('==========================================\n');

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
