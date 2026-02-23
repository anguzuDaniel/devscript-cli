import type { ProviderAdapter } from './provider.interface.js';
import { AuthService } from '../services/auth.service.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiAdapter implements ProviderAdapter {
  constructor(private authService: AuthService) {}

  async generateResponse(prompt: string): Promise<string> {
    try {
      // 1. Try API Key first (easiest way)
      const apiKey = this.authService.getApiKey('gemini');
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      }

      // 2. Fallback to OAuth if no API key is set
      const auth = await this.authService.getAuthenticatedClient();
      const token = await auth.getAccessToken();

      const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data: any = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '[Error]: No response from Gemini OAuth';
    } catch (error: any) {
      return `[Gemini Adapter Error]: ${error.message}. Hint: Try setting an API key with "devscript config set-key gemini <key>" if OAuth is failing.`;
    }
  }
}
