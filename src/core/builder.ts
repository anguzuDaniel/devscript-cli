import type { DevScriptData } from './parser.js';

/**
 * Translates parsed DevScript tags into a structured LLM prompt.
 */
export function buildFinalPrompt(data: DevScriptData, hydratedCode: string): string {
  
  // 1. Logic for @rule (Mapping user constraints)
  const userRules = data.rules.length > 0 
    ? data.rules.map(r => `• ${r}`).join('\n') 
    : "Follow standard clean code principles.";

  // 2. Logic for @test (Defining behavioral anchors)
  const testScenarios = data.tests && data.tests.length > 0
    ? `\n# LOGIC VALIDATION (TEST CASES)\n${data.tests.map(t => `[ASSERT]: ${t}`).join('\n')}`
    : "";

  // 3. Logic for Anti-Patterns (Standard Novus Consultancy guardrails)
  const antiPatterns = [
    "Do not use 'any' in TypeScript; use strict interfaces.",
    "Avoid nested if-statements; use early returns.",
    "Do not provide conversational 'fluff'—provide code only."
  ].map(ap => `[BLOCK]: ${ap}`).join('\n');

  // 4. Assemble the "Mental Model" for Gemini
  return `
    # ROLE & VIBE
    Act as: ${data.role || 'Senior Architect'}.
    Tone: ${data.vibe || 'Stoic, concise, professional'}.

    # CONSTRAINTS & RULES
    ${userRules}

    # FORBIDDEN PATTERNS
    ${antiPatterns}
    ${testScenarios}

    # PROJECT CONTEXT
    The following code has been hydrated from your @use directives:
    ${hydratedCode}

    # OBJECTIVE
    ${data.task || "Analyze context and provide architectural feedback."}

    MANDATORY: Return solution in <file path="RELATIVE_PATH">CODE</file> blocks.
    `.trim();
}