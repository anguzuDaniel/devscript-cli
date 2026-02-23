# DevScript Engine v2.0

The DevScript Engine is a powerful CLI tool designed to facilitate AI-driven code generation and architectural analysis. It acts as an intelligent agent, interpreting declarative `.dev` scripts to orchestrate interactions with large language models (LLMs), hydrate project context, and apply generated changes directly to your codebase.

## Installation

To get started with the DevScript Engine, ensure you have Node.js (v18.x or higher recommended) installed on your system.

1.  **Global Installation:**
    ```bash
    npm install -g devscript
    ```

2.  **API Key Configuration:**
    The DevScript Engine requires a Google Gemini API key to interact with the language model. You can provide this key in one of two ways:

    *   **Environment Variable (Recommended):** Set `GEMINI_API_KEY` in your shell environment or a `.env` file in your project root:
        ```bash
        export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
        # Or in a .env file:
        # GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
        ```
    *   **Configuration File:** Create a directory `~/.devscript` in your home directory and a `config.json` file inside it:
        ```bash
        mkdir -p ~/.devscript
        echo '{ "apiKey": "YOUR_GEMINI_API_KEY" }' > ~/.devscript/config.json
        ```

    You can also specify a different Gemini model by setting the `GEMINI_MODEL` environment variable (e.g., `GEMINI_MODEL="gemini-1.5-pro"`). The default is `gemini-2.5-flash`.

## Usage

The DevScript Engine is invoked via the `devscript` command, followed by the path to your DevScript file.

```bash
devscript <path-to-your-script.dev> [options]
```

**Options:**

*   `--image`, `-i`: Include a temporary vision image (`temp_vision.png`) for multimodal processing. This file must exist in the current working directory.
    ```bash
    devscript analyze_image.dev --image
    ```

**Interactive UI:**
Upon execution, the DevScript Engine launches an interactive terminal UI powered by `ink`.

*   **`[Enter]` (Run):** Triggers the AI generation process based on the DevScript and hydrated context.
*   **`[a]` (Apply):** Parses the AI's response for `<file path="...">` tags and applies the generated code changes to your filesystem.
*   **`[q]` (Quit):** Exits the DevScript Engine.
*   **`[s]` (Save):** Placeholder for future functionality (e.g., saving session logs or prompts).

## @Keywords (DevScript Directives)

DevScript files (`.dev`) are plain text files that define the AI's role, task, and project context using special `@` directives.

*   **`@role <persona>`**: Defines the persona the AI should adopt (e.g., `Senior Architect`, `Lead Developer`).
*   **`@vibe <tone>`**: Sets the conversational tone of the AI (e.g., `Professional and comprehensive`, `Stoic, precise`).
*   **`@tech <technology>`**: Specifies key technologies relevant to the project or task. Can be used multiple times.
*   **`@rule <constraint>`**: Adds specific rules or constraints for the AI to follow during generation. Can be used multiple times.
*   **`@test <assertion>`**: Defines test cases or validation logic the AI's output should satisfy. Can be used multiple times.
*   **`@use <path/to/file_or_directory>`**: Includes files or entire directories into the project context for the AI. This directive supports recursive hydration. Can be used multiple times.
*   **`@task`**: Initiates the task description for the AI. All subsequent lines until another `@` directive or the end of the file will be treated as the task.

**Example `my_project.dev`:**
```dev
@role Technical Architect
@vibe Professional and comprehensive
@tech TypeScript
@tech React
@tech Ink
@rule Maintain strict Novus Consultancy code standards.
@use src/components/CommandTerminal.tsx
@use src/core
@task
Analyze the provided codebase for the DevScript Engine itself.
Provide architectural feedback focusing on modularity, maintainability,
and adherence to best practices. Suggest improvements where applicable.
Specifically, review the context hydration mechanism.
```

## File Structure

The DevScript Engine's codebase is structured for clarity and modularity:

*   **`src/components/`**: Contains reusable React components for the Ink-based terminal UI.
    *   `CommandTerminal.tsx`: A core component for animated terminal output.
*   **`src/core/`**: Houses the essential business logic of the engine.
    *   `aggregateDevScripts.ts`: Combines data from multiple DevScript files.
    *   `builder.ts`: Constructs the final prompt sent to the LLM, incorporating DevScript data and hydrated code.
    *   `hydrator.ts`: Manages reading files and directories into the AI context, including recursive hydration and code compaction.
    *   `parser.ts`: Parses `.dev` files to extract directives and task information.
    *   `writer.ts`: Interprets the AI's generated response to write files to disk.
*   **`src/services/`**: Integrations with external services.
    *   `gemini.ts`: Handles communication with the Google Gemini API.
*   **`src/ui/`**: Contains the main UI components that manage the application's state and presentation.
    *   `RunCommandUI.tsx`: The primary interactive UI component for running DevScripts.
*   **`src/util/`**: General utility functions.
    *   `copyToClipboard.ts`: Platform-agnostic clipboard operations.
    *   `getApiKey.ts`: Utility for retrieving the API key from various sources.
*   **`src/index.ts`**: The entry point for the CLI application, handling argument parsing and initial setup.

## Recursive Directory Hydration

A key feature of the DevScript Engine is its robust context hydration mechanism, powered by the `@use` directive in `.dev` files.

When an `@use` directive points to a directory, the `src/core/hydrator.ts` module intelligently traverses that directory **recursively**. It automatically identifies and includes all relevant code files (`.ts`, `.tsx`, `.js`, `.jsx`) and DevScript files (`.dev`). To prevent irrelevant or excessively large files from being sent to the LLM, the hydrator automatically excludes common development artifacts and dependency folders such as:

*   `node_modules`
*   `.git`
*   `dist`
*   `.next`

Each file's content is also "compacted" using the `compactCode` function, which removes comments and excessive whitespace, optimizing the token count and focus for the LLM. This ensures that the AI receives a clean, concise, and comprehensive understanding of your project's structure and existing code without unnecessary overhead.

This recursive hydration capability allows you to easily provide entire project modules or even your full codebase as context to the AI with a single `@use` directive, streamlining the process of getting detailed architectural feedback or code generation tasks.