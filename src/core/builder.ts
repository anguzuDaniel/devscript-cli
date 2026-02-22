import type { DevScriptData } from './parser.js';

/**
 * Builds the final structured prompt for the Gemini API.
 * Uses the v2 'DevScriptData' interface for strict typing.
 */
export function buildFinalPrompt(data: DevScriptData, hydratedCode: string): string {
  // Use fallbacks to prevent "undefined" appearing in the prompt
  const role = data.role || "Senior Software Engineer";
  const vibe = data.vibe || "Stoic, concise, and professional";
  const rules = data.rules && data.rules.length > 0 
    ? data.rules.map(r => `- ${r}`).join('\n') 
    : "- Follow standard clean code principles.";

  return `
# ROLE
${role}

# STYLE & VIBE
${vibe}

# CONSTRAINTS & RULES
${rules}
- Use <file path="RELATIVE_PATH">CODE</file> tags for all file modifications.

# CODE CONTEXT
${hydratedCode}

# YOUR TASK
${data.task || "No task provided. Analyze the code context above."}

Please provide the code solution directly within the specified file tags without conversational filler.
  `.trim();
}