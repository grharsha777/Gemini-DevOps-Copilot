import { AIProvider } from "@shared/schema";
import { ModelOrchestrator } from "./orchestrator";

export interface CodingQuestion {
    id: string;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    platform: "LeetCode" | "GeeksforGeeks" | "CodeVortex";
    tags: string[];
    description: string;
    constraints: string[];
    examples: Array<{ input: string; output: string; explanation?: string }>;
}

export class CodingQuestionsService {
    /**
     * Search for coding questions using AI to find relevant ones from common patterns
     * or simulating fetch from known platforms.
     */
    async searchQuestions(query: string): Promise<CodingQuestion[]> {
        try {
            // For real-time feel, we use AI to find/generate patterns of real questions
            // or we could use external APIs if available.
            const prompt = `Find or generate 3 representative coding questions related to "${query}" from platforms like LeetCode or GeeksforGeeks. Return a JSON array of questions.
      
      JSON Structure:
      [{
        id: string,
        title: string,
        difficulty: "Easy" | "Medium" | "Hard",
        platform: "LeetCode" | "GeeksforGeeks" | "CodeVortex",
        tags: string[],
        description: string,
        constraints: string[],
        examples: [{ input: string, output: string, explanation: string }]
      }]`;

            const result = await ModelOrchestrator.generate({
                prompt,
                mode: "generate"
            });

            const text = result.text.trim();
            const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/```json\n?|```/g, '').trim();

            try {
                const questions = JSON.parse(jsonStr);
                return questions;
            } catch (e) {
                console.error("Failed to parse questions JSON:", e, text);
                // Try manual cleanup of common AI issues
                const cleaned = text
                    .replace(/```json\n?|```/g, '')
                    .replace(/[\u201C\u201D]/g, '"') // Smart quotes
                    .trim();
                return JSON.parse(cleaned);
            }
        } catch (error) {
            console.error("Error searching coding questions:", error);
            // Fallback to empty list or static set
            return [];
        }
    }

    /**
     * Get curated DSA lists
     */
    async getCuratedList(category: string): Promise<CodingQuestion[]> {
        // Mocking curated lists
        return this.searchQuestions(`${category} top questions`);
    }
}
