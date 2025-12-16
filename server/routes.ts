import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateCode, explainCode, analyzeHotspotFile, testApiKey, generateWithProvider, explainWithProvider } from "./gemini";
import { GitHubService } from "./github";
import { GitLabService } from "./gitlab";
import { BitbucketService } from "./bitbucket";
import { AgentSystem } from "./agent";
import type { AIProvider, GitProvider } from "@shared/schema";

// Helper function to get the appropriate Git service
function getGitService(
  provider: GitProvider,
  token: string,
  options?: {
    instanceUrl?: string;
  }
): GitHubService | GitLabService {
  switch (provider) {
    case "github":
      return new GitHubService(token);
    case "gitlab":
      return new GitLabService(token, options?.instanceUrl || "https://gitlab.com");
    default:
      throw new Error(`Unsupported git provider: ${provider}`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Test API Key endpoint
  app.post("/api/ai/test-key", async (req, res) => {
    try {
      const schema = z.object({
        provider: z.string(),
        apiKey: z.string().min(1),
        model: z.string().optional(),
        baseUrl: z.string().optional(),
      });

      const { provider, apiKey, model, baseUrl } = schema.parse(req.body);

      console.log(`[API Test] Testing ${provider} API key (length: ${apiKey.length}, model: ${model || "default"})`);

      const result = await testApiKey({
        provider: provider as AIProvider,
        apiKey: apiKey.trim(), // Trim whitespace
        model: model?.trim() || undefined,
        baseUrl: baseUrl?.trim() || undefined,
      });

      if (result.success) {
        res.json({ success: true, message: "API key is valid and working!" });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error || "API key validation failed. Please check your API key and try again." 
        });
      }
    } catch (error) {
      console.error("Test key error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to test API key. Please check your connection and try again.";
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // AI Code Generation
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const schema = z.object({
        prompt: z.string().min(1),
        mode: z.enum(["generate", "test", "document", "refactor", "boilerplate"]),
        modelTier: z.enum(["fast", "pro"]).optional(),
        // User-provided API configuration
        provider: z.string().optional(),
        apiKey: z.string().optional(),
        model: z.string().optional(),
        baseUrl: z.string().optional(),
      });

      const { prompt, mode, modelTier, provider, apiKey, model, baseUrl } = schema.parse(req.body);

      let text: string;

      // Use user-provided API key if available
      if (provider && apiKey) {
        text = await generateWithProvider(prompt, mode, {
          provider: provider as AIProvider,
          apiKey,
          model,
          baseUrl,
        });
      } else {
        // Fallback to environment variables
        text = await generateCode(prompt, mode, model);
      }

      res.json({ text });
    } catch (error) {
      console.error("Generate error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to generate code",
      });
    }
  });

  // AI Code Explanation
  app.post("/api/ai/explain", async (req, res) => {
    try {
      const schema = z.object({
        code: z.string().min(1),
        // User-provided API configuration
        provider: z.string().optional(),
        apiKey: z.string().optional(),
        model: z.string().optional(),
        baseUrl: z.string().optional(),
      });

      const { code, provider, apiKey, model, baseUrl } = schema.parse(req.body);

      let explanations;

      // Use user-provided API key if available
      if (provider && apiKey) {
        explanations = await explainWithProvider(code, {
          provider: provider as AIProvider,
          apiKey,
          model,
          baseUrl,
        });
      } else {
        // Fallback to environment variables
        explanations = await explainCode(code);
      }

      res.json({ explanations });
    } catch (error) {
      console.error("Explain error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to explain code",
      });
    }
  });

  // Get Repositories (supports GitHub, GitLab, Bitbucket)
  app.get("/api/git/repos", async (req, res) => {
    try {
      const provider = (req.query.provider as GitProvider) || "github";
      const token = req.headers.authorization?.replace("Bearer ", "");
      
      if (!token) {
        return res.status(401).json({ error: "Git provider token required" });
      }

      let repos;
      
      switch (provider) {
        case "github": {
          const github = new GitHubService(token);
          repos = await github.getRepositories();
          break;
        }
        case "gitlab": {
          const instanceUrl = req.query.instanceUrl as string || "https://gitlab.com";
          const gitlab = new GitLabService(token, instanceUrl);
          repos = await gitlab.getRepositories();
          break;
        }
        case "bitbucket": {
          const username = req.query.username as string;
          const appPassword = req.query.appPassword as string;
          if (!username || !appPassword) {
            return res.status(400).json({ error: "Bitbucket requires username and app password" });
          }
          // For Bitbucket, token is the username
          const bitbucket = new BitbucketService(username, appPassword);
          repos = await bitbucket.getRepositories();
          break;
        }
        default:
          return res.status(400).json({ error: "Unsupported git provider" });
      }

      res.json(repos);
    } catch (error) {
      console.error("Repos error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch repositories",
      });
    }
  });

  // Legacy GitHub endpoint for backward compatibility
  app.get("/api/github/repos", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "GitHub token required" });
      }

      const github = new GitHubService(token);
      const repos = await github.getRepositories();

      res.json(repos);
    } catch (error) {
      console.error("Repos error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch repositories",
      });
    }
  });

  // Get Dashboard Summary (supports all Git providers)
  app.get("/api/git/summary/:owner/:repo", async (req, res) => {
    try {
      const provider = (req.query.provider as GitProvider) || "github";
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "Git provider token required" });
      }

      const { owner, repo } = req.params;
      let service: GitHubService | GitLabService | BitbucketService;
      if (provider === "bitbucket") {
        const username = req.query.username as string;
        const appPassword = req.query.appPassword as string;
        if (!username || !appPassword) {
          return res.status(400).json({ error: "Bitbucket requires username and app password" });
        }
        service = new BitbucketService(username, appPassword);
      } else {
        service = getGitService(provider, token, {
          instanceUrl: req.query.instanceUrl as string,
        });
      }

      const days = parseInt(req.query.days as string) || 7;
      const [commitActivity, prStatus, openIssues, hotspots] = await Promise.all([
        service.getCommitActivity(owner, repo, days),
        service.getPRStatus(owner, repo),
        service.getOpenIssues(owner, repo),
        service.getHotspotFiles(owner, repo),
      ]);

      const totalCommits = commitActivity.reduce((sum, day) => sum + day.count, 0);

      res.json({
        totalCommits,
        prStatus,
        openIssues,
        hotspotCount: hotspots.length,
      });
    } catch (error) {
      console.error("Summary error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch summary",
      });
    }
  });

  // Legacy GitHub endpoint for backward compatibility
  app.get("/api/github/summary/:owner/:repo", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "GitHub token required" });
      }

      const { owner, repo } = req.params;
      const days = parseInt(req.query.days as string) || 7;
      const github = new GitHubService(token);

      const [commitActivity, prStatus, openIssues, hotspots] = await Promise.all([
        github.getCommitActivity(owner, repo, days),
        github.getPRStatus(owner, repo),
        github.getOpenIssues(owner, repo),
        github.getHotspotFiles(owner, repo),
      ]);

      const totalCommits = commitActivity.reduce((sum, day) => sum + day.count, 0);

      res.json({
        totalCommits,
        prStatus,
        openIssues,
        hotspotCount: hotspots.length,
      });
    } catch (error) {
      console.error("Summary error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch summary",
      });
    }
  });

  // Get Commit Activity
  app.get("/api/github/commits/:owner/:repo", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "GitHub token required" });
      }

      const { owner, repo } = req.params;
      const github = new GitHubService(token);

      const activity = await github.getCommitActivity(owner, repo, 7);

      res.json(activity);
    } catch (error) {
      console.error("Commits error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch commit activity",
      });
    }
  });

  // Get Contributors
  app.get("/api/github/contributors/:owner/:repo", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "GitHub token required" });
      }

      const { owner, repo } = req.params;
      const github = new GitHubService(token);

      const contributors = await github.getContributors(owner, repo);

      res.json(contributors);
    } catch (error) {
      console.error("Contributors error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch contributors",
      });
    }
  });

  // Get Hotspot Files
  app.get("/api/github/hotspots/:owner/:repo", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "GitHub token required" });
      }

      const { owner, repo } = req.params;
      const github = new GitHubService(token);

      const hotspots = await github.getHotspotFiles(owner, repo);

      // Add AI analysis to top 3 hotspots
      const hotspotsWithAnalysis = await Promise.all(
        hotspots.slice(0, 3).map(async (file) => {
          const analysis = await analyzeHotspotFile(file.path, file.commitCount);
          return { ...file, analysis };
        })
      );

      // Remaining hotspots without analysis
      const remainingHotspots = hotspots.slice(3);

      res.json([...hotspotsWithAnalysis, ...remainingHotspots]);
    } catch (error) {
      console.error("Hotspots error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch hotspots",
      });
    }
  });

  // Agent Mode Routes
  app.post("/api/agent/import-repo", async (req, res) => {
    try {
      const schema = z.object({
        url: z.string().url().or(z.string()),
        provider: z.enum(["github", "gitlab", "bitbucket"]),
      });

      const { url, provider } = schema.parse(req.body);

      // Get token from headers or localStorage (passed from frontend)
      const token = req.headers.authorization?.replace("Bearer ", "") || "";
      
      if (!token && provider !== "github") {
        return res.status(401).json({ error: `${provider} token required` });
      }

      // Parse owner/repo from URL
      const urlMatch = url.match(/(?:github\.com|gitlab\.com|bitbucket\.org)\/([^\/]+)\/([^\/]+)/);
      if (!urlMatch) {
        // Try parsing as owner/repo format
        const parts = url.split("/");
        if (parts.length === 2) {
          return res.json({
            owner: parts[0],
            repo: parts[1].replace(".git", ""),
          });
        }
        return res.status(400).json({ error: "Invalid repository URL format" });
      }

      const owner = urlMatch[1];
      const repo = urlMatch[2].replace(".git", "");

      res.json({ owner, repo });
    } catch (error) {
      console.error("Import repo error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to import repository",
      });
    }
  });

  app.post("/api/agent/run", async (req, res) => {
    try {
      const schema = z.object({
        task: z.string().min(1),
        action: z.enum(["enhance", "debug", "explain", "develop", "custom"]),
        customAction: z.string().optional(),
        repository: z.object({
          provider: z.enum(["github", "gitlab", "bitbucket"]),
          owner: z.string(),
          repo: z.string(),
        }).optional(),
        fastConfig: z.object({
          provider: z.string(),
          apiKey: z.string(),
          model: z.string().optional(),
          baseUrl: z.string().optional(),
        }).nullable(),
        proConfig: z.object({
          provider: z.string(),
          apiKey: z.string(),
          model: z.string().optional(),
          baseUrl: z.string().optional(),
        }).nullable(),
      });

      const data = schema.parse(req.body);

      const fastConfig = data.fastConfig ? {
        provider: data.fastConfig.provider as AIProvider,
        apiKey: data.fastConfig.apiKey,
        model: data.fastConfig.model,
        baseUrl: data.fastConfig.baseUrl,
      } : null;

      const proConfig = data.proConfig ? {
        provider: data.proConfig.provider as AIProvider,
        apiKey: data.proConfig.apiKey,
        model: data.proConfig.model,
        baseUrl: data.proConfig.baseUrl,
      } : null;

      const agent = new AgentSystem(fastConfig, proConfig);
      const result = await agent.runTask({
        task: data.task,
        action: data.action,
        customAction: data.customAction,
        repository: data.repository,
      });

      res.json(result);
    } catch (error) {
      console.error("Agent run error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to run agent task",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
