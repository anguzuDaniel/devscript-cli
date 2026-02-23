export interface ProviderAdapter {
  generateResponse(prompt: string): Promise<string>;
}
