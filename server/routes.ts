import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateCode, explainCode, analyzeHotspotFile } from "./gemini";
import { GitHubService } from "./github";

export async function registerRoutes(app: Express): Promise<Server> {
  // AI Code Generation
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const schema = z.object({
        prompt: z.string().min(1),
        mode: z.enum(["generate", "test", "document", "refactor", "boilerplate"]),
        model: z.enum(["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"]).optional(),
      });

      const { prompt, mode, model } = schema.parse(req.body);

      const text = await generateCode(prompt, mode, model);

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
      });

      const { code } = schema.parse(req.body);

      const explanations = await explainCode(code);

      res.json({ explanations });
    } catch (error) {
      console.error("Explain error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to explain code",
      });
    }
  });

  // Get GitHub Repositories
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

  // Get Dashboard Summary
  app.get("/api/github/summary/:owner/:repo", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "GitHub token required" });
      }

      const { owner, repo } = req.params;
      const github = new GitHubService(token);

      const [commitActivity, prStatus, openIssues, hotspots] = await Promise.all([
        github.getCommitActivity(owner, repo, 7),
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

  const httpServer = createServer(app);

  return httpServer;
}
