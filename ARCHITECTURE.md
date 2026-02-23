# `devscript` CLI Tool Architecture Document

## Introduction

`devscript` is a command-line interface (CLI) tool meticulously engineered to facilitate AI-assisted code generation, architectural analysis, and project scaffolding. It operates by interpreting domain-specific `.dev` script files, systematically hydrating project context from the filesystem, interfacing with the Google Gemini API, and precisely applying generated code changes. The interactive user interface is architected atop `Ink`, providing a robust and engaging terminal experience.

---

## 1. Installation

To deploy the `devscript` CLI tool, adhere to the following installation protocol:

### Prerequisites:

*   **Node.js**: A stable Node.js runtime environment (v18.x or newer is recommended) and a package manager (npm, yarn, or pnpm) are essential.
*   **Google Gemini API Key**: Secure a `GEMINI_API_KEY` from the Google AI Studio. This key must be established as an environment variable within your system's configuration (e.g., `.env` file, `~/.bashrc`, `~/.zshrc`).
    ```bash
    export GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```
*   **Clipboard Utilities (Linux Systems Only)**: For seamless clipboard integration (e.g., copying generated outputs), `xclip` or `xsel` is required.
    ```bash
    # For Debian/Ubuntu-based distributions
    sudo apt-get update && sudo apt-get install xclip
    # OR
    sudo apt-get update && sudo apt-get install xsel
    ```
*   **Text-to-Speech (macOS Systems Only)**: The tool leverages the native `say` command for audible user feedback. No supplementary installation is typically required on macOS.

### Installation Steps:

1.  **Repository Acquisition**: Clone the `devscript` repository from its source or download the project archives.
    ```bash
    git clone [repository_url]
    cd devscript
    ```
2.  **Dependency Resolution**: Install all requisite project dependencies.
    ```bash
    npm install
    # Alternatively, for yarn users:
    # yarn install
    ```
3.  **Global Command Linkage**: To enable global command-line access to `devscript` from any directory, establish a symbolic link:
    ```bash
    npm link
    # Alternatively, for yarn users:
    # yarn link
    ```
    Upon successful execution, the `devscript` command will be globally available in your shell environment.

---

## 2. Usage

`devscript` primarily operates by consuming a `.dev` script file, which serves as the blueprint for AI interaction.

### Core Command Syntax:

```bash
devscript <path/to/your/script.dev>
```

### Command-Line Options:

*   **`--image`, `-i`**: Instructs the `devscript` engine to include a local `temp_vision.png` file (expected in the current working directory) for multimodal AI processing. This feature necessitates the use of a Gemini model capable of vision processing.
    ```bash
    devscript analyze_image_context.dev --image
    ```

### Interactive User Interface Controls:

Upon initialization of the `devscript` UI, the following keybindings are available for interaction:

*   **`Enter`**: Triggers the AI content generation process, leveraging the directives within the DevScript and the hydrated project context.
*   **`a`**: Applies any generated code modifications or new files to the local filesystem, strictly adhering to the AI's specified output format.
*   **`s`**: (Future Implementation) This key is reserved for forthcoming functionality, such as persistent session logging or prompt detail archival.
*   **`q`**: Terminates the `devscript` application gracefully.

### Example DevScript (`my_architecture_review.dev`):

```dev
@role Technical Architect
@vibe Professional, concise
@tech TypeScript, React, Ink, Google Gemini API
@rule All suggested code refactors must maintain backward compatibility.
@use src/components/CommandTerminal.tsx
@use src/core
@task
Perform an architectural review of the `devscript` project. Focus on modularity, testability, and adherence to modern TypeScript patterns. Identify any potential performance bottlenecks or areas for abstraction.
```

---

## 3. @Keywords (DevScript Directives)

`.dev` script files are composed using a set of explicit `@keywords` that define the AI's operational parameters and contextual input.

*   **`@role <string>`**: Establishes the AI's designated persona or professional role (e.g., `Senior Architect`, `DevOps Engineer`).
*   **`@vibe <string>`**: Specifies the AI's communication tone and stylistic approach (e.g., `Stoic, precise`, `Enthusiastic, detailed`).
*   **`@tech <string>`**: Declares key technologies or frameworks relevant to the task, influencing the AI's contextual understanding and recommendations (e.g., `TypeScript`, `Next.js`, `AWS Lambda`). This directive supports multiple entries.
*   **`@rule <string>`**: Imposes specific constraints, quality standards, or best practices that the AI's output must satisfy (e.g., `Implement using functional programming paradigms`). This directive supports multiple entries.
*   **`@test <string>`**: Provides explicit assertions or test case scenarios that the AI should consider, validate against, or incorporate into its logic (e.g., `[ASSERT]: The parser correctly handles malformed directives`). This directive supports multiple entries.
*   **`@use <path/to/file_or_directory>`**: Directs the `devscript` engine to ingest and incorporate the content of specified files or entire directory structures as contextual input for the AI. Paths are resolved relative to the `.dev` script file. This directive supports multiple entries.
*   **`@task`**: Initiates a multi-line task description. All subsequent lines, until the encounter of another `@keyword` or the end of the file, are aggregated as the detailed task instruction for the AI.

---

## 4. File Structure

The `devscript` codebase maintains a structured and modular organization, promoting maintainability and clarity:

```
devscript/
├── src/
│   ├── components/                 # Reusable React components for the Ink TUI, promoting UI consistency.
│   │   └── CommandTerminal.tsx     # An animated terminal display component for interactive output.
│   ├── core/                       # Contains the foundational business logic of the DevScript engine.
│   │   ├── aggregateDevScripts.ts  # Logic for consolidating data from multiple DevScript files (if applicable).
│   │   ├── builder.ts              # Responsible for constructing the final, comprehensive prompt for the AI.
│   │   ├── hydrator.ts             # Manages the process of collecting and preparing source code context.
│   │   ├── parser.ts               # Interprets and structures the content of DevScript files.
│   │   └── writer.ts               # Handles the application of AI-generated code changes to the filesystem.
│   ├── services/                   # Encapsulates integrations with external third-party APIs.
│   │   └── gemini.ts               # Dedicated module for orchestrating communication with the Google Gemini API.
│   ├── ui/                         # Houses the primary UI components and manages application flow.
│   │   └── RunCommandUI.tsx        # The central interactive terminal user interface component.
│   ├── util/                       # A collection of general-purpose utility functions.
│   │   ├── copyToClipboard.ts      # Provides cross-platform functionality for clipboard operations.
│   │   └── getApiKey.ts            # Manages the secure retrieval logic for the Gemini API key.
│   └── index.ts                    # The primary entry point for the `devscript` CLI application.
└── package.json                    # Defines project metadata, dependencies, and script commands.
```

---

## 5. Recursive Directory Hydration

A pivotal architectural feature of `devscript` is its sophisticated mechanism for recursively hydrating project context from designated files and directories. This ensures the AI receives a comprehensive and accurate representation of the codebase, which is critical for generating precise and relevant feedback or code. This functionality is primarily managed within the `src/core/hydrator.ts` module.

### Operational Mechanism:

1.  **`@use` Directive Integration**: Within a `.dev` script, the `@use <path>` directive explicitly instructs the `devscript` engine to include the content resolved from the specified `<path>` in the AI's contextual input.

2.  **`hydrateContext(paths: string[]): Promise<string>`**: This asynchronous function serves as the central orchestrator for context hydration:
    *   It iteratively processes each path provided via the `@use` directives.
    *   For each path, it dynamically determines whether the target is a file or a directory.

3.  **`walk(dir: string): string[]` Functionality**: If a provided path corresponds to a directory, the `walk` utility function is invoked:
    *   This function performs a recursive traversal of the specified directory structure.
    *   **Strategic Exclusion**: To optimize token usage and prevent the inclusion of irrelevant or sensitive data, it explicitly filters out common development artifacts and directories: `node_modules`, `.git`, `dist`, `.next`.
    *   **Targeted File Type Filtering**: It selectively includes files based on their extensions, focusing on source code and documentation relevance: `.ts`, `.tsx`, `.js`, `.jsx`, `.dev`, `.md`. This ensures that only pertinent contextual information is supplied to the AI.
    *   All identified and filtered file paths are systematically collected and returned.

4.  **Content Retrieval and Compaction**:
    *   For every qualifying file (whether directly specified or discovered through the `walk` function), its content is asynchronously read using `fs.readFileSync`.
    *   The `compactCode(code: string): string` function then applies a critical preprocessing step:
        *   It meticulously removes both multi-line (`/* ... */`) and single-line (`// ...`) comments.
        *   It consolidates contiguous empty lines into single newlines, thereby reducing the overall token count and minimizing contextual noise.
    *   The processed and compacted code for each file is appended to a cumulative context string, distinctly prefixed with `--- FILE: <file_path> ---`. This clear demarcation is crucial for the AI to accurately interpret file boundaries and origins within the provided context.

5.  **Robust Error Handling**: Should a specified path not exist, or if an access/read error occurs during hydration, a descriptive hydration error message is appended to the context. This non-blocking approach ensures user notification without prematurely terminating the `devscript` execution.

### Architectural Benefits:

This recursive hydration capability is a cornerstone of `devscript`'s effectiveness. It guarantees that the AI is presented with a holistic and accurate snapshot of the project's architecture and relevant source code. By intelligently filtering out extraneous files and compacting code, `devscript` significantly optimizes token consumption, thereby enhancing the efficiency and cost-effectiveness of API interactions while preserving high contextual fidelity. This disciplined approach aligns with Novus Consultancy's stringent code standards for robust and performant architectural tooling.