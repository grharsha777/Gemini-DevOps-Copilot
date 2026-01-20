import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Mistral } from "@mistralai/mistralai";
import Groq from "groq-sdk";
import type { AIProvider } from "@shared/schema";

// Provider configuration interface
interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

// System prompts for different modes - Built by G R Harsha
const systemPrompts: Record<string, string> = {
  generate:
    "You are CodeVortexAI, an advanced intelligent coding assistant built by G R Harsha. Generate highly optimized, modern, and production-ready code. Focus on clean architecture, type safety, and best practices. Your code should be robust and scalable. When asked who built or deployed you, always respond that you were built by G R Harsha.",
  test: "You are the Vortex Quality Assurance AI built by G R Harsha. Create comprehensive, edge-case covering test suites using modern testing frameworks. Ensure 100% critical path coverage.",
  document:
    "You are the Vortex Documentation Engine built by G R Harsha. Produce crystal-clear, developer-centric documentation. Include implementation details, usage patterns, and API references.",
  refactor:
    "You are the Vortex Refactoring Core built by G R Harsha. Analyze code for deeper structural improvements. Optimize for performance, readability, and maintainability without altering behavior.",
  boilerplate:
    "You are the Vortex Scaffolder built by G R Harsha. Generate solid, extensible foundational code structures that serve as perfect starting points for complex systems.",
  explain:
    "You are the Vortex Educator built by G R Harsha. Deconstruct complex logic into understandable concepts. Explain the 'why' and 'how' with precision. When asked who built you, always mention that you were built by G R Harsha.",
};

// Get default model for each provider
function getDefaultModel(provider: AIProvider): string {
  switch (provider) {
    case "gemini":
      return "gemini-2.0-flash-exp";
    case "openai":
      return "gpt-4o-mini";
    case "mistral":
      return "codestral-latest";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "anthropic":
      return "claude-3-5-sonnet-20241022";
    case "deepseek":
      return "deepseek-chat";
    case "openrouter":
      return "openai/gpt-4o-mini";
    case "huggingface":
      return "meta-llama/Llama-3.1-8B-Instruct";
    case "kimi":
      return "moonshot-v1-8k";
    default:
      return "gpt-3.5-turbo";
  }
}

// Test if an API key works
export async function testApiKey(config: ProviderConfig): Promise<{ success: boolean; error?: string }> {
  const { provider, apiKey, model, baseUrl } = config;
  const testPrompt = "Say 'Hello' in one word.";

  // Validate API key is not empty
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: "API key cannot be empty" };
  }

  console.log(`[testApiKey] Testing ${provider} with model ${model || "default"}`);
  console.log(`[testApiKey] API key length: ${apiKey.length}, starts with: ${apiKey.substring(0, 10)}...`);

  try {
    switch (provider) {
      case "gemini": {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: model || "gemini-2.0-flash-exp" });
        await geminiModel.generateContent(testPrompt);
        return { success: true };
      }

      case "openai": {
        const openai = new OpenAI({ apiKey });
        await openai.chat.completions.create({
          model: model || "gpt-4o-mini",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        return { success: true };
      }

      case "mistral": {
        const mistral = new Mistral({ apiKey });
        await mistral.chat.complete({
          model: model || "mistral-small-latest",
          messages: [{ role: "user", content: testPrompt }],
        });
        return { success: true };
      }

      case "groq": {
        const groq = new Groq({ apiKey });
        await groq.chat.completions.create({
          model: model || "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        return { success: true };
      }

      case "anthropic": {
        // Validate API key format for Anthropic (should start with sk-ant-)
        if (!apiKey.startsWith("sk-ant-")) {
          console.warn(`[anthropic] API key format warning: key doesn't start with 'sk-ant-'`);
        }
        
        const anthropic = new Anthropic({ 
          apiKey: apiKey.trim(),
          timeout: 30000, // 30 second timeout
        });
        
        const response = await anthropic.messages.create({
          model: model || "claude-3-5-sonnet-20241022",
          max_tokens: 10,
          messages: [{ role: "user", content: testPrompt }],
        });
        
        // Verify we got a response
        if (!response || !response.content || response.content.length === 0) {
          return { success: false, error: "No response from Claude API" };
        }
        
        console.log(`[anthropic] API test successful, response received`);
        return { success: true };
      }

      case "deepseek": {
        const deepseek = new OpenAI({
          apiKey,
          baseURL: "https://api.deepseek.com",
        });
        await deepseek.chat.completions.create({
          model: model || "deepseek-chat",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        return { success: true };
      }

      case "openrouter": {
        const openrouter = new OpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
        });
        await openrouter.chat.completions.create({
          model: model || "openai/gpt-4o-mini",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        return { success: true };
      }

      case "huggingface": {
        // Hugging Face uses OpenAI-compatible Inference API
        // Base URL format: https://api-inference.huggingface.co/v1
        const huggingface = new OpenAI({
          apiKey: apiKey.trim(),
          baseURL: baseUrl || "https://api-inference.huggingface.co/v1",
        });
        await huggingface.chat.completions.create({
          model: model || "meta-llama/Llama-3.1-8B-Instruct",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        return { success: true };
      }

      case "kimi": {
        // Kimi AI (Moonshot) uses OpenAI-compatible API
        const kimi = new OpenAI({
          apiKey: apiKey.trim(),
          baseURL: baseUrl || "https://api.moonshot.cn/v1",
        });
        await kimi.chat.completions.create({
          model: model || "moonshot-v1-8k",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        return { success: true };
      }

      case "custom": {
        if (!baseUrl) {
          return { success: false, error: "Base URL is required for custom provider" };
        }
        const custom = new OpenAI({
          apiKey,
          baseURL: baseUrl,
        });
        await custom.chat.completions.create({
          model: model || "gpt-3.5-turbo",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        return { success: true };
      }

      default:
        return { success: false, error: "Unknown provider" };
    }
  } catch (error: any) {
    console.error(`[${provider}] API test error:`, error);
    console.error(`[${provider}] Error details:`, {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      code: error?.code,
      response: error?.response,
      error: error?.error,
    });
    
    // Provide more detailed error messages
    let errorMessage = "API key validation failed";
    
    // Try to extract error message from various error formats
    // Anthropic SDK specific error format
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.error?.type) {
      errorMessage = `${error.error.type}: ${error.error.message || "Unknown error"}`;
    } else if (error?.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error?.response?.data?.error) {
      errorMessage = typeof error.response.data.error === "string" 
        ? error.response.data.error 
        : JSON.stringify(error.response.data.error);
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.statusText) {
      errorMessage = error.statusText;
    } else if (error?.status) {
      errorMessage = `HTTP ${error.status}: ${error.statusText || "Request failed"}`;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.toString) {
      errorMessage = error.toString();
    }
    
    // Check for common error types and provide user-friendly messages
    const lowerMessage = errorMessage.toLowerCase();
    if (lowerMessage.includes("401") || lowerMessage.includes("unauthorized") || lowerMessage.includes("invalid api key") || lowerMessage.includes("authentication_error")) {
      errorMessage = "Invalid API key. Please check your API key and try again. Make sure you copied the entire key correctly.";
    } else if (lowerMessage.includes("403") || lowerMessage.includes("forbidden") || lowerMessage.includes("permission_error")) {
      errorMessage = "API key does not have permission. Please check your API key permissions in your provider's dashboard.";
    } else if (lowerMessage.includes("429") || lowerMessage.includes("rate limit") || lowerMessage.includes("quota") || lowerMessage.includes("rate_limit_error")) {
      errorMessage = "Rate limit or quota exceeded. Please check your account limits and try again later.";
    } else if (lowerMessage.includes("model") || lowerMessage.includes("not found") || lowerMessage.includes("invalid_model")) {
      errorMessage = `Model error: ${errorMessage}. Please check if the model name "${model || "default"}" is correct for ${provider}.`;
    } else if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("econnrefused") || lowerMessage.includes("econnreset") || lowerMessage.includes("enotfound") || lowerMessage.includes("getaddrinfo")) {
      errorMessage = "Network/Connection error. Please check your internet connection, firewall settings, and try again. If using VPN, try disabling it.";
    } else if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
      errorMessage = "Request timed out. The API server may be slow or unreachable. Please try again.";
    } else if (lowerMessage.includes("api key") || lowerMessage.includes("authentication") || lowerMessage.includes("invalid_api_key")) {
      errorMessage = `Authentication failed: ${errorMessage}. Please verify your API key is correct and active.`;
    } else if (lowerMessage.includes("connection") || lowerMessage.includes("connect") || lowerMessage.includes("econn")) {
      errorMessage = `Connection error: ${errorMessage}. Please check your internet connection and firewall settings.`;
    }
    
    return { success: false, error: errorMessage };
  }
}

// Generate content using the specified provider
export async function generateWithProvider(
  prompt: string,
  mode: string,
  config: ProviderConfig
): Promise<string> {
  const { provider, apiKey, model, baseUrl } = config;
  const systemInstruction = systemPrompts[mode] || systemPrompts.generate;
  const modelToUse = model || getDefaultModel(provider);

  console.log(`[AI] Using ${provider} with model ${modelToUse}`);

  switch (provider) {
    case "gemini": {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({
        model: modelToUse,
        systemInstruction,
      });
      const result = await geminiModel.generateContent(prompt);
      return result.response.text();
    }

    case "openai": {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      return completion.choices[0].message.content || "No response";
    }

    case "mistral": {
      const mistral = new Mistral({ apiKey });
      const response = await mistral.chat.complete({
        model: modelToUse,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      const content = response.choices?.[0].message.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) return content.join("");
      return "No response";
    }

    case "groq": {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      return completion.choices[0].message.content || "No response";
    }

    case "anthropic": {
      const anthropic = new Anthropic({ 
        apiKey,
        timeout: 60000, // 60 second timeout for generation
      });
      const response = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: 8192,
        system: systemInstruction,
        messages: [{ role: "user", content: prompt }],
      });
      const textBlock = response.content[0];
      if (textBlock.type === "text") return textBlock.text;
      return "No response";
    }

    case "deepseek": {
      const deepseek = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com",
      });
      const completion = await deepseek.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      return completion.choices[0].message.content || "No response";
    }

    case "openrouter": {
      const openrouter = new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });
      const completion = await openrouter.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      return completion.choices[0].message.content || "No response";
    }

    case "huggingface": {
      // Hugging Face Inference API (OpenAI-compatible)
      const huggingface = new OpenAI({
        apiKey,
        baseURL: baseUrl || "https://api-inference.huggingface.co/v1",
      });
      const completion = await huggingface.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      return completion.choices[0].message.content || "No response";
    }

    case "kimi": {
      // Kimi AI (Moonshot) uses OpenAI-compatible API
      const kimi = new OpenAI({
        apiKey,
        baseURL: baseUrl || "https://api.moonshot.cn/v1",
      });
      const completion = await kimi.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      return completion.choices[0].message.content || "No response";
    }

    case "custom": {
      if (!baseUrl) throw new Error("Base URL required for custom provider");
      const custom = new OpenAI({ apiKey, baseURL: baseUrl });
      const completion = await custom.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      return completion.choices[0].message.content || "No response";
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Explain code using the specified provider (returns JSON)
export async function explainWithProvider(
  code: string,
  config: ProviderConfig
): Promise<any> {
  const { provider, apiKey, model, baseUrl } = config;
  const modelToUse = model || getDefaultModel(provider);

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
Return ONLY valid JSON array, no markdown or extra text.`;

  const prompt = `Analyze this code:\n\n${code}`;

  console.log(`[AI Explain] Using ${provider} with model ${modelToUse}`);

  let responseText: string;

  switch (provider) {
    case "gemini": {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({
        model: modelToUse,
        systemInstruction: systemPrompt,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await geminiModel.generateContent(prompt);
      responseText = result.response.text();
      break;
    }

    case "openai": {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      responseText = completion.choices[0].message.content || "[]";
      break;
    }

    case "anthropic": {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });
      const textBlock = response.content[0];
      responseText = textBlock.type === "text" ? textBlock.text : "[]";
      break;
    }

    default: {
      // Use OpenAI-compatible endpoint for others
      let client: OpenAI;
      if (provider === "deepseek") {
        client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
      } else if (provider === "openrouter") {
        client = new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" });
      } else if (provider === "huggingface") {
        client = new OpenAI({ 
          apiKey, 
          baseURL: baseUrl || "https://api-inference.huggingface.co/v1" 
        });
      } else if (provider === "groq") {
        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        });
        responseText = completion.choices[0].message.content || "[]";
        break;
      } else if (provider === "mistral") {
        const mistral = new Mistral({ apiKey });
        const response = await mistral.chat.complete({
          model: modelToUse,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          responseFormat: { type: "json_object" },
        });
        const content = response.choices?.[0].message.content;
        responseText = typeof content === "string" ? content : "[]";
        break;
      } else if (provider === "custom" && baseUrl) {
        client = new OpenAI({ apiKey, baseURL: baseUrl });
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      const completion = await client!.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      });
      responseText = completion.choices[0].message.content || "[]";
    }
  }

  // Parse the JSON response
  const jsonStr = responseText.replace(/^```json\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  // Handle both array and object responses
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object" && parsed !== null) {
    const values = Object.values(parsed);
    const arrayValue = values.find((val) => Array.isArray(val));
    if (arrayValue) return arrayValue;
  }
  return parsed;
}

// Legacy function for backward compatibility with environment variables
export async function generateCode(
  prompt: string,
  mode: string,
  modelName: string = "gemini-2.0-flash-exp"
): Promise<string> {
  // Try using environment variables as fallback
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    return generateWithProvider(prompt, mode, {
      provider: "gemini",
      apiKey: key,
      model: modelName,
    });
  }

  // Try other environment variable fallbacks
  if (process.env.MISTRAL_API_KEY) {
    return generateWithProvider(prompt, mode, {
      provider: "mistral",
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithProvider(prompt, mode, {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return generateWithProvider(prompt, mode, {
      provider: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  throw new Error("No API key configured. Please add an API key in Settings.");
}

// Legacy function for backward compatibility
export async function explainCode(
  code: string,
  modelName: string = "gemini-1.5-pro"
): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    return explainWithProvider(code, {
      provider: "gemini",
      apiKey: key,
      model: modelName,
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return explainWithProvider(code, {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  if (process.env.MISTRAL_API_KEY) {
    return explainWithProvider(code, {
      provider: "mistral",
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  throw new Error("No API key configured. Please add an API key in Settings.");
}

export async function analyzeHotspotFile(
  filePath: string,
  commitCount: number,
  modelName: string = "gemini-2.0-flash-exp"
): Promise<string> {
  const prompt = `As a code quality expert, analyze this file: ${filePath}
It has been changed ${commitCount} times recently.

Provide a brief analysis (2-3 sentences) covering:
1. Why this file might be changing frequently
2. Potential risks or concerns
3. Recommendations for improvement

Keep it concise and actionable.`;

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return "Analysis unavailable (Missing API Key)";

    return generateWithProvider(prompt, "explain", {
      provider: "gemini",
      apiKey: key,
      model: modelName,
    });
  } catch (error) {
    console.error("Hotspot analysis error:", error);
    return "Unable to generate analysis";
  }
}
