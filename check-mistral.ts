import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";

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

async function testMistralExplain() {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) {
        console.error("Mistral Key missing!");
        return;
    }

    const client = new Mistral({ apiKey: key });

    console.log("Testing Mistral Explanation with model: mistral-large-latest");

    try {
        const chatResponse = await client.chat.complete({
            model: "codestral-latest",
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Analyze this code:\n\nconsole.log("Hello");` }
            ],
            responseFormat: { type: "json_object" }
        });

        console.log("Response:", chatResponse.choices?.[0].message.content);
    } catch (error: any) {
        console.error("Mistral Error:", JSON.stringify(error, null, 2));
    }
}

testMistralExplain();
