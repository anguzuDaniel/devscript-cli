export interface DevScriptData {
  role: string;
  vibe: string;
  tech: string[];
  rules: string[];
  not: string[];
  guards: string[];
  format: string;
  limit: string;
  tests: string[];
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
    not: [],
    guards: [],
    format: '',
    limit: '',
    tests: [],
    contextFiles: [],
    task: ''
  };

  let capturingTask = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (capturingTask) {
      if (trimmed.startsWith('@')) {
        capturingTask = false;
      } else {
        data.task += line + '\n';
        continue;
      }
    }

    if (trimmed.startsWith('@role')) {
      data.role = trimmed.replace('@role', '').trim();
      continue;
    }
    if (trimmed.startsWith('@vibe')) {
      data.vibe = trimmed.replace('@vibe', '').trim();
      continue;
    }
    if (trimmed.startsWith('@tech')) {
      const t = trimmed.replace('@tech', '').trim();
      if (t) data.tech.push(t);
      continue;
    }
    if (trimmed.startsWith('@rule')) {
      const r = trimmed.replace('@rule', '').trim();
      if (r) data.rules.push(r);
      continue;
    }
    if (trimmed.startsWith('@not')) {
      const n = trimmed.replace('@not', '').trim();
      if (n) data.not.push(n);
      continue;
    }
    if (trimmed.startsWith('@guard')) {
      const g = trimmed.replace('@guard', '').trim();
      if (g) data.guards.push(g);
      continue;
    }
    if (trimmed.startsWith('@format')) {
      data.format = trimmed.replace('@format', '').trim();
      continue;
    }
    if (trimmed.startsWith('@limit')) {
      data.limit = trimmed.replace('@limit', '').trim();
      continue;
    }
    if (trimmed.startsWith('@test')) {
      const t = trimmed.replace('@test', '').trim();
      if (t) data.tests.push(t);
      continue;
    }
    if (trimmed.startsWith('@use')) {
      const u = trimmed.replace('@use', '').trim();
      if (u) data.contextFiles.push(u);
      continue;
    }
    if (trimmed.startsWith('@task')) {
      capturingTask = true;
      continue;
    }
  }

  data.task = data.task.trim();
  return data;
}