// vite.config.renderer.ts
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    ssr: false, // Not an SSR build
    outDir: "public/build", // Match Remix's build output
    emptyOutDir: false, // Avoid deleting Remix output
    rollupOptions: {
      // Set the entry to your Remix client entry
      input: path.resolve(__dirname, "app/entry.client.tsx"),
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
