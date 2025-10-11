import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

installGlobals({ nativeFetch: true });

// Shopify HOST + HMR workaround
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

// Add hot reload port for CLI
if (process.env.NODE_ENV === 'development') {
  hmrConfig.clientPort = hmrConfig.port;
}

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: { allow: ["app", "node_modules"] },
  },
  plugins: [
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
    rollupOptions: {
      input: undefined,
      external: (id) => {
        // Externalize i18next dependencies for SSR
        if (id.includes('i18next-fs-backend') || id.includes('i18next-http-middleware')) {
          return true;
        }
        return false;
      },
    },
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
  define: {
    global: "globalThis",
  },
});
