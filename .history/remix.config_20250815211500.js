/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "esm",
  browserNodeBuiltinsPolyfill: {
    modules: {
      assert: true,
      buffer: true,
      child_process: true,
      crypto: true,
      events: true,
      fs: true,
      http: true,
      https: true,
      net: true,
      os: true,
      path: true,
      process: true,
      querystring: true,
      "stream/web": true,
      stream: true,
      tls: true,
      url: true,
      util: true,
      // worker_threads: true,
      zlib: true,
    }
  },
};