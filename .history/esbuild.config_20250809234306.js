import { build } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";

async function runBuild() {
  try {
    await build({
      // Your Vite configuration
      plugins: [
        remix({
          // Pass Remix-specific options here if needed
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
    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

runBuild();