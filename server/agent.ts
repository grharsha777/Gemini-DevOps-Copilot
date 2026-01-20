import { z } from "zod";
import { generateWithProvider, explainWithProvider } from "./gemini";
import { GitHubService } from "./github";
import { GitLabService } from "./gitlab";
import { BitbucketService } from "./bitbucket";
import type { AIProvider, GitProvider } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";

interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface AgentContext {
  projectId?: string;
  repository?: {
    provider: GitProvider;
    owner: string;
    repo: string;
  };
  task: string;
  action: "enhance" | "debug" | "explain" | "develop" | "custom";
  customAction?: string;
}

// Multi-LLM Agent System
export class AgentSystem {
  private fastConfig: ProviderConfig | null;
  private proConfig: ProviderConfig | null;

  constructor(fastConfig: ProviderConfig | null, proConfig: ProviderConfig | null) {
    this.fastConfig = fastConfig;
    this.proConfig = proConfig;
  }

  // Use Pro model for high-level planning and complex reasoning
  private async planWithPro(prompt: string): Promise<string> {
    if (!this.proConfig) {
      throw new Error("Pro model not configured. Please set up a Pro API key in Settings.");
    }
    return generateWithProvider(prompt, "generate", this.proConfig);
  }

  // Use Fast model for quick iterations and basic tasks
  private async executeWithFast(prompt: string): Promise<string> {
    if (!this.fastConfig) {
      // Fallback to pro if fast not available
      if (this.proConfig) {
        return generateWithProvider(prompt, "generate", this.proConfig);
      }
      throw new Error("No AI model configured. Please set up API keys in Settings.");
    }
    return generateWithProvider(prompt, "generate", this.fastConfig);
  }

  // Import repository from Git provider
  async importRepository(
    url: string,
    provider: GitProvider,
    token: string,
    options?: { instanceUrl?: string; username?: string; appPassword?: string }
  ): Promise<{ owner: string; repo: string; files: any[] }> {
    // Parse URL to get owner/repo
    const urlMatch = url.match(/(?:github\.com|gitlab\.com|bitbucket\.org)\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      // Try parsing as owner/repo format
      const parts = url.split("/");
      if (parts.length === 2) {
        return { owner: parts[0], repo: parts[1].replace(".git", ""), files: [] };
      }
      throw new Error("Invalid repository URL format");
    }

    const owner = urlMatch[1];
    const repo = urlMatch[2].replace(".git", "");

    // Get repository files (simplified - in production, you'd clone the repo)
    // For now, return basic info
    return { owner, repo, files: [] };
  }

  // Run agent task with multi-LLM approach
  async runTask(context: AgentContext, storage?: any): Promise<{
    summary: string;
    code?: string;
    zipUrl?: string;
    steps: string[];
  }> {
    const steps: string[] = [];
    let result: any = {};
    let projectContext = "";

    try {
      // Step 0: Fetch project context if projectId is provided
      if (context.projectId && storage) {
        steps.push("Fetching project context...");
        try {
          const files = await storage.listProjectFiles(context.projectId);
          if (files && files.length > 0) {
            projectContext = "Project Structure:\n";
            for (const file of files) {
              projectContext += `- ${file.path}\n`;
            }
            // Fetch content of top 5 files for better context
            const topFiles = files.slice(0, 5);
            projectContext += "\nFile Contents (Snippets):\n";
            for (const file of topFiles) {
              const fullFile = await storage.getProjectFile(context.projectId, file.path);
              if (fullFile && fullFile.content) {
                projectContext += `\n--- ${file.path} ---\n${fullFile.content.substring(0, 1000)}\n`;
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch project context:", err);
          steps.push("Warning: Project context retrieval failed.");
        }
      }

      // Step 1: High-level planning with Pro model
      steps.push("Planning with Pro model...");
      const planningPrompt = this.buildPlanningPrompt(context, projectContext);
      const plan = await this.planWithPro(planningPrompt);
      steps.push(`Plan created.`);

      // Step 2: Execute based on action type
      if (context.action === "develop") {
        steps.push("Developing application...");
        result = await this.developApp(context, plan);
      } else if (context.action === "enhance" && (context.repository || context.projectId)) {
        steps.push("Enhancing repository...");
        result = await this.enhanceRepository(context, plan, projectContext);
      } else if (context.action === "debug" && (context.repository || context.projectId)) {
        steps.push("Debugging repository...");
        result = await this.debugRepository(context, plan, projectContext);
      } else if (context.action === "explain" && (context.repository || context.projectId)) {
        steps.push("Explaining codebase...");
        result = await this.explainRepository(context, plan, projectContext);
      } else if (context.action === "custom") {
        steps.push("Executing custom action...");
        result = await this.executeCustomAction(context, plan, projectContext);
      }

      return {
        summary: result.summary || "Task completed successfully",
        code: result.code,
        zipUrl: result.zipUrl,
        steps,
      };
    } catch (error) {
      throw new Error(`Agent task failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private buildPlanningPrompt(context: AgentContext, projectContext: string = ""): string {
    const basePrompt = `You are an expert software engineer and DevOps specialist built by G R Harsha.
Analyze the following task and create a detailed step-by-step plan.

Task: ${context.task}
Action: ${context.action}
${context.customAction ? `Custom Action: ${context.customAction}` : ""}
${context.repository ? `Repository: ${context.repository.owner}/${context.repository.repo} (${context.repository.provider})` : ""}
${context.projectId ? `Local Project ID: ${context.projectId}` : ""}

${projectContext ? `PROJECT CONTEXT (Files & Structure):\n${projectContext}` : ""}

Create a comprehensive plan that includes:
1. Understanding the requirements
2. Technical approach
3. Implementation steps
4. Testing strategy
5. Deployment considerations

Be specific and actionable.`;

    return basePrompt;
  }

  private async developApp(context: AgentContext, plan: string): Promise<any> {
    const developmentPrompt = `Based on this plan:
${plan}

Task: ${context.task}

Generate a complete, production-ready application. Include:
1. Project structure
2. All necessary files (package.json, README.md, source files, configs)
3. Dependencies
4. Setup instructions
5. Best practices

Format the response as a structured application with file paths and contents.`;

    const code = await this.executeWithFast(developmentPrompt);

    // Generate ZIP file
    const zipUrl = await this.createZipFromCode(code, context.task);

    return {
      summary: `Application "${context.task}" has been developed and packaged.`,
      code,
      zipUrl,
    };
  }

  private async enhanceRepository(context: AgentContext, plan: string, projectContext: string = ""): Promise<any> {
    if (!context.repository && !context.projectId) throw new Error("Repository or Project ID required for enhancement");

    const enhancePrompt = `Based on this plan:
${plan}

${projectContext ? `Current Project Context:\n${projectContext}` : ""}

Task: ${context.task}

Analyze the codebase and provide:
1. Enhancement recommendations
2. Code improvements
3. Performance optimizations
4. Security improvements
5. Updated code files with improvements

Provide specific code changes and improvements.`;

    const improvements = await this.executeWithFast(enhancePrompt);

    return {
      summary: `Repository ${context.repository?.owner}/${context.repository?.repo || context.projectId} has been analyzed and enhanced.`,
      code: improvements,
    };
  }

  private async debugRepository(context: AgentContext, plan: string, projectContext: string = ""): Promise<any> {
    if (!context.repository && !context.projectId) throw new Error("Repository or Project ID required for debugging");

    const debugPrompt = `Based on this plan:
${plan}

${projectContext ? `Current Project Context:\n${projectContext}` : ""}

Task: ${context.task}

Debug the codebase and provide:
1. Identified issues
2. Root cause analysis
3. Fixes for each issue
4. Updated code with fixes
5. Testing recommendations

Provide specific fixes and explanations.`;

    const fixes = await this.executeWithFast(debugPrompt);

    return {
      summary: `Repository ${context.repository?.owner}/${context.repository?.repo || context.projectId} has been debugged and fixed.`,
      code: fixes,
    };
  }

  private async explainRepository(context: AgentContext, plan: string, projectContext: string = ""): Promise<any> {
    if (!context.repository && !context.projectId) throw new Error("Repository or Project ID required for explanation");

    const explainPrompt = `Based on this plan:
${plan}

${projectContext ? `Current Project Context:\n${projectContext}` : ""}

Task: ${context.task}

Explain the codebase:
1. Architecture overview
2. Key components
3. Data flow
4. Technologies used
5. How it works
6. Code structure

Provide a comprehensive explanation.`;

    const explanation = await this.executeWithFast(explainPrompt);

    return {
      summary: `Repository ${context.repository?.owner}/${context.repository?.repo || context.projectId} has been explained.`,
      code: explanation,
    };
  }

  private async executeCustomAction(context: AgentContext, plan: string, projectContext: string = ""): Promise<any> {
    const customPrompt = `Based on this plan:
${plan}

${projectContext ? `Current Project Context:\n${projectContext}` : ""}

Task: ${context.task}
Custom Action: ${context.customAction}
${context.repository ? `Repository: ${context.repository.owner}/${context.repository.repo}` : ""}

Execute the custom action and provide detailed results.`;

    const result = await this.executeWithFast(customPrompt);

    return {
      summary: `Custom action "${context.customAction}" has been executed.`,
      code: result,
    };
  }

  // Create ZIP file from generated code
  private async createZipFromCode(code: string, taskName: string): Promise<string> {
    // This is a simplified version - in production, you'd parse the code
    // and create actual file structure
    const tempDir = path.join(process.cwd(), "temp", `app-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Create basic app structure
    const appName = taskName.toLowerCase().replace(/\s+/g, "-").substring(0, 30);
    const packageJson = {
      name: appName,
      version: "1.0.0",
      description: `Generated app: ${taskName}`,
      main: "index.js",
      scripts: {
        start: "node index.js",
        dev: "node index.js",
      },
      dependencies: {},
    };

    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    fs.writeFileSync(
      path.join(tempDir, "README.md"),
      `# ${taskName}\n\nThis application was generated by CodeVortexAI Agent.\n\n${code.substring(0, 500)}`
    );

    fs.writeFileSync(
      path.join(tempDir, "index.js"),
      `// Generated by CodeVortexAI Agent\n// ${taskName}\n\n${code}`
    );

    // Create ZIP
    const zipPath = path.join(process.cwd(), "temp", `${appName}-${Date.now()}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on("close", () => {
        const publicPath = `/temp/${path.basename(zipPath)}`;
        resolve(publicPath);
      });

      archive.on("error", reject);
      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });
  }
}

