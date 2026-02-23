<file path="README.md">

# ◈ DevScript Engine v2.0 ◈

## Overview

DevScript is a high-density architectural manifestation engine. It facilitates the **Shift from Vibe to Structure** by hydrating local project contexts into structured LLM prompts, enforcing strict clean-code constraints, and automating the file-writing process.

## Installation

Ensure you have Node.js v18+ installed.

1. Clone the repository.
2. Install dependencies:
```bash
npm install

```


3. Build the engine:
```bash
npm run build

```


4. Link the CLI globally:
```bash
npm link

```



## Usage

### Direct Manifestation

Execute a single `.dev` blueprint:

```bash
devscript run devscripts/ui.dev

```

### The Live Agent Loop

Monitor architectural changes in real-time. Any save to a `.dev` file triggers an automatic rebuild of the target project:

```bash
devscript watch devscripts/

```

### Full System Sync

Aggregate all rules from every module to ensure project-wide consistency:

```bash
devscript sync devscripts/

```

## Directory Hydration

The v2.0 Engine introduces **Recursive Directory Hydration**. This allows the architect to inject entire folder structures into the LLM's mental model using a single directive.

**Syntax:**

```text
@use ./frontend/src/components

```

The engine recursively parses all supported files within the directory, mapping their contents to the `PROJECT CONTEXT` block of the prompt. This ensures the AI understands existing interfaces and patterns before generating new code.

## @Keywords

DevScript uses a structured tag system to anchor the LLM:

| Keyword | Purpose |
| --- | --- |
| `@role` | Defines the technical persona and expertise level. |
| `@vibe` | Sets the communication tone and stylistic guardrails. |
| `@use` | Hydrates local files or directories into the prompt context. |
| `@rule` | Explicit functional or aesthetic constraints. |
| `@test` | Defines behavioral anchors and logic validation. |
| `@task` | The primary objective for the manifestation. |

## File Structure

```text
.
├── bin/                 # Compiled CLI executables
├── devscripts/          # Architectural blueprints (.dev)
├── src/                 # Engine Source
│   ├── core/            # Parser, Builder, and Writer logic
│   ├── services/        # LLM API integration (Gemini)
│   ├── ui/              # Ink-based CLI components
│   └── index.ts         # CLI Entry point
├── .env                 # API Key and Model configuration
└── .output.md           # Manifestation buffer

```

## Forbidden Patterns

To maintain the **Novus Software Consultancy** standard, the engine strictly forbids:

* The use of `any` in TypeScript; all data must be typed via interfaces.
* Nested `if` statements; the **Early Return** pattern is mandatory.
* Conversational filler; the engine focuses exclusively on code manifestation.

---

◈ **Built for Architects. Manifested by AI.** ◈
</file>