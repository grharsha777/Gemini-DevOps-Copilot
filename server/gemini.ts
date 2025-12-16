import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Mistral } from "@mistralai/mistralai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.0-flash" or "gemini-1.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
// This API key is from Gemini Developer API Key, not vertex AI API Key
// Removed global 'ai' constant to prevent early initialization before dotenv loads


export async function generateCode(
  prompt: string,
  mode: string,
  modelName: string = "gemini-2.0-flash-exp",
): Promise<string> {
  const systemPrompts: Record<string, string> = {
    generate:
      "You are CodeVortexAI, an advanced intelligent coding assistant. Generate highly optimized, modern, and production-ready code. Focus on clean architecture, type safety, and best practices. Your code should be robust and scalable.",
    test: "You are the Vortex Quality Assurance AI. Create comprehensive, edge-case covering test suites using modern testing frameworks. Ensure 100% critical path coverage.",
    document:
      "You are the Vortex Documentation Engine. Produce crystal-clear, developer-centric documentation. Include implementation details, usage patterns, and API references.",
    refactor:
      "You are the Vortex Refactoring Core. Analyze code for deeper structural improvements. Optimize for performance, readability, and maintainability without altering behavior.",
    boilerplate:
      "You are the Vortex Scaffolder. Generate solid, extensible foundational code structures that serve as perfect starting points for complex systems.",
    explain:
      "You are the Vortex Educator. Deconstruct complex logic into understandable concepts. Explain the 'why' and 'how' with precision.",
  };

  const systemInstruction = systemPrompts[mode] || systemPrompts.generate;

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is missing in environment variables");
    }

    console.log(`[Gemini] Initializing with model: ${modelName} `);

    // Initialize GoogleGenerativeAI with the API key
    const genAI = new GoogleGenerativeAI(key);

    // Get the generative model
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini API error details:", JSON.stringify(error, null, 2));

    // Try Mistral (Verified Working)
    if (process.env.MISTRAL_API_KEY) {
      console.log("[Gemini] Failed. Falling back to Mistral...");
      try {
        const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
        const chatResponse = await client.chat.complete({
          model: "mistral-large-latest",
          messages: [{ role: 'user', content: prompt }],
        });

        const text = chatResponse.choices?.[0].message.content;
        if (typeof text === 'string') return text;
        if (Array.isArray(text)) return text.join('');
        throw new Error("Invalid Mistral response format");
      } catch (mistralError: any) {
        console.error("Mistral Fallback error:", mistralError);
      }
    }

    // Try Claude fallback
    if (process.env.ANTHROPIC_API_KEY) {
      console.log("[Gemini/Mistral] Failed. Falling back to Claude...");
      try {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8192,
          system: systemInstruction,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const textBlock = response.content[0];
        if (textBlock.type === "text") {
          return textBlock.text;
        }
      } catch (claudeError: any) {
        console.error("Claude Fallback API error:", claudeError);
      }
    }

    // Try DeepSeek fallback
    if (process.env.DEEPSEEK_API_KEY) {
      console.log("[All others] Failed. Falling back to DeepSeek...");
      try {
        const openai = new OpenAI({
          baseURL: 'https://api.deepseek.com',
          apiKey: process.env.DEEPSEEK_API_KEY
        });
        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }],
          model: "deepseek-chat",
        });
        return completion.choices[0].message.content || "No response from DeepSeek";
      } catch (deepseekError: any) {
        console.error("DeepSeek Fallback error:", deepseekError);
      }
    }

    throw new Error(
      `Failed to generate content: ${error.message || "Unknown error"}`,
    );
  }
}

export async function explainCode(
  code: string,
  modelName: string = "gemini-1.5-pro",
): Promise<any> {
  const systemPrompt = `You are an expert code reviewer and security analyst. 
Analyze the provided code line by line and return a JSON array of explanations.
For each significant line, provide:
- lineNumber: the line number(starting from 1)
  - code: the actual code on that line
    - explanation: a clear explanation of what the line does
      - riskLevel: "low", "medium", or "high"(optional, only if there's a concern)
        - performanceNote: any performance considerations(optional)
          - securityIssue: any security concerns(optional)

Focus on important lines and group trivial lines together.
Return ONLY valid JSON, no markdown or extra text.`;

  // Try Claude first if API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Analyze this code: \n\n${code} `,
          },
        ],
      });

      const textBlock = response.content[0];
      if (textBlock.type === "text") {
        const rawJson = textBlock.text.trim();
        // Clean up markdown code blocks if present
        const jsonStr = rawJson.replace(/^```json\s *|\s * ```$/g, "").trim();
        return JSON.parse(jsonStr);
      }
    } catch (error) {
      console.error("Claude API error:", error);
      // Fallback to Gemini if Claude fails
      console.log("Falling back to Gemini...");
    }
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(`Analyze this code: \n\n${code} `);
    const response = await result.response;
    const text = response.text();

    if (text) {
      return JSON.parse(text);
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error: any) {
    console.error("Gemini API error:", error);

    // Try Mistral Fallback for Explanation
    if (process.env.MISTRAL_API_KEY) {
      console.log("[Gemini] Explanation failed. Falling back to Mistral...");
      try {
        const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
        const chatResponse = await client.chat.complete({
          model: "mistral-large-latest",
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this code:\n\n${code}` }
          ],
          responseFormat: { type: "json_object" }
        });

        const text = chatResponse.choices?.[0].message.content;
        if (typeof text === 'string') {
          const jsonStr = text.replace(/^```json\s*|\s*```$/g, "").trim();
          const parsed = JSON.parse(jsonStr);

          if (Array.isArray(parsed)) {
            return parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            // Mistral json_object mode forces an object, but we need an array.
            // Try to find the array in the object values.
            const values = Object.values(parsed);
            const arrayValue = values.find(val => Array.isArray(val));
            if (arrayValue) return arrayValue;

            // If no array found, implies we might need to enforce the structure in the prompt more strictly
            // or return the object if it happens to match schema (unlikely for "array" requirement)
          }
          return parsed;
        }
      } catch (mistralError: any) {
        console.error("Mistral Explanation Fallback error:", mistralError);
      }
    }

    throw new Error(
      `Failed to explain code: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function analyzeHotspotFile(
  filePath: string,
  commitCount: number,
  modelName: string = "gemini-2.0-flash-exp",
): Promise<string> {
  const prompt = `As a code quality expert, analyze this file: ${filePath}
It has been changed ${commitCount} times recently.

Provide a brief analysis(2 - 3 sentences) covering:
1. Why this file might be changing frequently
2. Potential risks or concerns
3. Recommendations for improvement

Keep it concise and actionable.`;

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return "Analysis unavailable (Missing API Key)";

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Analysis unavailable";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Unable to generate analysis";
  }
}

