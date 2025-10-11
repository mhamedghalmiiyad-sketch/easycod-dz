// vite.config.ts
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_lazyRouteDiscovery: true,
        v3_relativeSplatPath: true,
        v3_singleFetch: true,
        v3_throwAbortReason: true,
      },
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
