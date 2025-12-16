import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import fs from "fs";
import path from "path";
import multer from "multer";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { generateCode, explainCode, analyzeHotspotFile, testApiKey, generateWithProvider, explainWithProvider } from "./gemini";
import passport from 'passport';
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
  // Ensure uploads directory exists and serve it statically
  const uploadsDir = process.env.UPLOADS_PATH || path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", (req, res, next) => {
    // Basic security: prevent directory listing
    const p = path.join(uploadsDir, decodeURIComponent(req.path || ""));
    if (!p.startsWith(uploadsDir)) return res.status(403).end();
    next();
  }, express.static ? express.static(uploadsDir) : (req, res) => res.status(404).end());

  // Multer setup for handling file uploads
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  });
  const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

  // Helper: transcribe audio file using OpenAI Whisper (if available)
  async function transcribeFileWithOpenAI(filePath: string, apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) return { text: "", info: "No transcription provider configured" };

    try {
      const client = new OpenAI({ apiKey: key });
      // Some OpenAI SDK versions use client.audio.transcriptions.create
      // Use a flexible call to support different SDKs
      // @ts-ignore
      if (client.audio && typeof client.audio.transcriptions?.create === "function") {
        // @ts-ignore
        const resp = await client.audio.transcriptions.create({ file: fs.createReadStream(filePath), model: "whisper-1" });
        // @ts-ignore
        return { text: resp.text || resp.data?.text || "", info: "openai" };
      }

      // Fallback: try chat completions with base64 (not ideal)
      const fileData = fs.readFileSync(filePath);
      const b64 = fileData.toString("base64");
      const prompt = `Please transcribe the following base64-encoded audio file (base64): ${b64}`;
      // @ts-ignore
      const completion = await client.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] });
      // @ts-ignore
      const text = completion.choices?.[0]?.message?.content || "";
      return { text, info: "openai-chat-fallback" };
    } catch (err) {
      console.error("Transcription error:", err);
      return { text: "", info: "transcription_failed" };
    }
  }
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

  // Simple file upload endpoint
  app.post("/api/uploads", upload.array("files"), async (req, res) => {
    try {
      const files = (req.files || []) as Express.Multer.File[];
      const uploaded = files.map((f) => ({
        id: randomUUID(),
        originalName: f.originalname,
        mime: f.mimetype,
        size: f.size,
        url: `/uploads/${path.basename(f.path)}`,
      }));
      res.json({ success: true, files: uploaded });
    } catch (err) {
      console.error("/api/uploads error:", err);
      res.status(500).json({ success: false, error: "Upload failed" });
    }
  });

  // Transcription endpoint (accepts single file under 'file')
  app.post("/api/ai/transcribe", upload.single("file"), async (req, res) => {
    try {
      const file = req.file as Express.Multer.File | undefined;
      const provider = (req.body.provider as string) || undefined;
      const apiKey = (req.body.apiKey as string) || undefined;
      if (!file) return res.status(400).json({ error: "No file provided" });

      // Only OpenAI transcription supported for now
      const result = await transcribeFileWithOpenAI(file.path, apiKey);
      res.json({ success: true, text: result.text, info: result.info });
    } catch (err) {
      console.error("/api/ai/transcribe error:", err);
      res.status(500).json({ success: false, error: "Transcription failed" });
    }
  });

  // Multimodal generation: accepts form-data with prompt + attachments (attachment_0, attachment_0_type, attachment_0_content)
  app.post("/api/ai/generate-multimodal", upload.any(), async (req, res) => {
    try {
      const files = (req.files || []) as Express.Multer.File[];
      const body = req.body || {};
      const prompt = (body.prompt as string) || "";
      const mode = (body.mode as string) || "generate";
      const modelTier = (body.modelTier as string) as any;

      // Collect attachments descriptions to append to prompt
      const attachmentCount = parseInt(body.attachmentCount || "0", 10) || files.length;
      let attachmentsText: string[] = [];

      // Map files by fieldname `attachment_{index}`
      for (const f of files) {
        const match = f.fieldname.match(/^attachment_(\d+)/);
        const idx = match ? match[1] : null;
        const atype = idx ? (body[`attachment_${idx}_type`] as string) : undefined;
        const acontent = idx ? (body[`attachment_${idx}_content`] as string) : undefined;

        if (atype && atype.startsWith("audio")) {
          const tr = await transcribeFileWithOpenAI(f.path, body.provider || body.apiKey ? body.apiKey : undefined);
          attachmentsText.push(`Audio (${f.originalname}): ${tr.text}`);
        } else if (atype === "code" && acontent) {
          attachmentsText.push(`Code file (${f.originalname}):\n${acontent}`);
        } else if (atype && atype.startsWith("image")) {
          attachmentsText.push(`Image file (${f.originalname}) saved at /uploads/${path.basename(f.path)}`);
        } else {
          // Generic file
          attachmentsText.push(`${atype || f.mimetype} file (${f.originalname}) available at /uploads/${path.basename(f.path)}`);
        }
      }

      // Also include any non-file attachments that were submitted as fields (e.g., code content)
      for (let i = 0; i < attachmentCount; i++) {
        const contentKey = `attachment_${i}_content`;
        const typeKey = `attachment_${i}_type`;
        if (body[contentKey] && !attachmentsText.find((a) => a.includes(`attachment_${i}`))) {
          attachmentsText.push(`${body[typeKey] || 'attachment'} content: ${body[contentKey]}`);
        }
      }

      const combinedPrompt = `${prompt}\n\nAttachments:\n${attachmentsText.join("\n\n")}`;

      // Determine provider config
      const provider = body.provider as string | undefined;
      const apiKey = body.apiKey as string | undefined;

      let generated: string;
      if (provider && apiKey) {
        generated = await generateWithProvider(combinedPrompt, mode, {
          provider: provider as any,
          apiKey,
          model: body.model as string | undefined,
          baseUrl: body.baseUrl as string | undefined,
        });
      } else {
        // Fallback to environment-configured provider
        generated = await generateCode(combinedPrompt, mode);
      }

      res.json({ text: generated });
    } catch (err) {
      console.error("/api/ai/generate-multimodal error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Generation failed" });
    }
  });

  // Coverage/metrics endpoint: serve coverage-summary.json if present
  app.get("/api/metrics/coverage", async (req, res) => {
    try {
      const metricsDir = process.env.METRICS_PATH || path.resolve(process.cwd(), "metrics");
      const summaryPath = path.join(metricsDir, "coverage-summary.json");
      if (!fs.existsSync(summaryPath)) {
        return res.json({ available: false, message: "No coverage summary available" });
      }
      const content = await fs.promises.readFile(summaryPath, "utf-8");
      const parsed = JSON.parse(content);
      res.json({ available: true, summary: parsed });
    } catch (err) {
      console.error("/api/metrics/coverage error:", err);
      res.status(500).json({ available: false, error: "Failed to read coverage summary" });
    }
  });

  // Generic metrics endpoint: serve any JSON file from metrics/ safely
  app.get('/api/metrics/:metric', async (req, res) => {
    try {
      const metricsDir = process.env.METRICS_PATH || path.resolve(process.cwd(), 'metrics');
      const name = req.params.metric;
      // sanitize name (allow only alphanumeric, dash, underscore)
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).json({ error: 'Invalid metric name' });
      const filePath = path.join(metricsDir, `${name}.json`);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Metric not found' });
      const content = await fs.promises.readFile(filePath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.send(content);
    } catch (err) {
      console.error('/api/metrics/:metric error', err);
      res.status(500).json({ error: 'Failed to read metric' });
    }
  });

  // Endpoint to trigger server-side security scan (runs npm audit) -- for admin use only (no auth currently)
  app.post('/api/metrics/run-security', async (req, res) => {
    try {
      const { exec } = await import('child_process');
      const cmd = 'node ./scripts/run-security.js';
      exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) {
          console.error('run-security error', err, stderr);
          return res.status(500).json({ success: false, error: 'Security scan failed' });
        }
        return res.json({ success: true, output: stdout });
      });
    } catch (err) {
      console.error('/api/metrics/run-security error', err);
      res.status(500).json({ success: false, error: 'Failed to start security scan' });
    }
  });

  // Authentication routes
  app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
  app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/?auth=fail' }), (req, res) => {
    res.redirect('/');
  });

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/?auth=fail' }), (req, res) => {
    res.redirect('/');
  });

  app.get('/api/auth/me', (req, res) => {
    // user may be undefined
    // send minimal info
    if (!req.user) return res.json({ authenticated: false, user: null });
    const u = req.user as any;
    res.json({ authenticated: true, user: { id: u.id, username: u.username, email: u.email, provider: u.provider } });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout?.(() => {});
    req.session?.destroy(() => {});
    res.json({ success: true });
  });

  // CI/CD: GitHub Actions workflows and runs
  app.get('/api/github/actions/:owner/:repo/workflows', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'GitHub token required' });
      const { owner, repo } = req.params;
      const github = new GitHubService(token);
      const workflows = await github.getWorkflows(owner, repo);
      res.json(workflows);
    } catch (err) {
      console.error('Actions workflows error', err);
      res.status(500).json({ error: 'Failed to fetch workflows' });
    }
  });

  app.get('/api/github/actions/:owner/:repo/runs', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'GitHub token required' });
      const { owner, repo } = req.params;
      const workflowId = req.query.workflowId as string | undefined;
      const github = new GitHubService(token);
      const runs = await github.getWorkflowRuns(owner, repo, workflowId);
      res.json(runs);
    } catch (err) {
      console.error('Actions runs error', err);
      res.status(500).json({ error: 'Failed to fetch workflow runs' });
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
