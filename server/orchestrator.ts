import { AIProvider } from "@shared/schema";
import { generateWithProvider } from "./gemini";

interface OrchestratorOptions {
  prompt: string;
  mode: string;
  context?: any;
  userConfig?: {
    provider: AIProvider;
    apiKey: string;
    model?: string;
    baseUrl?: string;
  }[];
}

export class ModelOrchestrator {
  private static readonly DEFAULT_FALLBACK_CHAIN: AIProvider[] = [
    "gemini",
    "mistral",
    "anthropic",
    "deepseek"
  ];

  static async generate(options: OrchestratorOptions): Promise<{ text: string; provider: AIProvider }> {
    const { prompt, mode, userConfig } = options;

    // 1. Try user-provided configurations first if they exist
    if (userConfig && userConfig.length > 0) {
      for (const config of userConfig) {
        try {
          console.log(`[Orchestrator] Attempting with user-provided ${config.provider}...`);
          const text = await generateWithProvider(prompt, mode, config);
          return { text, provider: config.provider };
        } catch (error) {
          console.error(`[Orchestrator] User-provided ${config.provider} failed:`, error);
          continue; // Try next user config
        }
      }
    }

    // 2. Fallback to platform-level keys in predefined order
    for (const provider of this.DEFAULT_FALLBACK_CHAIN) {
      const apiKey = this.getPlatformKey(provider);
      if (!apiKey) {
        console.log(`[Orchestrator] Skipping ${provider}: No platform API key found.`);
        continue;
      }

      try {
        console.log(`[Orchestrator] Attempting with platform ${provider}...`);
        const text = await generateWithProvider(prompt, mode, {
          provider,
          apiKey,
        });
        return { text, provider };
      } catch (error: any) {
        const errorMsg = error?.message || "Unknown error";
        console.error(`[Orchestrator] Platform ${provider} failed: ${errorMsg}`);

        // If it's a rate limit or service overload, we definitely want to fall back.
        // If it's a fatal error (like invalid prompt), we might want to stop, 
        // but for now, we follow the chain to ensure maximum availability.
        continue;
      }
    }

    throw new Error("AI Orchestration failed: All models in the fallback chain (Gemini, Mistral, Anthropic, DeepSeek) are currently unavailable or rejected the request. Please check your API keys or try again later.");
  }

  private static getPlatformKey(provider: AIProvider): string | undefined {
    switch (provider) {
      case "gemini": return process.env.GEMINI_API_KEY;
      case "mistral": return process.env.MISTRAL_API_KEY;
      case "anthropic": return process.env.ANTHROPIC_API_KEY;
      case "deepseek": return process.env.DEEPSEEK_API_KEY;
      case "groq": return process.env.GROQ_API_KEY;
      case "openai": return process.env.OPENAI_API_KEY;
      default: return undefined;
    }
  }
}
