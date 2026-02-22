import { build } from 'esbuild';

build({
  entryPoints: ['bin/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/bundle.js',
  external: ['canvas', 'readline'], // Common ink conflicts
  banner: {
    js: '#!/usr/bin/env node',
  },
}).catch(() => process.exit(1));