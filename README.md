# DevScript CLI: Your AI-Powered Code Co-pilot (v2.0)

DevScript CLI is a command-line interface tool designed to streamline your development workflow by integrating AI-powered code generation directly into your project. Define your coding tasks, context, and AI persona using simple `.devscript` files, and let the DevScript Engine execute them with the Gemini API, applying changes directly to your codebase.

With v2.0, the DevScript Engine introduces enhanced capabilities for defining AI interactions, robust context management, and a more interactive Terminal User Interface (TUI).

## Features

*   **Declarative AI Tasks**: Define your AI's role, vibe, rules, and task using intuitive `@keywords` in `.devscript` files.
*   **Intelligent Context Hydration**: Automatically gather relevant code from specified files and directories to provide the AI with comprehensive context.
*   **Live Reloading**: The engine watches your `.devscript` file for changes, instantly reloading the context and parameters for rapid iteration.
*   **Direct Code Application**: Parse AI responses containing `<file path="...">` tags and apply changes directly to your filesystem with a single keypress.
*   **Interactive TUI**: A rich Terminal User Interface provides real-time feedback, context details, token estimates, and interactive controls.
*   **Flexible API Key Management**: Configure your Gemini API key via environment variables or a global configuration file.
*   **Error Handling**: Clear error reporting for API issues or misconfigurations.

## Project Architecture

The DevScript CLI is structured for clarity and maintainability, separating concerns into core logic, service integrations, and the user interface.

```
devscript-cli/
├── src/
│   ├── core/
│   │   ├── builder.ts         # Constructs the final prompt for the AI based on DevScriptData.
│   │   ├── hydrator.ts        # Gathers and combines code content from specified files/directories.
│   │   └── parser.ts          # Parses .devscript files into a structured DevScriptData object.
│   ├── services/
│   │   └── gemini.ts          # Handles interaction with the Google Gemini API.
│   ├── ui/
│   │   └── RunCommandUI.tsx   # The main Ink-based Terminal User Interface component.
│   └── util/
│       └── getApiKey.ts       # Utility to retrieve the Gemini API key from various sources.
└── package.json
└── README.md
```

### Key Components:

*   **`core/parser.ts`**: The brain for understanding your `.devscript`. It takes raw text and transforms it into a structured `DevScriptData` object, recognizing all `@keywords`.
*   **`core/hydrator.ts`**: Responsible for collecting all code context the AI needs. It reads specified files or recursively scans directories, extracting relevant code (currently `.ts` and `.tsx` files from directories).
*   **`core/builder.ts`**: Takes the parsed `DevScriptData` and the `hydratedCode` and constructs the comprehensive Markdown prompt that will be sent to the Gemini API.
*   **`services/gemini.ts`**: The communication layer with the Gemini AI model (`gemini-2.5-flash`). Handles API calls and basic error reporting.
*   **`ui/RunCommandUI.tsx`**: The orchestrator. This React component (built with Ink for TUI) ties everything together:
    *   **Bootloader**: Initializes by parsing the `.devscript`, hydrating context, and setting up a file watcher.
    *   **Engine**: Triggers the AI prompt building and API call.
    *   **Agent**: Processes the AI response, looking for `<file path="...">` tags to apply changes to the filesystem.
    *   **Controls**: Manages user input for running, applying, saving, and quitting.
    *   **View**: Renders the TUI, displaying all metadata, AI status, and response preview.

## Installation

To use DevScript CLI, you'll need Node.js (v16 or higher recommended) and npm or Yarn installed.

1.  **Install Globally**:
    ```bash
    npm install -g devscript-cli
    # OR
    yarn global add devscript-cli
    ```

## API Key Configuration

The DevScript CLI requires a Google Gemini API key to function. You can provide this in two ways:

1.  **Environment Variable (Recommended for projects)**:
    Create a `.env` file in the root of your project (or any parent directory from where you run the CLI) and add your API key:
    ```
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```

2.  **Global Configuration File**:
    Create a `config.json` file in `~/.devscript/` (your user's home directory) with the following content:
    ```json
    {
      "apiKey": "YOUR_GEMINI_API_KEY_HERE"
    }
    ```
    *Note: The CLI prioritizes the `GEMINI_API_KEY` environment variable over the global config file.*

## Usage

Create a `.devscript` file (e.g., `feature.dev`) in your project directory. This file will define your AI task and context.

```bash
# Run the DevScript Engine with your .devscript file
devscript run ./feature.dev
```

The TUI will launch, load your `.devscript`, hydrate the specified code context, and await your command.

## `.devscript` Syntax (v2.0)

DevScript files (`.dev` extension) are simple text files using `@keywords` to define various parameters for the AI.

### Available Keywords:

*   **`@role <AI's persona>`**: Defines the AI's professional role (e.g., "Senior TypeScript Architect"). Default: "Senior Software Engineer".
*   **`@vibe <AI's tone>`**: Sets the AI's communication style (e.g., "Stoic, concise, and professional"). Default: "Stoic, concise, and professional".
*   **`@tech <technology>`**: Specifies technologies relevant to the task (e.g., "@tech React", "@tech TypeScript"). Multiple `@tech` lines are supported. *Note: Currently parsed but not directly injected into the prompt, reserved for future use.*
*   **`@rule <rule description>`**: Provides specific instructions or constraints for the AI (e.g., "@rule Do not modify existing comments."). Multiple `@rule` lines are supported. Default: "- Follow standard clean code principles."
*   **`@use <file_path_or_directory>`**: Specifies files or directories to include in the AI's code context. Paths are relative to the `.devscript` file. Multiple `@use` lines are supported.
    *   If a directory is specified, `devscript` will recursively hydrate all `.ts` and `.tsx` files within it.
*   **`@task`**: The main instruction for the AI. All subsequent lines until another `@keyword` or the end of the file will be treated as part of the task.

### Example `my-feature.dev` file:

```markdown
@role Senior Frontend Engineer
@vibe Enthusiastic and helpful
@tech React
@tech TypeScript
@rule Implement using functional components and hooks.
@rule Ensure all new components have proper type definitions.
@use src/components/Button.tsx
@use src/utils/
@task
Refactor the `Button.tsx` component to accept an `isLoading` prop.
When `isLoading` is true, the button should display a spinner and be disabled.
Create a new utility function in `src/utils/spinner.ts` that exports a simple SVG spinner component.
Ensure the `Button` component correctly imports and uses this spinner.
```

## Terminal User Interface (TUI) Controls

Once the DevScript Engine is running, you can interact with it using the following key bindings:

*   **`[Enter]`**: Re-run the AI task. This will send the current `.devscript`'s context and task to Gemini and display the new response.
*   **`[a]`**: **Apply Changes**. Parses the last AI response for `<file path="...">CODE