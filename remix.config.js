/** @type {import('@remix-run/dev').AppConfig} */
export default {
  // All the future flags are now in vite.config.js
  // All build configurations are also in vite.config.js
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "esm",
  
  // ✅ Add these for proper asset handling:
  publicPath: "/build/",
  assetsBuildDirectory: "public/build",
  serverBuildPath: "build/server/index.js",
};
