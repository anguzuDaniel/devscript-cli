#!/usr/bin/env node --loader ts-node/esm --no-warnings
import { Command } from 'commander';
import { render } from 'ink';
import chalk from 'chalk';
import React from 'react';
import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { execSync, exec } from 'child_process';
import clipboard from 'clipboardy';

// Internal Imports
import { RunCommandUI } from '../src/ui/RunCommandUI.js';
import { parseDevScript } from '../src/core/parser.js';
import { buildFinalPrompt } from '../src/core/builder.js';
import { applyChanges } from '../src/core/writer.js';
import { hydrateContext } from '../src/core/hydrator.js';
import { engine } from '../src/core/engine.js';
import { aggregateDevScripts } from '../src/core/aggregateDevScripts.js';

const program = new Command();

// ◈ Constants
const OUTPUT_FILE = path.resolve(process.cwd(), 'devscript.output.md');

// ◈ Utility: Text-to-Speech
const speak = (msg: string) => {
  exec(`say -v Alex "${msg}"`);
};

// ◈ Utility: Recursive File Finder
const getDevFiles = (dir: string): string[] => {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git'].includes(file)) {
        results = results.concat(getDevFiles(fullPath));
      }
    } else if (file.endsWith('.dev')) {
      results.push(fullPath);
    }
  });
  return results;
};

/**
 * The core automation engine: Bundles context, calls the AI Engine, and writes files.
 */
async function manifestLogic(folder: string) {
  try {
    const files = getDevFiles(folder);
    if (files.length === 0) return;

    const masterData = aggregateDevScripts(files);
    const context = await hydrateContext(masterData.contextFiles || []);
    const prompt = buildFinalPrompt(masterData, context);

    console.log(chalk.cyan(`◈ Consulting ${engine.getAuthService().getActiveProvider()} (${masterData.role})...`));

    // Refactored to use the Engine orchestrator
    const response = await engine.generateResponse(prompt);

    const results = applyChanges(response);

    if (results.length > 0) {
      console.log(chalk.green(`✔ Manifested ${results.length} files successfully.`));
    } else {
      console.log(chalk.yellow("⚠️ AI returned no file blocks. Check your .dev rules."));
    }
  } catch (err: any) {
    console.error(chalk.red("❌ Manifestation Error:"), err.message);
  }
}

program
  .name('devscript')
  .description('A structured prompting language for developers')
  .version('1.0.0');

// ◈ New Command: Login
program
  .command('login')
  .description('Triggers the Google OAuth browser flow')
  .action(async () => {
    await engine.getAuthService().loginWithGoogle();
  });

// ◈ New Command: Config
const config = program.command('config').description('Configure devscript settings');

config
  .command('set-engine <provider>')
  .description('Switches the active AI engine (gemini, openai, ollama)')
  .action((provider) => {
    engine.getAuthService().setActiveProvider(provider);
    console.log(chalk.green(`✔ Active engine set to: ${provider}`));
  });

config
  .command('set-key <provider> <key>')
  .description('Saves an API key locally to ./.devscript/config.json')
  .action((provider, key) => {
    engine.getAuthService().setApiKey(provider, key);
    console.log(chalk.green(`✔ API key saved for ${provider} in local ./.devscript folder.`));
  });

config
  .command('use <provider>')
  .description('Switches the active provider for the current project')
  .action((provider) => {
    engine.getAuthService().setActiveProvider(provider);
    console.log(chalk.green(`✔ Active provider switched to: ${provider}`));
  });

config
  .command('set-google-creds <clientId> <clientSecret>')
  .description('Sets the Google OAuth2 credentials')
  .action((clientId, clientSecret) => {
    engine.getAuthService().setGoogleCredentials(clientId, clientSecret);
    console.log(chalk.green('✔ Google credentials saved successfully.'));
  });

// ◈ Command: Run (Standalone UI)
program
  .command('run')
  .argument('<file>', 'path to the .dev file')
  .option('-s, --screenshot', 'Capture screen region before running')
  .action(async (file, options) => {
    try {
      if (options.screenshot) {
        console.log(chalk.yellow("◈ Select screen region..."));
        execSync(`screencapture -i ./temp_vision.png`);
        speak("Visual context captured.");
      }

      console.log(chalk.cyan(`📂 Loading script: ${file}`));
      const instance = render(React.createElement(RunCommandUI, { 
        filePath: file,
        hasImage: options.screenshot
      }));
      await instance.waitUntilExit(); 
    } catch (err) {
      console.error(chalk.red("❌ Critical UI Error:"), err);
    }
  });

// ◈ Existing Commands (Refactored where needed)
program
  .command('sync [folder]')
  .description('Automated Sync: Link, Consult, and Manifest in one step')
  .action(async (folder = './devscripts') => {
    console.log(chalk.magenta("◈ INITIATING AUTOMATED MANIFEST..."));
    await manifestLogic(folder);
  });

program
  .command('manifest [folder]')
  .description('Package, Consult AI, and Manifest files automatically')
  .action(async (folder = './devscripts') => {
    console.log(chalk.magenta("◈ INITIATING AUTOMATED MANIFEST..."));
    await manifestLogic(folder);
  });

program
  .command('watch [folder]')
  .description('Live Agent: Auto-manifests on every save')
  .action(async (folder = './devscripts') => {
    console.log(chalk.magenta("◈ LIVE AGENT ACTIVE"));
    console.log(chalk.dim(`Watching ${folder} for changes...`));

    let debounceTimer: NodeJS.Timeout | null = null;
    fs.watch(folder, { recursive: true }, (event, filename) => {
      if (event === 'change' && filename?.endsWith('.dev')) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          console.log(chalk.yellow(`\n◈ Change detected: ${filename}. Syncing...`));
          await manifestLogic(folder);
        }, 500);
      }
    });
  });

// ... (Rest of the commands like build, package, init, list remain similar but should use the logic)
// I'll keep the ones I had before but ensure they use manifestLogic or similar if they call AI.

program
  .command('build')
  .description('Parse .output.md and apply changes manually')
  .action(() => {
    if (!fs.existsSync(OUTPUT_FILE)) {
      console.log(chalk.red(`❌ Error: ${path.basename(OUTPUT_FILE)} not found.`));
      return;
    }
    const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
    const count = applyChanges(content);
    if (count.length > 0) {
      console.log(chalk.green(`🚀 Build Successful: ${count} files synchronized.`));
      speak("Build complete.");
    }
  });

program
  .command('init')
  .description('Initialize a new .dev template')
  .action(() => {
    const template = `@role Senior Architect\n@vibe Stoic\n@tech TypeScript\n@use src/index.ts\n\n@task\nExplain this file.`;
    fs.writeFileSync('devscript.dev', template);
    console.log(chalk.green('✅ Created devscript.dev.'));
  });

program
  .command('list')
  .description('List available .dev files')
  .action(() => {
    const files = getDevFiles(process.cwd());
    if (files.length === 0) return console.log(chalk.yellow("◈ No .dev files found."));
    console.log(chalk.cyan("\n◈ Available DevScripts:"));
    files.forEach((file, i) => console.log(`  ${i + 1}. ${path.relative(process.cwd(), file)}`));
  });

// ◈ Execution
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red("❌ Program Crash:"), err);
  process.exit(1);
});
