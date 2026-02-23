# DevScript Engine v2.0 🚀

**DevScript** is a high-performance prompting language and CLI engine designed specifically for software engineers. It bridges the gap between raw LLMs and complex codebases by providing a declarative way to manage context, enforce architectural rules, and prevent AI hallucinations.

## 🎯 Why DevScript?

Traditional prompting often fails in engineering because of "context noise" and "instruction drift." DevScript solves this through:

*   **Multi-Provider Support**: Choose between **Gemini**, **OpenAI**, or **Ollama** (local).
*   **Secure Authentication**: Built-in Google OAuth2 and encrypted credential storage.
*   **Deterministic Context**: Use `@use` to recursively hydrate only the relevant parts of your codebase, automatically stripping comments and whitespace to save tokens.
*   **Hallucination Guards**: Built-in `@guard` directives force the AI into a "Strict Mode," preventing it from inventing code or making assumptions.
*   **Strict Execution**: Directives like `@not`, `@limit`, and `@format` ensure the AI acts as a surgical tool, not a conversational chatbot.
*   **Closed-Loop Application**: Review AI-generated changes in a TUI and apply them directly to your filesystem with a single keystroke.

---

## ⚙️ Installation

### 1. Global Installation
Ensure you have **Node.js v18+** installed.
```bash
git clone https://github.com/anguzuDaniel/devscript-cli.git
cd devscript-cli
npm install
npm run build
npm link
```

### 2. Configure Authentication
DevScript now supports robust authentication for multiple providers.

#### **Google Gemini (Recommended)**
Authenticate via Google OAuth2 for a seamless experience:
```bash
devscript login
```
*Note: Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in your environment.*

#### **OpenAI**
Set your OpenAI API key:
```bash
devscript config set-key openai YOUR_OPENAI_API_KEY
```

#### **Switching Engines**
Switch between providers at any time:
```bash
devscript config set-engine gemini  # Options: gemini, openai, ollama
```

---

## 🚀 Usage

Run a DevScript file:
```bash
dev run <path/to/script.dev>
```

### New Core Commands
*   `devscript login` : Triggers the Google OAuth browser flow for Gemini.
*   `devscript config set-engine <provider>` : Switches the active AI engine (gemini, openai, ollama).
*   `devscript config set-key <provider> <key>` : Saves an API key for a specific provider.
*   `devscript manifest [folder]` : Package, Consult AI, and Manifest files automatically using the active engine.

### CLI Options
*   `--screenshot`, `-s`: Capture a screen region before running for multimodal tasks.

---

## 📝 The DevScript Language (@Directives)

### Core Directives
| Directive | Description |
| :--- | :--- |
| `@role` | Defines the AI's persona (e.g., `Senior Security Engineer`). |
| `@vibe` | Sets the tone (e.g., `Stoic`, `Brief`, `Pedantic`). |
| `@tech` | Declares stack context (e.g., `React`, `Rust`, `Postgres`). |
| `@use` | Hydrates files/folders into context (Recursive & Token-optimized). |
| `@task` | The objective. All lines following this are treated as instructions. |

### ClearPrompt: Strict Mode (Engineering Grade)
These directives are designed to eliminate hallucinations and maximize token efficiency.

| Directive | Purpose | Example |
| :--- | :--- | :--- |
| `@guard` | **Logic Fence**: Prevents inventions. | `@guard FACTS-ONLY` |
| `@not` | **Forbidden Patterns**: Anti-pattern lock. | `@not No external libraries` |
| `@limit` | **Boundaries**: Prevents scope creep. | `@limit Max 2 files modified` |
| `@format` | **Structure**: Specific output shape. | `@format Return JSON only` |

---

## 💡 Example: Secure Refactor

Create a file named `refactor.dev`:
```dev
@role Technical Lead
@vibe Professional, concise
@tech TypeScript, Express

@use src/routes/auth.ts
@use src/middleware/validate.ts

@guard FACTS-ONLY
@guard NO-GUESS
@not Do not add conversational filler.
@not Do not suggest 'any' types.
@limit Max 50 lines of code.

@task
Analyze the auth route for potential timing attacks. 
Provide a surgical fix if found.
```

Run it:
```bash
dev run refactor.dev
```

---

## 🛠️ Architecture

*   **AuthService**: Handles Google OAuth2 loopback and encrypted configuration management.
*   **Adapter Layer**: Standardizes AI requests across Gemini, OpenAI, and Ollama.
*   **Engine Orchestrator**: Centralized AI request manager and provider switcher.
*   **Writer**: Parses XML-style `<file>` tags from AI output to safely apply changes.

---

## 🤝 Contributing

Contributions are welcome! Please ensure you maintain the "Strict Mode" philosophy—DevScript is built to be a tool for engineers, not a general-purpose chat interface.

**Author**: Anguzu Daniel
**License**: ISC
