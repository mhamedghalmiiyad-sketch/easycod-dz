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
  serverDependenciesToBundle: [
    // Move these dependencies to server-only
    "node-fetch",
    "fetch-blob", 
    "node-domexception",
    "google-auth-library",
    "google-logging-utils",
    "https-proxy-agent",
    "agent-base"
  ],
  browserNodeBuiltinsPolyfill: {
    modules: {
      // Essential polyfills only
      buffer: true,
      process: true,
      util: true,
      url: true,
      path: true,
      events: true,
      stream: true,
      querystring: true,
      crypto: true,
      http: true,
      https: true,
      zlib: true,
      net: true,
      os: true,
      assert: true,
      
      // Node: prefixed versions
      "node:buffer": true,
      "node:process": true,
      "node:util": true,
      "node:url": true,
      "node:path": true,
      "node:stream": true,
      "node:crypto": true,
      "node:http": true,
      "node:https": true,
      "node:zlib": true,
      "node:net": true,
      "node:os": true,
      "node:stream/web": true,
    },
  },
};