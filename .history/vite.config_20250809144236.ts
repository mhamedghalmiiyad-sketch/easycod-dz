import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { resolve } from "path";

installGlobals({ nativeFetch: true });

console.log("Loading vite.config.ts");

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
      serverModuleFormat: "cjs",
    }),
    nodePolyfills({
      include: [
        "http",
        "https",
        "zlib",
        "stream",
        "buffer",
        "util",
        "url",
        "net",
        "tls",
        "assert",
        "process",
        "stream/web",
        "fs",
        "path",
        "worker_threads",
        "child_process",
        "os",
        "events",
        "querystring",
        "crypto",
      ],
    }),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "node-fetch": false,
      "https-proxy-agent": false,
      "agent-base": false,
      "fetch-blob": false,
      "node-domexception": false,
      "google-auth-library": false,
      "googleapis": false,
      "google-logging-utils": false,
      "safe-buffer": false,
      "jws": false,
    },
  },
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
  ssr: {
    noExternal: [
      "@shopify/polaris",
      "@shopify/app-bridge-react",
      "react",
      "react-dom",
      "isomorphic-dompurify",
    ],
    external: [
      "google-auth-library",
      "googleapis",
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