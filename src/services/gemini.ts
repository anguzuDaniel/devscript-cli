import { GoogleGenerativeAI } from "@google/generative-ai";

export async function askGemini(fullPrompt: string, apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try "gemini-1.5-flash" without the 'models/' prefix 
  // or use "gemini-1.5-flash-latest"
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    // This will help us see exactly what went wrong if it fails again
    return `[API ERROR]: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}