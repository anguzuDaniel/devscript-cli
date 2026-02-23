import type { DevScriptData } from './parser.js';

/**
 * Translates parsed DevScript tags into a structured LLM prompt.
 * Optimized for Novus Software Consultancy automation loop.
 */
export function buildFinalPrompt(data: DevScriptData, hydratedCode: string): string {
  
  // 1. Define the variables within the function scope
  const userRules = data.rules && data.rules.length > 0 
    ? data.rules.map(r => `• ${r}`).join('\n') 
    : "Follow standard clean code principles.";

  const testScenarios = data.tests && data.tests.length > 0
    ? `\n# LOGIC VALIDATION (TEST CASES)\n${data.tests.map(t => `[ASSERT]: ${t}`).join('\n')}`
    : "";

  const antiPatterns = [
    "Do not use 'any' in TypeScript; use strict interfaces.",
    "Avoid nested if-statements; use early returns.",
    "Do not provide conversational 'fluff'—provide code only."
  ].map(ap => `[BLOCK]: ${ap}`).join('\n');

  // 2. Return the template using the variables defined above
  return `
# ROLE & VIBE
Act as: ${data.role || 'Lead Architect'}.
Tone: ${data.vibe || 'Stoic, precise'}.

# PROJECT CONTEXT
The following code has been hydrated from your @use directives:
${hydratedCode}

# FORBIDDEN PATTERNS
${antiPatterns}
${testScenarios}

# CONSTRAINTS & RULES
${userRules}

# OBJECTIVE
${data.task || "Analyze context and provide architectural feedback."}

# ◈ MANDATORY RESPONSE FORMAT ◈
You are a code-generation engine. You MUST output all files using the following XML-style tags. 
DO NOT use standard Markdown code blocks ( \`\`\` ). 

REQUIRED SCHEMA:
<file path="RELATIVE_PATH_FROM_ROOT">
// Your code here
</file>

MANDATORY: Return the solution ONLY in the format above. No conversational filler.
    `.trim();
}