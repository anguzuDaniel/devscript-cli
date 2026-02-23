import React from 'react';
import { render } from 'ink';
import { RunCommandUI } from './ui/RunCommandUI.js';
import meow from 'meow';
import fs from 'fs';
const cli = meow(
  `
  Usage
    $ devscript <file.dev>
  Options
    --image, -i  Include a temporary vision image (temp_vision.png) for multimodal processing.
                 (Note: Requires 'temp_vision.png' to exist in the current directory and
                 the Gemini model used to support vision capabilities.)
  Examples
    $ devscript my_project.dev
    $ devscript analyze_image.dev --image
`,
  {
    flags: {
      image: {
        type: 'boolean',
        alias: 'i',
        default: false,
      },
    },
    importMeta: import.meta,
  },
);
if (!cli.input[0]) {
  console.error("Error: No DevScript file specified.");
  cli.showHelp();
  process.exit(1);
}
const devScriptFilePath: string = cli.input[0];
if (!fs.existsSync(devScriptFilePath)) {
    console.error(`Error: DevScript file not found at "${devScriptFilePath}"`);
    process.exit(1);
}
const hasImageFile: boolean = cli.flags.image && fs.existsSync('./temp_vision.png');
if (cli.flags.image && !hasImageFile) {
    console.warn("Warning: --image flag was used, but './temp_vision.png' not found. Proceeding without image context.");
}
render(React.createElement(RunCommandUI, {
  filePath: devScriptFilePath,
  hasImage: hasImageFile,
}));