#!/usr/bin/env node

/**
 * Custom server script for Fly.io deployment
 * Ensures the app listens on 0.0.0.0:8080 as required by Fly.io
 */

import { createRequestHandler } from "@remix-run/node";
import { installGlobals } from "@remix-run/node";

installGlobals();

const port = process.env.PORT || 8080;
const host = "0.0.0.0";

console.log(`Starting server on ${host}:${port}`);

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
