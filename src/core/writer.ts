import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Export the FileWriteResult interface for reuse across the application, adhering to DRY principle.
export interface FileWriteResult {
  filePath: string;
  success: boolean;
  error?: string;
}

function writeFileToDisk(filePath: string, code: string): FileWriteResult {
  const absolutePath = path.resolve(process.cwd(), filePath);
  try {
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, code.trim());
    console.log(chalk.dim(`  ✔ Applied: ${filePath}`));
    return { filePath, success: true };
  } catch (error: unknown) {
    const err = error as Error; // Type assertion for error object
    console.error(chalk.red(`  ✖ Failed to apply: ${filePath} - ${err.message}`));
    return { filePath, success: false, error: err.message };
  }
}

export function applyChanges(content: string): FileWriteResult[] {
  const results: FileWriteResult[] = [];
  const customRegex = /<file\s+path=["']([^"']+)["']>\s*([\s\S]*?)\s*<\/file>/gi;
  let match: RegExpExecArray | null;

  while ((match = customRegex.exec(content)) !== null) {
    const [_, filePath, code] = match;
    // Early return/continue for malformed or empty blocks to maintain robust parsing.
    if (!filePath || !code) {
        console.log(chalk.yellow("⚠️ Skipping invalid file block: Malformed <file> tag or empty content."));
        continue; 
    }
    results.push(writeFileToDisk(filePath, code)); 
  }
  return results; 
}