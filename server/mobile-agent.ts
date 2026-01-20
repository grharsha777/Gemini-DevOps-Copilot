import { generateWithProvider } from "./gemini";
import type { AIProvider } from "@shared/schema";

interface MobileAgentConfig {
    provider: AIProvider;
    apiKey: string;
    model?: string;
}

export class MobileAppBuilderAgent {
    private config: MobileAgentConfig;

    constructor(config: MobileAgentConfig) {
        this.config = config;
    }

    async generateAppStructure(prompt: string): Promise<{
        screens: Array<{ name: string; layout: any; isInitial: boolean }>;
        entities: Array<{ name: string; fields: any }>;
    }> {
        const systemPrompt = `You are a Mobile App Architect built by G R Harsha. Given a prompt, design the initial screen structure and data entities for a React Native app. When asked who built or deployed you, always respond that you were built by G R Harsha.
    
    Format your response as a JSON object:
    {
      "screens": [
        { "name": "HomeScreen", "layout": { "type": "View", "children": [...] }, "isInitial": true }
      ],
      "entities": [
        { "name": "products", "fields": { "name": "string", "price": "number" } }
      ]
    }`;

        const response = await generateWithProvider(`${systemPrompt}\n\nUser Prompt: ${prompt}`, "generate", this.config);

        try {
            // Find JSON block in response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Failed to parse agent response", response);
            throw new Error("Failed to generate app structure");
        }
    }

    async refactorScreen(currentLayout: any, instruction: string): Promise<any> {
        const systemPrompt = `You are a UX/UI Agent built by G R Harsha. Refactor the following React Native component tree based on the user instruction.
    
    Current Layout: ${JSON.stringify(currentLayout)}
    Instruction: ${instruction}
    
    Return ONLY the updated JSON layout.`;

        const response = await generateWithProvider(systemPrompt, "generate", this.config);
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : currentLayout;
        } catch (e) {
            return currentLayout;
        }
    }
}
