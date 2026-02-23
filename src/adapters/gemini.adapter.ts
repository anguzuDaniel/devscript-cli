import type { ProviderAdapter } from './provider.interface.js';
import { AuthService } from '../services/auth.service.js';
import { GoogleAuth } from 'google-auth-library';

export class GeminiAdapter implements ProviderAdapter {
  constructor(private authService: AuthService) {}

  async generateResponse(prompt: string): Promise<string> {
    try {
      const auth = await this.authService.getAuthenticatedClient();
      const token = await auth.getAccessToken();

      // Using the REST API directly with the OAuth2 token
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
      
      if (data.error) {
        return `[Gemini Error]: ${data.error.message}`;
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || '[Error]: No response from Gemini';
    } catch (error: any) {
      return `[Gemini Adapter Error]: ${error.message}`;
    }
  }
}
