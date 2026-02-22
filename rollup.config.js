import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'bin/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'es',
    banner: '#!/usr/bin/env node'
  },
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: { module: 'esnext', noEmit: false }
    })
  ],
  external: ['ink', 'react', 'commander', 'dotenv', '@google/generative-ai'] // Keep these external for now
};