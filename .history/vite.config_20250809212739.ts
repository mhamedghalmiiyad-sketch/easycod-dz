// vite.config.ts

import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals({ nativeFetch: true });

// Shopify HOST and HMR workaround
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname;

let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT!) || 8002,
    clientPort: 443,
  };
}

// This config is now ONLY for the main Remix app.
export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_lazyRouteDiscovery: true,
        v3_relativeSplatPath: true,
        v3_singleFetch: true,
        v3_throwAbortReason: true,
      },
      buildDirectory: "public/build",
      // Added the browserNodeBuiltinsPolyfill configuration here
      browserNodeBuiltinsPolyfill: {
        modules: {
          net: true,
          tls: true,
          assert: true,
          http: true,
          https: true,
          zlib: true,
          stream: true,
          buffer: true,
          util: true,
          url: true,
          fs: true,
          path: true,
          process: true,
          crypto: true,
          child_process: true,
          os: true,
          events: true,
          querystring: true,
          "stream/web": true,
          worker_threads: true,
          http2: true,
        },
      },
    }),
    tsconfigPaths(),
  ],
});
