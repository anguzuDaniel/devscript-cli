# ◈ DevScript CLI

**The structured language for AI-native engineering.**

DevScript is a high-density prompting engine that bridges the gap between your local source code and LLMs (Large Language Models). Instead of copy-pasting code into a browser, DevScript allows you to "hydrate" your local files into a structured context and execute tasks directly from your terminal.

---

## ◈ Core Syntax

DevScript uses a minimalist symbol set to define the "Soul," "Knowledge," and "Action" of a task.

| Symbol | Name | Description |
| --- | --- | --- |
| `#` | **Persona** | Defines the expertise and viewpoint of the AI (e.g., `# Senior React Dev`). |
| `%` | **Style** | Defines the tone of the response (e.g., `% Stoic and concise`). |
| `@` | **Context** | Path to a local file to be "hydrated" into the prompt. |
| `!` | **Rules** | Strict constraints or guardrails the AI must follow. |
| `>` | **Task** | The actual instruction or bug you want to solve. |

---

## ◈ Getting Started

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/devscript-cli.git
cd devscript-cli
npm install

```

### 2. Configure API Key

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_google_ai_studio_key_here

```

### 3. Run Your First Script

Create a file named `test.dev`:

```pdev
# Senior Software Engineer
% Stoic
@ src/ui/RunCommandUI.tsx
> Explain how the useInput hook is being used here.

```

Execute it:

```bash
npm run dev

```

---

## 4. Interactive CLI Features

The DevScript Engine provides a reactive terminal dashboard built with **Ink**.

* **[Enter]**: Execute the script and call the Gemini API.
* **[s]**: Save the AI's response to a local `.md` file automatically.
* **[q]**: Gracefully exit the engine.

---

## ◈ Project Architecture

DevScript follows a **Pipe-and-Filter** architecture:

1. **Parser**: Breaks down `.dev` symbols into a JSON object.
2. **Hydrator**: Reads the physical files defined by `@` and injects them as text.
3. **Builder**: Assembles a high-density system prompt.
4. **Engine**: Manages the I/O between the user, the disk, and the Gemini API.

---

## ◈ Philosophy

> "First say to yourself what you would be; and then do what you have to do." — Epictetus

DevScript is built on the Stoic principle of **clarity.** By explicitly defining the persona, the context, and the rules, we remove the "noise" of modern AI chat interfaces and focus purely on the logic of the problem.

---

## ◈ License

MIT