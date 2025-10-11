/** @type {import('@remix-run/dev').AppConfig} */
export default {
  future: {
    v3_fetcherPersist: true,
    v3_lazyRouteDiscovery: true,
    v3_relativeSplatPath: true,
    v3_singleFetch: true,
    v3_throwAbortReason: true,
  },
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "esm",
  serverBuildTarget: "node-cjs",
  // Remove problematic dependencies from browser bundle
  browserNodeBuiltinsPolyfill: {
    modules: {
      // Only safe, essential polyfills
      buffer: true,
      process: true,
      util: true,
      url: true,
      path: true,
      events: true,
      stream: true,
      querystring: true,
      crypto: true,
      
      // Node: prefixed versions
      "node:buffer": true,
      "node:process": true,
      "node:util": true,
      "node:url": true,
      "node:path": true,
      "node:stream": true,
      "node:crypto": true,
    },
  },
  // Exclude problematic packages from client build
  serverDependenciesToBundle: "all",
};