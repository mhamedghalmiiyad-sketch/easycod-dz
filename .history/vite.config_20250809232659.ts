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
      ignoredRouteFiles: ["**/.*"],
    }),
    tsconfigPaths(),
  ],
  // Temporarily disabled CSS processing
  // css: {
  //   postcss: "./postcss.config.js",
  // },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        app: resolve(__dirname, "index.html"),
        renderer: resolve(__dirname, "app/form-renderer/index.tsx"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'renderer') {
            return 'form-renderer.js';
          }
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  esbuild: {
    target: 'es2022',
    supported: {
      'import-assertions': true
    }
  },
  ssr: {
    external: ['google-auth-library', 'googleapis'],
  },
  optimizeDeps: {
    exclude: ['google-auth-library', 'googleapis'],
    esbuildOptions: {
      target: 'es2022',
      supported: {
        'import-assertions': true
      }
    }
  },
});