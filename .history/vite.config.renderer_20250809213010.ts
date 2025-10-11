import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  plugins: [tsconfigPaths()],
  build: {
    rollupOptions: {
      external: command === "build" ? [
        "google-auth-library",
        "https-proxy-agent",
        "node-fetch"
      ] : [],
    },
  },
}));
