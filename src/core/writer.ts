import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
interface FileWriteResult {
  filePath: string;
  success: boolean;
  error?: string;
}
export function applyChanges(content: string) {
  const results = [];
  const customRegex = /<file\s+path=["']([^"']+)["']>\s*([\s\S]*?)\s*<\/file>/gi;
  const markdownRegex = /```(?:\w+)?\s*\[?([\w./-]+)\]?\n([\s\S]*?)```/gi;
  let match;
    while ((match = customRegex.exec(content)) !== null) {
    const [_, filePath, code] = match;
    if (!filePath || !code) {
        console.log(chalk.yellow("⚠️ Skipping invalid file block..."));
        continue; 
    }
    writeFileToDisk(filePath, code); 
    results.push(filePath);
    }
  if (results.length === 0) {
    while ((match = customRegex.exec(content)) !== null) {
    const [_, filePath, code] = match;
    if (!filePath || !code) {
        console.log(chalk.yellow("⚠️ Skipping invalid file block..."));
        continue; 
    }
    writeFileToDisk(filePath, code); 
    results.push(filePath);
    }
  }
  return results; 
}
function writeFileToDisk(filePath: string, code: string) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, code.trim());
  console.log(chalk.dim(`  ✔ Applied: ${filePath}`));
}