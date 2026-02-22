import fs from 'fs';
import path from 'path';

export async function hydrateContext(paths: string[]): Promise<string> {
  let context = "";

  const walk = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat && stat.isDirectory()) {
        // Stoic Rule: Ignore noise folders
        if (!['node_modules', '.git', 'dist', '.next'].includes(file)) {
          results = results.concat(walk(fullPath));
        }
      } else {
        // Only target code files
        if (/\.(ts|tsx|js|jsx|dev|md)$/.test(file)) {
          results.push(fullPath);
        }
      }
    });
    return results;
  };

  for (const p of paths) {
    try {
      const stats = fs.statSync(p);
      const targetFiles = stats.isDirectory() ? walk(p) : [p];

      for (const file of targetFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        context += `\n--- FILE: ${file} ---\n${compactCode(content)}\n`;
      }
    } catch (err: any) {
      context += `\n⚠️ HYDRATION ERROR [${p}]: ${err.message}\n`;
    }
  }
  return context;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

export function compactCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1') // Remove comments
    .replace(/\n\s*\n/g, '\n')                             // Remove empty lines
    .trim();
}