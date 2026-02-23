import fs from 'fs';
import { parseDevScript, type DevScriptData } from './parser.js';

/**
 * Aggregates multiple DevScript files into a single architectural blueprint.
 */
export function aggregateDevScripts(files: string[]): DevScriptData {
  const master: DevScriptData = {
    role: "Senior Architect",
    vibe: "Stoic, professional",
    rules: [],
    tech: [],
    contextFiles: [],
    tests: [],
    task: ""
  };

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = parseDevScript(raw);

    // Merge logic
    if (parsed.role) master.role = parsed.role;
    if (parsed.vibe) master.vibe = parsed.vibe;
    if (parsed.task) master.task += `\n${parsed.task}`;
    
    if (parsed.rules) master.rules.push(...parsed.rules);
    if (parsed.contextFiles) master.contextFiles.push(...parsed.contextFiles);
    if (parsed.tests) master.tests.push(...parsed.tests);
  }

  return master;
}