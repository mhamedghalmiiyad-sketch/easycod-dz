import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "app/entry.client.tsx"), // 👈 point to Remix entry
    },
    outDir: "public/build", // match Remix's public build location
  },
});
