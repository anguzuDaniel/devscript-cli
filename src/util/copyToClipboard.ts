import { spawn } from 'child_process';
export function copyToClipboard(data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform: NodeJS.Platform = process.platform;
    let command: string;
    let args: string[] = [];
    if (platform === 'darwin') {
      command = 'pbcopy';
    } else if (platform === 'win32') {
      command = 'clip';
    } else if (platform === 'linux') {
      command = 'xclip';
      args = ['-selection', 'clipboard'];
      if (!process.env.DISPLAY) {
          command = 'xsel';
          args = ['--clipboard', '--input'];
      }
    } else {
      return reject(new Error(`Unsupported platform for clipboard operations: ${platform}`));
    }
    const proc = spawn(command, args);
    proc.on('error', (err: Error) => {
      reject(new Error(`Failed to copy to clipboard (command: ${command}): ${err.message}. Ensure '${command}' is installed and available in PATH.`));
    });
    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(); 
      } else {
        reject(new Error(`Clipboard command '${command}' exited with code ${code}.`));
      }
    });
    proc.stdin.write(data);
    proc.stdin.end();
  });
}