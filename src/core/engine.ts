import { AuthService } from '../services/auth.service.js';
import type { ProviderAdapter } from '../adapters/provider.interface.js';
import { GeminiAdapter } from '../adapters/gemini.adapter.js';
import { OpenAIAdapter } from '../adapters/openai.adapter.js';
import { OllamaAdapter } from '../adapters/ollama.adapter.js';

export class Engine {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public getAuthService(): AuthService {
    return this.authService;
  }

  private getAdapter(): ProviderAdapter {
    const provider = this.authService.getActiveProvider();

    switch (provider.toLowerCase()) {
      case 'gemini':
        return new GeminiAdapter(this.authService);
      case 'openai':
        return new OpenAIAdapter(this.authService);
      case 'ollama':
        return new OllamaAdapter();
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  public async generateResponse(prompt: string): Promise<string> {
    const adapter = this.getAdapter();
    return await adapter.generateResponse(prompt);
  }
}

// Export a singleton instance
export const engine = new Engine();
