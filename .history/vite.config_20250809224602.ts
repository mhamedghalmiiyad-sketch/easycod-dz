// In vite.config.ts

import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { shopifyApp } from "@shopify/shopify-app-remix";
import { resolve } from "path";

// According to the latest Shopify Remix template, `installGlobals()` is often handled
// by the Shopify CLI. You can uncomment the following lines if you run into issues.
// import { installGlobals } from "@remix-run/node";
// installGlobals();

export default defineConfig({
  // The `shopifyApp` plugin now handles server and HMR configuration automatically,
  // so the manual setup has been removed.
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    // The Shopify plugin must be included. It simplifies many configuration steps.
    shopifyApp({
      // Your Shopify app config can go here if needed, but defaults are often sufficient.
    }),
    tsconfigPaths(),
  ],
  build: {
    // This custom rollup configuration is preserved from your original file
    // to handle the separate 'form-renderer' entry point.
    rollupOptions: {
      input: {
        // Ensure you have an index.html at the project root for this entry point.
        app: resolve(__dirname, "index.html"),
        renderer: resolve(__dirname, "app/form-renderer/index.tsx"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'renderer') {
            return 'form-renderer.js';
          }
          // Default naming for other entry points
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  // The 'serverNodeBuiltinsPolyfill' option you had is not valid. Server-only
  // dependencies should be handled by using `.server.ts` files and ensuring they
  // are correctly externalized from the client bundle below.

  // Ensure server-only modules are not bundled for the client.
  ssr: {
    // This tells Vite to keep these modules as external dependencies in the server build.
    external: ['google-auth-library', 'googleapis'],
  },
  optimizeDeps: {
    // This prevents Vite from pre-bundling these dependencies.
    exclude: ['google-auth-library', 'googleapis'],
  },
});
