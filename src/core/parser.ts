export interface DevScriptContent {
  persona: string;
  style: string;
  contextFiles: string[];
  rules: string[];
  task: string;
}

export function parseDevScript(rawText: string): DevScriptContent {
  const content: DevScriptContent = {
    persona: "Senior Developer",
    style: "Professional",
    contextFiles: [],
    rules: [],
    task: ""
  };

  const lines = rawText.split('\n');
  let currentMode: keyof DevScriptContent | null = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detect Symbols and set mode
    if (trimmed.startsWith('#')) {
      content.persona = trimmed.replace('#', '').trim();
      currentMode = null;
    } else if (trimmed.startsWith('%')) {
      content.style = trimmed.replace('%', '').trim();
      currentMode = null;
    } else if (trimmed.startsWith('@')) {
      content.contextFiles.push(trimmed.replace('@', '').trim());
      currentMode = null;
    } else if (trimmed.startsWith('!')) {
      content.rules.push(trimmed.replace('!', '').trim());
      currentMode = null;
    } else if (trimmed.startsWith('>')) {
      content.task = trimmed.replace('>', '').trim();
      currentMode = 'task'; // Enter "Task Mode" to catch following lines
    } else if (currentMode === 'task') {
      // If we are in task mode and the line doesn't start with a symbol, append it
      content.task += " " + trimmed;
    }
  });

  return content;
}