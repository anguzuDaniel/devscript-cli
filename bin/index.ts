#!/usr/bin/env node --loader ts-node/esm --no-warnings

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import fs from 'fs';
import { RunCommandUI } from '../src/ui/RunCommandUI.js';
import "dotenv/config";

const program = new Command();

program
  .name('devscript')
  .description('A structured prompting language for developers')
  .version('1.0.0');

program
  .command('run')
  .description('Compile and execute a .dev file')
  .argument('<file>', 'path to the .dev file')
  .action((file) => {
    // This launches our React-based terminal UI
    render(React.createElement(RunCommandUI, { filePath: file }));
  });

program.parse();

const command = process.argv[2];
const argument = process.argv[3];

if (command === 'init') {
  const template = `# Senior Developer
% Stoic and Concise
! Use TypeScript
@ src/index.ts
> Explain the logic of this file.
`;
  fs.writeFileSync('template.dev', template);
  console.log('✅ Created template.dev. Edit it and run: devscript run template.dev');
  process.exit(0);
}
