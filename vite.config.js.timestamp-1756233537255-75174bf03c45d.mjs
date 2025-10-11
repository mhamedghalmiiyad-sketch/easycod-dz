// vite.config.js
import { vitePlugin as remix } from "file:///C:/ShopifyApps/easycod-dz/node_modules/@remix-run/dev/dist/index.js";
import { installGlobals } from "file:///C:/ShopifyApps/easycod-dz/node_modules/@remix-run/node/dist/index.js";
import { defineConfig } from "file:///C:/ShopifyApps/easycod-dz/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///C:/ShopifyApps/easycod-dz/node_modules/vite-tsconfig-paths/dist/index.js";
import { nodePolyfills } from "file:///C:/ShopifyApps/easycod-dz/node_modules/vite-plugin-node-polyfills/dist/index.js";
installGlobals({ nativeFetch: true });
if (process.env.HOST && (!process.env.SHOPIFY_APP_URL || process.env.SHOPIFY_APP_URL === process.env.HOST)) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}
var host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname;
var hmrConfig;
if (host === "localhost") {
  hmrConfig = { protocol: "ws", host: "localhost", port: 64999, clientPort: 64999 };
} else {
  hmrConfig = { protocol: "wss", host, port: parseInt(process.env.FRONTEND_PORT) || 8002, clientPort: 443 };
}
var vite_config_default = defineConfig({
  server: {
    port: Number(process.env.PORT || 3e3),
    hmr: hmrConfig,
    fs: { allow: ["app", "node_modules"] }
  },
  plugins: [
    nodePolyfills({
      include: ["buffer", "process"],
      globals: { Buffer: true, global: true, process: true }
    }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true
      }
    }),
    tsconfigPaths()
  ],
  build: {
    rollupOptions: {
      input: void 0
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".json": "json" },
      supported: { "import-attributes": true }
    }
  },
  define: {
    global: "globalThis"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxTaG9waWZ5QXBwc1xcXFxlYXN5Y29kLWR6XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxTaG9waWZ5QXBwc1xcXFxlYXN5Y29kLWR6XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9TaG9waWZ5QXBwcy9lYXN5Y29kLWR6L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgdml0ZVBsdWdpbiBhcyByZW1peCB9IGZyb20gXCJAcmVtaXgtcnVuL2RldlwiO1xyXG5pbXBvcnQgeyBpbnN0YWxsR2xvYmFscyB9IGZyb20gXCJAcmVtaXgtcnVuL25vZGVcIjtcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSBcInZpdGUtdHNjb25maWctcGF0aHNcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tIFwidml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHNcIjtcclxuXHJcbmluc3RhbGxHbG9iYWxzKHsgbmF0aXZlRmV0Y2g6IHRydWUgfSk7XHJcblxyXG4vLyBTaG9waWZ5IEhPU1QgKyBITVIgd29ya2Fyb3VuZFxyXG5pZiAoXHJcbiAgcHJvY2Vzcy5lbnYuSE9TVCAmJlxyXG4gICghcHJvY2Vzcy5lbnYuU0hPUElGWV9BUFBfVVJMIHx8XHJcbiAgICBwcm9jZXNzLmVudi5TSE9QSUZZX0FQUF9VUkwgPT09IHByb2Nlc3MuZW52LkhPU1QpXHJcbikge1xyXG4gIHByb2Nlc3MuZW52LlNIT1BJRllfQVBQX1VSTCA9IHByb2Nlc3MuZW52LkhPU1Q7XHJcbiAgZGVsZXRlIHByb2Nlc3MuZW52LkhPU1Q7XHJcbn1cclxuY29uc3QgaG9zdCA9IG5ldyBVUkwocHJvY2Vzcy5lbnYuU0hPUElGWV9BUFBfVVJMIHx8IFwiaHR0cDovL2xvY2FsaG9zdFwiKS5ob3N0bmFtZTtcclxubGV0IGhtckNvbmZpZztcclxuaWYgKGhvc3QgPT09IFwibG9jYWxob3N0XCIpIHtcclxuICBobXJDb25maWcgPSB7IHByb3RvY29sOiBcIndzXCIsIGhvc3Q6IFwibG9jYWxob3N0XCIsIHBvcnQ6IDY0OTk5LCBjbGllbnRQb3J0OiA2NDk5OSB9O1xyXG59IGVsc2Uge1xyXG4gIGhtckNvbmZpZyA9IHsgcHJvdG9jb2w6IFwid3NzXCIsIGhvc3QsIHBvcnQ6IHBhcnNlSW50KHByb2Nlc3MuZW52LkZST05URU5EX1BPUlQpIHx8IDgwMDIsIGNsaWVudFBvcnQ6IDQ0MyB9O1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogTnVtYmVyKHByb2Nlc3MuZW52LlBPUlQgfHwgMzAwMCksXHJcbiAgICBobXI6IGhtckNvbmZpZyxcclxuICAgIGZzOiB7IGFsbG93OiBbXCJhcHBcIiwgXCJub2RlX21vZHVsZXNcIl0gfSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIG5vZGVQb2x5ZmlsbHMoe1xyXG4gICAgICBpbmNsdWRlOiBbXCJidWZmZXJcIiwgXCJwcm9jZXNzXCJdLFxyXG4gICAgICBnbG9iYWxzOiB7IEJ1ZmZlcjogdHJ1ZSwgZ2xvYmFsOiB0cnVlLCBwcm9jZXNzOiB0cnVlIH0sXHJcbiAgICB9KSxcclxuICAgIHJlbWl4KHtcclxuICAgICAgZnV0dXJlOiB7XHJcbiAgICAgICAgdjNfZmV0Y2hlclBlcnNpc3Q6IHRydWUsXHJcbiAgICAgICAgdjNfcmVsYXRpdmVTcGxhdFBhdGg6IHRydWUsXHJcbiAgICAgICAgdjNfdGhyb3dBYm9ydFJlYXNvbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gICAgdHNjb25maWdQYXRocygpLFxyXG4gIF0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgaW5wdXQ6IHVuZGVmaW5lZCwgXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBlc2J1aWxkT3B0aW9uczoge1xyXG4gICAgICBsb2FkZXI6IHsgXCIuanNvblwiOiBcImpzb25cIiB9LFxyXG4gICAgICBzdXBwb3J0ZWQ6IHsgXCJpbXBvcnQtYXR0cmlidXRlc1wiOiB0cnVlIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgZGVmaW5lOiB7XHJcbiAgICBnbG9iYWw6IFwiZ2xvYmFsVGhpc1wiLFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1RLFNBQVMsY0FBYyxhQUFhO0FBQ3ZTLFNBQVMsc0JBQXNCO0FBQy9CLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sbUJBQW1CO0FBRTFCLFNBQVMscUJBQXFCO0FBRTlCLGVBQWUsRUFBRSxhQUFhLEtBQUssQ0FBQztBQUdwQyxJQUNFLFFBQVEsSUFBSSxTQUNYLENBQUMsUUFBUSxJQUFJLG1CQUNaLFFBQVEsSUFBSSxvQkFBb0IsUUFBUSxJQUFJLE9BQzlDO0FBQ0EsVUFBUSxJQUFJLGtCQUFrQixRQUFRLElBQUk7QUFDMUMsU0FBTyxRQUFRLElBQUk7QUFDckI7QUFDQSxJQUFNLE9BQU8sSUFBSSxJQUFJLFFBQVEsSUFBSSxtQkFBbUIsa0JBQWtCLEVBQUU7QUFDeEUsSUFBSTtBQUNKLElBQUksU0FBUyxhQUFhO0FBQ3hCLGNBQVksRUFBRSxVQUFVLE1BQU0sTUFBTSxhQUFhLE1BQU0sT0FBTyxZQUFZLE1BQU07QUFDbEYsT0FBTztBQUNMLGNBQVksRUFBRSxVQUFVLE9BQU8sTUFBTSxNQUFNLFNBQVMsUUFBUSxJQUFJLGFBQWEsS0FBSyxNQUFNLFlBQVksSUFBSTtBQUMxRztBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFFBQVE7QUFBQSxJQUNOLE1BQU0sT0FBTyxRQUFRLElBQUksUUFBUSxHQUFJO0FBQUEsSUFDckMsS0FBSztBQUFBLElBQ0wsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLGNBQWMsRUFBRTtBQUFBLEVBQ3ZDO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxjQUFjO0FBQUEsTUFDWixTQUFTLENBQUMsVUFBVSxTQUFTO0FBQUEsTUFDN0IsU0FBUyxFQUFFLFFBQVEsTUFBTSxRQUFRLE1BQU0sU0FBUyxLQUFLO0FBQUEsSUFDdkQsQ0FBQztBQUFBLElBQ0QsTUFBTTtBQUFBLE1BQ0osUUFBUTtBQUFBLFFBQ04sbUJBQW1CO0FBQUEsUUFDbkIsc0JBQXNCO0FBQUEsUUFDdEIscUJBQXFCO0FBQUEsTUFDdkI7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELGNBQWM7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsT0FBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixnQkFBZ0I7QUFBQSxNQUNkLFFBQVEsRUFBRSxTQUFTLE9BQU87QUFBQSxNQUMxQixXQUFXLEVBQUUscUJBQXFCLEtBQUs7QUFBQSxJQUN6QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLFFBQVE7QUFBQSxFQUNWO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
