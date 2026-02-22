#!/usr/bin/env node --loader ts-node/esm --no-warnings
import { Command } from 'commander';
import { render } from 'ink';
import chalk from 'chalk';
import React from 'react';
import "dotenv/config";
import fs from 'fs';
import { RunCommandUI} from '../src/ui/RunCommandUI.js';

const program = new Command();

program
  .name('devscript')
  .description('A structured prompting language for developers')
  .version('1.0.0');

program
  .command('run')
  .argument('<file>', 'path to the .dev file')
  .action(async (file) => {
      try {
        console.log(`📂 Loading script: ${file}`);
        
        // A tiny tick to let the terminal settle
        await new Promise(resolve => setTimeout(resolve, 100));

        const instance = render(React.createElement(RunCommandUI, { filePath: file }));
        await instance.waitUntilExit(); 
      } catch (err) {
        console.error("❌ Critical UI Error:", err);
      }
    });

program
  .command('init')
  .description('Initialize a new .dev template')
  .action(() => {
    const template = `@role Senior Developer
@vibe Stoic and Concise
@rule Use TypeScript
@use src/index.ts

@task
Explain the logic of this file.`;
    fs.writeFileSync('template.dev', template);
    console.log('✅ Created template.dev. Run: devscript run template.dev');
  });

// Catch unhandled rejections
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

program
  .command('list')
  .description('List available .dev files and choose one to run')
  .action(async () => {
    const files = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.dev'));
    
    if (files.length === 0) {
      console.log(chalk.yellow("◈ No .dev files found. Run 'devscript init' to create one."));
      return;
    }

    console.log(chalk.cyan("\n◈ Available DevScripts:"));
    files.forEach((file, i) => console.log(`  ${i + 1}. ${file}`));
    
    // In a future update, we can use 'inquirer' or 'enquirer' here for arrow-key selection
    console.log(chalk.dim("\nUsage: devscript run <filename>"));
  });

program
  .command('setup')
  .description('Configure your global Gemini API key')
  .action(() => {
    console.log(chalk.cyan("◈ DevScript Global Setup"));
    // You would use a library like 'prompts' here to ask for the key
    console.log("Please add your key to ~/.devscript/config.json");
  });

// ◈ THE FIX: Use parseAsync instead of parse
program.parseAsync(process.argv).catch((err) => {
  console.error("❌ Program Crash:", err);
  process.exit(1);
});