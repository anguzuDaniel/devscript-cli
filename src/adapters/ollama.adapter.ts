import type { ProviderAdapter } from './provider.interface.js';

export class OllamaAdapter implements ProviderAdapter {
  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: prompt,
          stream: false
        })
      });

      const data: any = await response.json();
      return data.response || '[Error]: No response from Ollama';
    } catch (error: any) {
      return `[Ollama Error]: Is Ollama running on localhost:11434? - ${error.message}`;
    }
  }
}
