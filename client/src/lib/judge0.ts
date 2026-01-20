
export const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
    javascript: 63,
    typescript: 74,
    python: 71,
    java: 62,
    c: 50,
    cpp: 54,
    csharp: 51,
    go: 60,
    rust: 73,
    php: 68,
    ruby: 72,
    swift: 83,
    kotlin: 78,
    scala: 81,
    sql: 82,
};

export interface ExecutionResult {
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    message: string | null;
    status: {
        id: number;
        description: string;
    };
    time: string;
    memory: number;
}

export class Judge0Service {
    private static getApiKey(): string | null {
        return localStorage.getItem('judge0Key') || null;
    }

    static async executeCode(code: string, language: string, stdin: string = ""): Promise<ExecutionResult> {
        const apiKey = this.getApiKey();
        const languageId = JUDGE0_LANGUAGE_IDS[language.toLowerCase()];

        if (!languageId) {
            throw new Error(`Language ${language} not supported by Judge0`);
        }

        // Use RapidAPI or self-hosted instance. Defaulting to rapidapi for this example as it's common.
        // If the user provided a self-hosted URL, we should use that. 
        // For now, assuming RapidAPI or public instance if key is present.
        
        const url = "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true";
        
        const headers: Record<string, string> = {
            'content-type': 'application/json',
            'Content-Type': 'application/json',
        };

        if (apiKey) {
             headers['X-RapidAPI-Key'] = apiKey;
             headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
        } else {
            // Fallback to a free instance or mock if allowed, but better to throw or warn
            // Using Piston as a fallback if Judge0 key is missing is also an option mentioned by user.
            // For now, let's try Piston public API if Judge0 key is missing.
            return this.executeWithPiston(code, language);
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    source_code: btoa(code),
                    language_id: languageId,
                    stdin: btoa(stdin)
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Judge0 execution failed");
            }

            const data = await response.json();
            
            return {
                stdout: data.stdout ? atob(data.stdout) : null,
                stderr: data.stderr ? atob(data.stderr) : null,
                compile_output: data.compile_output ? atob(data.compile_output) : null,
                message: data.message ? atob(data.message) : null,
                status: data.status,
                time: data.time,
                memory: data.memory
            };

        } catch (error) {
            console.error("Judge0 Error:", error);
            throw error;
        }
    }

    private static async executeWithPiston(code: string, language: string): Promise<ExecutionResult> {
        // Piston public API (https://emkc.org/api/v2/piston)
        // No key required
        const pistonLangMap: Record<string, string> = {
            javascript: 'javascript',
            typescript: 'typescript',
            python: 'python',
            java: 'java',
            c: 'c',
            cpp: 'c++',
            go: 'go',
            rust: 'rust',
            php: 'php',
            ruby: 'ruby',
        };

        const lang = pistonLangMap[language.toLowerCase()];
        if (!lang) throw new Error("Language not supported by Piston fallback");

        try {
             const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: lang,
                    version: '*',
                    files: [{ content: code }]
                })
            });

            const data = await response.json();
            
            if (data.run) {
                return {
                    stdout: data.run.stdout,
                    stderr: data.run.stderr,
                    compile_output: data.compile ? data.compile.output : null,
                    message: data.message,
                    status: { id: data.run.code === 0 ? 3 : 6, description: data.run.code === 0 ? 'Accepted' : 'Error' },
                    time: "0",
                    memory: 0
                };
            }
            throw new Error("Piston execution failed");

        } catch (error) {
             console.error("Piston Error:", error);
             throw new Error("Execution failed (Judge0 & Piston)");
        }
    }
}
