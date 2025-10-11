import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

installGlobals({ nativeFetch: true });

console.log("Loading vite.config.ts");

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
      // Consolidated browser polyfills here
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
          querystring: true,
          stream: true,
          "stream/web": true,
          tls: true,
          url: true,
          util: true,
          worker_threads: true,
          zlib: true,
        },
      },
      serverNodeBuiltinsPolyfill: {
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
          querystring: true,
          stream: true,
          tls: true,
          url: true,
          util: true,
          zlib: true,
        },
      },
      serverModuleFormat: "cjs",
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
            return "assets/easycod-form-bundle.js";
          }
          return "assets/[name]-[hash].js";
        },
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  ssr: {
    noExternal: [
      "@shopify/polaris",
      "@shopify/app-bridge-react",
      "react",
      "react-dom",
      "isomorphic-dompurify",
      "crypto-browserify",
      "querystring-es3",
    ],
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
      "safe-buffer",
      "jws",
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
      "safe-buffer",
      "jws",
    ],
  },
});