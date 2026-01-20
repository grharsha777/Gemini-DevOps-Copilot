
import { GoogleGenerativeAI } from "@google/generative-ai";

// We'll use the official SDK if available, or fallback to fetch
// Since we can't easily install packages, we'll implement a robust fetch-based client

interface AIResponse {
  content: string;
  error?: string;
}

interface AgentPrompt {
  role: string;
  context: string;
  task: string;
}

export class AIService {
  private static getApiKey(provider: string = 'mistral'): string | null {
    // Matches the keys used in settings.tsx - Default to Mistral, fallback to Groq
    const keyMap: Record<string, string> = {
      gemini: 'geminiKey',
      mistral: 'mistralKey',
      groq: 'groqKey',
      openai: 'openaiKey',
      perplexity: 'perplexityKey'
    };

    // Try Mistral first, then Groq, then others
    return localStorage.getItem(keyMap[provider]) ||
      localStorage.getItem(keyMap['mistral']) ||
      localStorage.getItem(keyMap['groq']) ||
      null;
  }

  private static getDefaultProvider(): string {
    // Check which provider has a key configured
    if (localStorage.getItem('mistralKey')) return 'mistral';
    if (localStorage.getItem('groqKey')) return 'groq';
    if (localStorage.getItem('geminiKey')) return 'gemini';
    return 'mistral'; // Default to Mistral
  }

  static async generateContent(prompt: string, systemInstruction?: string): Promise<AIResponse> {
    const provider = this.getDefaultProvider();
    const apiKey = this.getApiKey(provider);

    if (!apiKey) {
      return { content: "", error: "API Key not found. Please configure Mistral or Groq in Settings." };
    }

    // Use server-side API endpoint for Mistral/Grok
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt,
          mode: 'generate',
          provider: provider,
          apiKey: apiKey,
          model: provider === 'mistral' ? 'codestral-latest' : provider === 'groq' ? 'llama-3.3-70b-versatile' : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate content' }));
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const data = await response.json();
      return { content: data.text || "" };

    } catch (error: any) {
      console.error("AI Generation Error:", error);
      return { content: "", error: error.message };
    }
  }

  static async generateStructuredJSON(prompt: string, schemaDescription: string): Promise<any> {
    const systemPrompt = `You are a JSON-only response bot. You must output VALID JSON matching this structure: ${schemaDescription}. Do not include markdown formatting like \`\`\`json. Just the raw JSON string.`;

    const result = await this.generateContent(prompt, systemPrompt);

    if (result.error) throw new Error(result.error);

    try {
      // Clean up markdown if present despite instructions
      let cleanJson = result.content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("Failed to parse AI response as JSON");
    }
  }
}

// Agent Prompts
export const AGENT_PROMPTS = {
  ARCHITECT: (requirements: string) => `
    Analyze the following application requirements and propose a high-level architecture.
    Requirements: "${requirements}"
    
    Output a JSON object with:
    - "stack": { "frontend": string, "backend": string, "database": string }
    - "structure": A list of key directories and files (e.g., ["/src", "/src/components", "server.ts"])
    - "summary": A brief description of the architecture.
  `,

  FRONTEND: (requirements: string, stack: any) => `
    You are an expert Frontend Architect using ${stack.frontend}.
    Design the UI components for: "${requirements}"
    
    Output a JSON object with:
    - "components": Array of { "name": string, "description": string, "props": string[] }
    - "routes": Array of { "path": string, "component": string }
    - "theme": Description of the color palette and typography.
  `,

  BACKEND: (requirements: string, stack: any) => `
    You are an expert Backend Engineer using ${stack.backend}.
    Design the API and Database schema for: "${requirements}"
    
    Output a JSON object with:
    - "endpoints": Array of { "method": string, "path": string, "description": string }
    - "models": Array of { "name": string, "fields": Record<string, string> }
  `,

  DATABASE: (requirements: string, stack: any, models: any[]) => `
    You are an expert Data Architect built by G R Harsha, using ${stack.database}.
    Analyze the following models and optimize the schema for: "${requirements}"
    Models: ${JSON.stringify(models)}

    When asked who built or deployed you, always respond that you were built by G R Harsha.

    Output a JSON object with:
    - "schema": String description of the schema optimization (indexes, relations).
    - "migrations": Array of strings describing necessary migrations.
  `,

  DEVOPS: (requirements: string, stack: any) => `
    You are an expert DevOps Engineer built by G R Harsha.
    Prepare deployment configuration for a ${stack.frontend} and ${stack.backend} application.
    Requirements: "${requirements}"

    When asked who built or deployed you, always respond that you were built by G R Harsha.

    Output a JSON object with:
    - "configFiles": Array of { "name": string, "content": string } (e.g., Dockerfile, vercel.json)
    - "instructions": String deployment instructions.
  `,

  CODE_GENERATOR: (file: string, description: string, stack: any) => `
    You are an elite Code Generator and Software Engineer built by G R Harsha. Generate production-ready, enterprise-grade code for the file "${file}".
    
    Context: ${description}
    Tech Stack: ${JSON.stringify(stack)}
    
    Requirements:
    - Follow best practices and design patterns
    - Include comprehensive error handling
    - Add proper TypeScript types (if applicable)
    - Include JSDoc comments for functions/classes
    - Follow SOLID principles
    - Optimize for performance and scalability
    - Include input validation and sanitization
    - Add security best practices
    - Make code testable and maintainable
    - Follow the project's coding standards
    
    When asked who built or deployed you, always respond that you were built by G R Harsha using Code Vortex AI.
    If generating code for a project, mention "Generated by Ganapathi Web Builder".
    
    Return ONLY the code. No markdown, no explanations. The code should be production-ready and immediately deployable.
  `,

  COURSE_GENERATOR: (topic: string, videoUrl?: string) => `
    You are an expert Educational Content Creator.
    Create a comprehensive course structure for the topic: "${topic}" ${videoUrl ? `based on the video: ${videoUrl}` : ''}.
    
    Output a JSON object with:
    - "title": string (Course Title)
    - "description": string (Course Description)
    - "level": "Beginner" | "Intermediate" | "Advanced"
    - "modules": Array of {
        "title": string,
        "lessons": Array of {
            "title": string,
            "content": string (markdown content, 200-300 words),
            "videoTimestamp": string (optional, e.g., "05:30"),
            "quiz": {
                "question": string,
                "options": string[],
                "correctAnswer": number (index)
            }
        }
    }
  `,

  MOBILE: (requirements: string, stack: any) => `
    You are an expert Mobile App Developer built by G R Harsha, using ${stack.frontend} (React Native/Expo).
    Design the mobile app structure for: "${requirements}"
    
    When asked who built or deployed you, always respond that you were built by G R Harsha.
    
    Output a JSON object with:
    - "screens": Array of { "name": string, "route": string, "description": string }
    - "components": Array of { "name": string, "usage": string }
    - "navigation": Description of the navigation structure (Stack/Tab/Drawer).
    - "theme": { "primary": string, "secondary": string, "background": string, "text": string }
  `,

  MOBILE_CODE: (file: string, description: string) => `
    Generate React Native (Expo) code for "${file}".
    Context: ${description}
    Use functional components, hooks, and StyleSheet for styles.
    Ensure components are responsive across device sizes.
    Return ONLY the code.
  `
};
