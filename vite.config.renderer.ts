import path from "path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "app/entry.client.ts"), // adjust if needed
    },
    outDir: "public/build",
  },
});
