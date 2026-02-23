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
import { askGemini } from '../src/services/gemini.js';
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
 * The core automation engine: Bundles context, calls Gemini, and writes files.
 */
async function manifestLogic(folder: string) {
  try {
    // 1. Collect and Aggregate all .dev files in the folder
    const files = getDevFiles(folder);
    if (files.length === 0) return;

    const masterData = aggregateDevScripts(files);

    // 2. Hydrate @use directives (Directory Hydration v2.0)
    const context = await hydrateContext(masterData.contextFiles || []);
    const prompt = buildFinalPrompt(masterData, context);

    console.log(chalk.cyan(`◈ Consulting Gemini (${masterData.role})...`));

    // 3. Direct API Request
    const response = await askGemini(prompt, process.env.GEMINI_API_KEY!);

    // 4. Atomic Write to Disk
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

// ◈ Command: Link & Watch
program
  .command('link [folder]')
  .description('Package files and wait for AI response in .output.md')
  .action(async (folder = './devscripts') => {
    const files = getDevFiles(folder);
    if (files.length === 0) {
      console.log(chalk.red(`❌ No .dev files found in ${folder}`));
      return;
    }

    let masterContext = "# PROJECT SYSTEM RULES\n";
    for (const file of files) {
      const data = parseDevScript(fs.readFileSync(file, 'utf-8'));
      masterContext += `\n## From ${path.basename(file)}:\n${buildFinalPrompt(data, "")}`;
    }
    
    await clipboard.write(masterContext);
    
    console.log(chalk.green(`◈ Linked ${files.length} files. Rules copied to clipboard.`));
    console.log(chalk.cyan("◈ Entering 'Watch & Apply' mode..."));
    console.log(chalk.dim(`  1. Paste context into your AI.`));
    console.log(chalk.dim(`  2. Save the AI response into 'devscript.output.md'.`));
    console.log(chalk.dim(`  3. I will automatically build the files.`));

    if (!fs.existsSync(OUTPUT_FILE)) fs.writeFileSync(OUTPUT_FILE, "");

    // Using watchFile for better stability across different IDE save behaviors
    fs.watch(process.cwd(), (eventType, filename) => {
      if (filename === 'devscript.output.md' && eventType === 'change') {
        const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
        if (content.trim()) {
          console.log(chalk.yellow("\n◈ Auto-Build Triggered..."));
          const count = applyChanges(content);
          if (count.length > 0) speak(`${count} files updated.`);
        }
      }
    });

    await new Promise(() => {}); 
  });

// ◈ Command: Build (Manual trigger)
program
  .command('build')
  .description('Parse .output.md and apply changes manually')
  .action(() => {
    if (!fs.existsSync(OUTPUT_FILE)) {
      console.log(chalk.red(`❌ Error: ${path.basename(OUTPUT_FILE)} not found.`));
      return;
    }

    const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
    console.log(chalk.cyan(`◈ Parsing ${path.basename(OUTPUT_FILE)}...`));

    const count = applyChanges(content);
    if (count.length > 0) {
      console.log(chalk.green(`🚀 Build Successful: ${count} files synchronized.`));
      speak("Build complete.");
    } else {
      console.log(chalk.yellow("⚠️ No valid <file> tags found."));
    }
  });

// ◈ Command: Package
program
  .command('package [folder]')
  .description('Merge rules into .output.md for manual review')
  .option('-s, --screenshot', 'Include visual context')
  .action((folder = './devscripts', options) => {
    const files = getDevFiles(folder);
    let context = "# ◈ DEVSCRIPT MASTER RULES ◈\n\n";
    
    for (const file of files) {
      const raw = fs.readFileSync(file, 'utf-8');
      context += `\n--- SOURCE: ${path.basename(file)} ---\n${raw}\n`;
    }

    if (options.screenshot) {
      execSync(`screencapture -i ./temp_vision.png`);
      context += `\n\n# VISUAL CONTEXT\n[Snapshot captured in temp_vision.png]\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, context);
    console.log(chalk.green(`✅ Created ${path.basename(OUTPUT_FILE)}.`));
  });

program
  .command('watch [folder]')
  .description('Live Agent: Auto-manifests on every save')
  .action(async (folder = './devscripts') => {
    console.log(chalk.magenta("◈ LIVE AGENT ACTIVE"));
    console.log(chalk.dim(`Watching ${folder} for changes...`));

    // Debounce timer to prevent multiple triggers on a single save
    let debounceTimer: NodeJS.Timeout | null = null;

    fs.watch(folder, { recursive: true }, (event, filename) => {
      if (event === 'change' && filename?.endsWith('.dev')) {
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
          console.log(chalk.yellow(`\n◈ Change detected: ${filename}. Syncing...`));
          await manifestLogic(folder);
        }, 500); // 500ms delay to ensure file write is complete
      }
    });
  });

program
  .command('sync [folder]')
  .description('Automated Sync: Link, Consult, and Manifest in one step')
  .action(async (folder = './devscripts') => {
    console.log(chalk.magenta("◈ INITIATING AUTOMATED MANIFEST..."));

    try {
      // 1. Package the Context
      const files = getDevFiles(folder);
      let masterData = aggregateDevScripts(files); 
      
      // 2. Hydrate @use directives
      const context = await hydrateContext(masterData.contextFiles);
      const prompt = buildFinalPrompt(masterData, context);

      console.log(chalk.cyan(`◈ Consulting Gemini (${masterData.role})...`));
      
      // 3. Direct API Call
      const response = await askGemini(prompt, process.env.GEMINI_API_KEY!);

      // 4. Auto-Apply (No manual devscript.output.md needed)
      console.log(chalk.yellow("◈ AI Response received. Manifesting changes..."));
      const results = applyChanges(response);

      if (results.length > 0) {
        speak(`${results.length} files manifested.`);
        console.log(chalk.green(`\n🚀 SUCCESS: ${results.length} files synchronized.`));
      } else {
        console.log(chalk.red("❌ Error: AI response contained no valid <file> tags."));
      }
    } catch (err: any) {
      console.error(chalk.red("❌ Automation Failed:"), err.message);
    }
  });

program
  .command('manifest [folder]')
  .description('Package, Consult AI, and Manifest files automatically')
  .action(async (folder = './devscripts') => {
    console.log(chalk.magenta("◈ INITIATING AUTOMATED MANIFEST..."));

    try {
      // 1. Package the Context
      const files = getDevFiles(folder);
      const masterData = aggregateDevScripts(files); 
      
      // 2. Hydrate @use directives
      const context = await hydrateContext(masterData.contextFiles || []);
      const prompt = buildFinalPrompt(masterData, context);

      console.log(chalk.cyan(`◈ Consulting Gemini (${masterData.role})...`));
      
      // 3. Direct API Call (Ensure askGemini is imported/defined)
      const response = await askGemini(prompt, process.env.GEMINI_API_KEY!);

      // 4. Auto-Apply (Bypassing devscript.output.md entirely)
      console.log(chalk.yellow("◈ AI Response received. Manifesting..."));
      const results = applyChanges(response);

      if (results.length > 0) {
        speak(`${results.length} files updated.`);
        console.log(chalk.green(`\n🚀 SUCCESS: ${results.length} files manifested.`));
      } else {
        console.log(chalk.red("❌ Error: AI response contained no valid <file> tags."));
      }
    } catch (err: any) {
      console.error(chalk.red("❌ Manifestation Failed:"), err.message);
    }
  });

// ◈ Helper Commands: Init & List
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