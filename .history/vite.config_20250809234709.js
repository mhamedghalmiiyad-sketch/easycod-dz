import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";

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
  ],
  build: {
    target: "esnext",
    outDir: "build",
    minify: "esbuild",
    rollupOptions: {
      // Additional Rollup options if needed
    },
  },
});