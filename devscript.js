#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entryPath = path.join(__dirname, 'bin/index.ts');

spawn('node', [
  '--no-warnings',
  '--loader', 'ts-node/esm',
  entryPath,
  ...process.argv.slice(2)
], { stdio: 'inherit' });