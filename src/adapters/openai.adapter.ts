import OpenAI from 'openai';
import type { ProviderAdapter } from './provider.interface.js';
import { AuthService } from '../services/auth.service.js';

export class OpenAIAdapter implements ProviderAdapter {
  private client: OpenAI;

  constructor(authService: AuthService) {
    const apiKey = authService.getApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API Key not found. Use "devscript config set-key openai <key>"');
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      });

      return response.choices[0]?.message?.content || '[Error]: No response from OpenAI';
    } catch (error: any) {
      return `[OpenAI Error]: ${error.message}`;
    }
  }
}
