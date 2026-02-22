import type { DevScriptContent } from './parser.js';

export function buildFinalPrompt(data: DevScriptContent, hydratedCode: string): string {
  return `
# ROLE
Act as a ${data.persona}.

# RULES & CONSTRAINTS
${data.rules.map(r => `- ${r}`).join('\n')}

# CODE CONTEXT
${hydratedCode}

# YOUR TASK
${data.task}

Please provide the code solution directly without conversational filler.
  `.trim();
}