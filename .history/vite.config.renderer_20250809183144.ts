// vite.config.renderer.ts

import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

// This is a standalone config for building ONLY the form renderer.
export default defineConfig({
  plugins: [
    // We do NOT include the remix() plugin here.
    tsconfigPaths(),
  ],
  build: {
    // Tell Vite to build this into a library format.
    lib: {
      entry: resolve(__dirname, "app/form-renderer/index.tsx"),
      name: "EasyCodForm",
      fileName: () => "easycod-form-bundle.js",
      formats: ["iife"], // A self-executing format for browser <script> tags
    },
    // Output directory
    outDir: "public/assets",
    // Empty the output directory before building
    emptyOutDir: false,
  },
});