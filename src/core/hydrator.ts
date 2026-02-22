import fs from 'fs/promises';
import path from 'path';

export async function hydrateContext(filePaths: string[]): Promise<string> {
  let contextBlock = "";

  for (const filePath of filePaths) {
    try {
      // We resolve the path relative to where you run the command
      const fullPath = path.resolve(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      contextBlock += `\n--- START FILE: ${filePath} ---\n`;
      contextBlock += content;
      contextBlock += `\n--- END FILE: ${filePath} ---\n`;
    } catch (error) {
      contextBlock += `\n[ERROR]: Could not find or read context file: ${filePath}\n`;
    }
  }

  return contextBlock;
}