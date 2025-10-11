import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

installGlobals({ nativeFetch: true });

// Shopify HOST and HMR workaround (unchanged)
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
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, "index.html"),
        renderer: resolve(__dirname, "app/form-renderer/index.tsx"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "renderer") {
            return "form-renderer.js";
          }
          return "assets/[name]-[hash].js";
        },
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  // Node.js polyfills for the browser - handled by Vite's define and resolve.alias
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Add Node.js polyfills if needed for browser
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      crypto: 'crypto-browserify',
      path: 'path-browserify',
      // fs is omitted as it cannot be polyfilled in browser
    },
  },
  ssr: {
    external: [
      "google-auth-library",
      "googleapis",
      "@google-cloud/firestore",
      "firebase",
      "gaxios",
      "node-fetch",
      "https-proxy-agent",
      "agent-base",
      "fetch-blob",
      "node-domexception",
      "google-logging-utils",
      "jsdom",
      "isomorphic-dompurify",
    ],
  },
  optimizeDeps: {
    exclude: [
      "google-auth-library",
      "googleapis",
      "@google-cloud/firestore",
      "firebase",
      "gaxios",
      "node-fetch",
      "https-proxy-agent",
      "agent-base",
      "fetch-blob",
      "node-domexception",
      "google-logging-utils",
      "jsdom",
      "isomorphic-dompurify",
    ],
    include: ['buffer', 'process'],
  },
});