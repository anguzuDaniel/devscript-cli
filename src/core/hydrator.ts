import fs from 'fs';
import path from 'path';
interface HydrateError extends Error {
  code?: string;
}
export function compactCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1') 
    .replace(/\n\s*\n/g, '\n')                             
    .trim();
}
const walk = (dir: string): string[] => {
  const results: string[] = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      return results;
  }
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.next'].includes(file)) {
        results.push(...walk(fullPath));
      }
    } else {
      if (/\.(ts|tsx|js|jsx|dev|md)$/.test(file)) {
        results.push(fullPath);
      }
    }
  }
  return results;
};
export async function hydrateContext(paths: string[]): Promise<string> {
  let context: string = "";
  for (const p of paths) {
    try {
      const stats = fs.statSync(p);
      const targetFiles = stats.isDirectory() ? walk(p) : [p];
      for (const file of targetFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        context += `\n--- FILE: ${file} ---\n${compactCode(content)}\n`;
      }
    } catch (err: unknown) {
      const error = err as HydrateError; 
      context += `\n⚠️ HYDRATION ERROR [${p}]: ${error.message}\n`;
    }
  }
  return context;
}