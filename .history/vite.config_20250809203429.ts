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
      // The buildDirectory should point to your public folder
      buildDirectory: "public/build", // ✅ CORRECTED from assetsBuildDirectory

      // This polyfill configuration is generally not recommended.
      // See Remix docs for moving server-only code to .server files.
      browserNodeBuiltinsPolyfill: {
        modules: {
          assert: true,
          buffer: true,
          child_process: true,
          crypto: true,
          events: true,
          fs: true,
          http: true,
          https: true,
          net: true,
          os: true,
          path: true,
          process: true,
          "stream/web": true,
          stream: true,
          url: true,
          util: true,
          zlib: true,
        },
      },
    }),
    tsconfigPaths(),
  ],
});