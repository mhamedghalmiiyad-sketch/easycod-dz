import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";

installGlobals({ nativeFetch: true });

// This block is for HMR (Hot Module Replacement) during local development.
// It correctly sets up the WebSocket connection for live updates.
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
  hmrConfig = { protocol: "ws", host: "localhost", port: 64999, clientPort: 64999 };
} else {
  hmrConfig = { protocol: "wss", host, port: parseInt(process.env.FRONTEND_PORT) || 8002, clientPort: 443 };
}

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: { allow: ["app", "node_modules"] },
  },
  plugins: [
    // This plugin helps with Node.js global variables and modules in the browser.
    nodePolyfills({
      include: ["buffer", "process"],
      globals: { Buffer: true, global: true, process: true },
    }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    // The Remix Vite plugin automatically handles server vs. client builds,
    // including externalizing server-only packages. Manually defining 'external'
    // often leads to the "bare specifier" error on the client.
    // By removing the manual rollupOptions.external, we let the plugin do its job.
  },
  optimizeDeps: {
    include: [
      'react-i18next',
      'i18next'
    ],
    esbuildOptions: {
      loader: { ".json": "json" },
      supported: { "import-attributes": true },
    },
  },
  // Ensure we don't hardcode any environment variables at build time.
  // They should be read from the environment at runtime.
  define: {
    global: "globalThis",
  },
});
