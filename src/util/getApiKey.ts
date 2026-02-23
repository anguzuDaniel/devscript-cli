import os from 'os';
import fs from 'fs';
import path from 'path';
export function getApiKey(): string | null {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  const configDirPath: string = path.join(os.homedir(), '.devscript');
  const configPath: string = path.join(configDirPath, 'config.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.apiKey) {
      return config.apiKey;
    }
  } catch (e: unknown) {
    const error = e as Error; 
    console.error(`Error reading or parsing config file at ${configPath}:`, error.message);
  }
  return null; 
}