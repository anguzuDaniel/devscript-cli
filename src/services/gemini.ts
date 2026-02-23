import { GoogleGenerativeAI } from "@google/generative-ai";
export async function askGemini(fullPrompt: string, apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName: string = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });
  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText: string = response.text();
    if (!responseText) {
      return "[API ERROR]: Gemini returned no text. This may be due to safety filters or an empty response from the model.";
    }
    return responseText;
  } catch (error: unknown) {
    const err = error as Error; 
    return `[API ERROR]: ${err.message}`;
  }
}