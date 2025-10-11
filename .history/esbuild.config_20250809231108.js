const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['app/form-renderer/index.tsx'],
  bundle: true,
  outfile: 'extensions/easycod-embed/assets/easycod-form-bundle.js',
  minify: true,
  target: 'es2022',
  format: 'esm',
  supported: {
    'import-assertions': true
  }
}).catch(() => process.exit(1));