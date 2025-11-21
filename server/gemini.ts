import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateCode(
  prompt: string,
  mode: string,
  model: string = "gemini-2.0-flash"
): Promise<string> {
  const systemPrompts: Record<string, string> = {
    generate: "You are an expert code generator. Generate clean, efficient, and well-documented code based on the user's request.",
    test: "You are an expert at writing comprehensive test cases. Generate unit tests, integration tests, or e2e tests as appropriate for the given code.",
    document: "You are an expert technical writer. Generate clear, comprehensive documentation including usage examples, parameter descriptions, and return values.",
    refactor: "You are an expert at code refactoring. Improve code quality, performance, and maintainability while preserving functionality.",
    boilerplate: "You are an expert at creating code templates and boilerplate. Generate reusable, well-structured code templates.",
    explain: "You are an expert code reviewer and educator. Provide detailed explanations of code functionality, potential issues, and best practices.",
  };

  const systemInstruction = systemPrompts[mode] || systemPrompts.generate;

  try {
    const response = await ai.models.generateContent({
      model,
      config: {
        systemInstruction,
      },
      contents: prompt,
    });

    return response.text || "Unable to generate response";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function explainCode(code: string, model: string = "gemini-1.5-pro"): Promise<any> {
  const systemPrompt = `You are an expert code reviewer and security analyst. 
Analyze the provided code line by line and return a JSON array of explanations.
For each significant line, provide:
- lineNumber: the line number (starting from 1)
- code: the actual code on that line
- explanation: a clear explanation of what the line does
- riskLevel: "low", "medium", or "high" (optional, only if there's a concern)
- performanceNote: any performance considerations (optional)
- securityIssue: any security concerns (optional)

Focus on important lines and group trivial lines together.
Return ONLY valid JSON, no markdown or extra text.`;

  try {
    const response = await ai.models.generateContent({
      model,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: `Analyze this code:\n\n${code}`,
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(`Failed to explain code: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function analyzeHotspotFile(
  filePath: string,
  commitCount: number,
  model: string = "gemini-2.0-flash"
): Promise<string> {
  const prompt = `As a code quality expert, analyze this file: ${filePath}
It has been changed ${commitCount} times recently.

Provide a brief analysis (2-3 sentences) covering:
1. Why this file might be changing frequently
2. Potential risks or concerns
3. Recommendations for improvement

Keep it concise and actionable.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Analysis unavailable";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Unable to generate analysis";
  }
}
