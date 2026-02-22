export interface DevScriptData {
  role: string;
  vibe: string;
  tech: string[]; // Optional: For future use if we want to explicitly capture tech stack
  rules: string[];
  contextFiles: string[];
  task: string;
}

export function parseDevScript(content: string): DevScriptData {
  const lines = content.split('\n');
  const data: DevScriptData = {
    role: '',
    vibe: '',
    tech: [],
    rules: [],
    contextFiles: [],
    task: ''
  };

  let capturingTask = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // If we are currently accumulating lines for the task
    if (capturingTask) {
      // If the current line starts with an '@' symbol, it signals the end of the task block
      // and the beginning of a new keyword block.
      if (trimmed.startsWith('@')) {
        capturingTask = false; // Stop capturing task content
        // Fall through to process this new keyword in the subsequent logic
      } else {
        // This line is part of the task, append it including any leading/trailing spaces
        // We'll trim the final task content at the end.
        data.task += line + '\n';
        continue; // Move to the next line, as this line was consumed by the task
      }
    }
    
    // Process keyword lines (either in the initial pass or after a task block concluded)
    if (trimmed.startsWith('@role')) {
      data.role = trimmed.replace('@role', '').trim();
    } else if (trimmed.startsWith('@vibe')) {
      data.vibe = trimmed.replace('@vibe', '').trim();
    } else if (trimmed.startsWith('@tech')) {
      const t = trimmed.replace('@tech', '').trim();
      if (t) data.tech.push(t);
    } else if (trimmed.startsWith('@rule')) {
      const r = trimmed.replace('@rule', '').trim();
      if (r) data.rules.push(r);
    } else if (trimmed.startsWith('@use')) {
      const u = trimmed.replace('@use', '').trim();
      if (u) data.contextFiles.push(u);
    } else if (trimmed.startsWith('@task')) {
      // Encountering @task explicitly starts the task content capture
      capturingTask = true;
      // Do not append "@task" itself to the task content
    }
    // Lines that do not start with a recognized '@' keyword and are not part of a task block
    // are implicitly ignored, maintaining current behavior.
  }

  // After parsing all lines, trim any leading/trailing whitespace from the collected task string.
  // This removes the final newline appended and any incidental whitespace surrounding the task content.
  data.task = data.task.trim();

  return data;
}