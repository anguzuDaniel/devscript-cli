import fs from 'fs';
import path from 'path';

export async function hydrateContext(paths: string[]): Promise<string> {
  let fullContext = "";

  for (const p of paths) {
    const absolutePath = path.resolve(p);
    
    if (fs.existsSync(absolutePath)) {
      const stats = fs.statSync(absolutePath);
      
      if (stats.isDirectory()) {
        // Grab all files in the directory (recursive)
        const files = getAllFiles(absolutePath);
        for (const file of files) {
          if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(file, 'utf-8');
            fullContext += `\n--- FILE: ${file} ---\n${content}\n`;
          }
        }
      } else {
        const content = fs.readFileSync(absolutePath, 'utf-8');
        fullContext += `\n--- FILE: ${p} ---\n${content}\n`;
      }
    }
  }
  return fullContext;
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