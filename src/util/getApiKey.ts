import os from 'os';
import fs from 'fs';
import path from 'path';

export function getApiKey() {
  // 1. Check local .env first
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  // 2. Fallback to global config (~/.devscript/config.json)
  const configPath = path.join(os.homedir(), '.devscript', 'config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.apiKey;
  }

  return null;
}