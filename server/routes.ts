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
import { storage } from './storage';
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
  const multerStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  });
  const upload = multer({ storage: multerStorage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

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

  // Admin-check middleware
  function requireAdmin(req: any, res: any, next: any) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const uid = (req.user as any).id;
      // storage may be async
      storage.getUser(uid).then((u) => {
        if (!u || (u as any).role !== 'admin') return res.status(403).json({ error: 'Admin required' });
        next();
      }).catch((e) => {
        console.error('requireAdmin error', e);
        res.status(500).json({ error: 'Failed to verify admin' });
      });
    } catch (e) {
      console.error('requireAdmin exception', e);
      res.status(500).json({ error: 'Admin check failed' });
    }
  }

  // Snyk trigger (admin only)
  app.post('/api/metrics/run-snyk', requireAdmin, async (req, res) => {
    try {
      const { exec } = await import('child_process');
      const cmd = 'node ./scripts/run-snyk.js';
      exec(cmd, { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
        if (err) {
          console.error('run-snyk error', err, stderr);
          return res.status(500).json({ success: false, error: 'Snyk scan failed' });
        }
        return res.json({ success: true, output: stdout });
      });
    } catch (err) {
      console.error('/api/metrics/run-snyk error', err);
      res.status(500).json({ success: false, error: 'Failed to start Snyk scan' });
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

  // Local authentication (email/password)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, username } = req.body;
      if (!email || !password || !username) {
        return res.status(400).json({ error: 'Email, username, and password are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Create user with hashed password
      const user = await storage.createUserWithPassword({ username, email, password });
      
      // Log in the user
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to log in after registration' });
        }
        res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: 'Login failed' });
        }
        res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
      });
    })(req, res, next);
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

  // GitHub webhook receiver to persist workflow_run events (configure webhook to point here)
  app.post('/api/github/webhook', express.json(), async (req, res) => {
    try {
      const event = req.headers['x-github-event'] as string | undefined;
      if (!event) return res.status(400).json({ error: 'Missing X-GitHub-Event header' });

      if (event === 'workflow_run') {
        const payload = req.body;
        const owner = payload?.repository?.owner?.login || payload?.repository?.owner?.name;
        const repo = payload?.repository?.name;
        const run = payload?.workflow_run || payload;
        if (!owner || !repo || !run) return res.status(400).json({ error: 'Invalid payload' });
        await storage.saveWorkflowRuns(owner, repo, [run]);
        return res.json({ success: true });
      }

      // For other events, return 204
      res.status(204).end();
    } catch (err) {
      console.error('github webhook error', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Persist workflow runs (accepts { runs: [...] } or array body) — stores into DB or memory
  app.post('/api/github/actions/:owner/:repo/runs/persist', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const runs = Array.isArray(req.body) ? req.body : (req.body.runs || []);
      if (!runs || runs.length === 0) return res.status(400).json({ error: 'No runs provided' });
      await storage.saveWorkflowRuns(owner, repo, runs);
      res.json({ success: true, inserted: runs.length });
    } catch (err) {
      console.error('persist runs error', err);
      res.status(500).json({ error: 'Failed to persist runs' });
    }
  });

  // Simple auth guard for routes that require a logged-in user
  function ensureAuth(req: any, res: any, next: any) {
    if (req.user) return next();
    // Support passport's isAuthenticated if present
    if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) return next();
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Projects API for App Builder
  app.post('/api/projects', ensureAuth, express.json(), async (req, res) => {
    const user = (req as any).user || null;
    const { name, description, repoUrl, public: isPublic, metadata } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    try {
      const project = await storage.createProject(user?.id || null, name, description, repoUrl, metadata);
      if (typeof isPublic === 'boolean') await storage.updateProject(project.id, { public: isPublic });
      res.json({ project });
    } catch (err: any) {
      console.error('create project failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'create failed' });
    }
  });

  app.get('/api/projects', async (req, res) => {
    const { ownerId, publicOnly } = req.query as any;
    try {
      const projects = await storage.listProjects({ ownerId, publicOnly: publicOnly === 'true' });
      res.json({ projects });
    } catch (err: any) {
      console.error('list projects failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'list failed' });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: 'not found' });
      res.json({ project });
    } catch (err: any) {
      console.error('get project failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'get failed' });
    }
  });

  // Dev-only: seed a sample project (only when not in production)
  app.post('/api/projects/seed', async (req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Not allowed in production' });
    try {
      const demo = await (storage as any).createProject(null, 'Demo Project', 'Automatically created demo project', null, { demo: true });
      res.json({ project: demo });
    } catch (err: any) {
      console.error('seed project failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'seed failed' });
    }
  });

  app.put('/api/projects/:id', ensureAuth, express.json(), async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    try {
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: 'not found' });
      const user = (req as any).user;
      if (project.owner_id !== user?.id && !(user as any)?.isAdmin) return res.status(403).json({ error: 'forbidden' });
      const updated = await storage.updateProject(id, updates);
      res.json({ project: updated });
    } catch (err: any) {
      console.error('update project failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'update failed' });
    }
  });

  app.delete('/api/projects/:id', ensureAuth, async (req, res) => {
    const { id } = req.params;
    try {
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: 'not found' });
      const user = (req as any).user;
      if (project.owner_id !== user?.id && !(user as any)?.isAdmin) return res.status(403).json({ error: 'forbidden' });
      await storage.deleteProject(id);
      res.json({ ok: true });
    } catch (err: any) {
      console.error('delete project failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'delete failed' });
    }
  });

  // Project files endpoints
  app.get('/api/projects/:id/files', ensureAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const files = await storage.listProjectFiles(id);
      res.json({ files });
    } catch (err: any) {
      console.error('list project files failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'failed' });
    }
  });

  app.get('/api/projects/:id/files/*', ensureAuth, async (req, res) => {
    try {
      const id = req.params.id;
      // path comes after /files/
      const p = (req.params as any)[0];
      const file = await storage.getProjectFile(id, p);
      if (!file) return res.status(404).json({ error: 'not found' });
      res.json({ file });
    } catch (err: any) {
      console.error('get project file failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'failed' });
    }
  });

  app.post('/api/projects/:id/files', ensureAuth, express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { path: filePath, content, metadata } = req.body || {};
      if (!filePath) return res.status(400).json({ error: 'path required' });
      const saved = await storage.saveProjectFile(id, filePath, content || '', metadata || {});
      res.json({ file: saved });
    } catch (err: any) {
      console.error('save project file failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'failed' });
    }
  });

  app.delete('/api/projects/:id/files', ensureAuth, express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { path: filePath } = req.body || {};
      if (!filePath) return res.status(400).json({ error: 'path required' });
      const removed = await storage.deleteProjectFile(id, filePath);
      res.json({ removed });
    } catch (err: any) {
      console.error('delete project file failed', err?.message || err);
      res.status(500).json({ error: err?.message || 'failed' });
    }
  });

  app.get('/api/github/actions/:owner/:repo/runs/persisted', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const limit = parseInt(req.query.limit as any) || 50;
      const runs = await storage.getWorkflowRuns(owner, repo, limit);
      res.json({ runs });
    } catch (err) {
      console.error('get persisted runs error', err);
      res.status(500).json({ error: 'Failed to load persisted runs' });
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

  // Notifications: create and list
  app.post('/api/notifications', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const { type, payload, userId } = req.body;
      if (!type) return res.status(400).json({ error: 'type is required' });
      const uid = userId || (req.user as any).id;
      const note = await storage.createNotification(uid, type, payload || {});
      res.json(note);
    } catch (err) {
      console.error('create notification error', err);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  app.get('/api/notifications', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const uid = (req.user as any).id;
      const notes = await storage.getNotificationsForUser(uid);
      res.json(notes);
    } catch (err) {
      console.error('list notifications error', err);
      res.status(500).json({ error: 'Failed to list notifications' });
    }
  });

  // Analyze a failed CI run using AI: returns a short analysis (requires login)
  app.post('/api/ci/analyze-failure', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const run = req.body.run || req.body;
      if (!run) return res.status(400).json({ error: 'run object required' });

      const prompt = `You are an expert CI engineer. Analyze this failed workflow run and provide a concise summary of likely causes and recommended next steps.\n\nRun JSON:\n${JSON.stringify(run, null, 2)}`;

      let analysis = 'AI provider not configured';
      try {
        if (process.env.OPENAI_API_KEY) {
          analysis = await generateWithProvider(prompt, 'generate', { provider: 'openai', apiKey: process.env.OPENAI_API_KEY });
        } else {
          analysis = 'No AI key configured (OPENAI_API_KEY)';
        }
      } catch (e) {
        console.error('analyze-failure AI error', e);
        analysis = 'AI analysis failed';
      }

      res.json({ analysis });
    } catch (err) {
      console.error('ci analyze error', err);
      res.status(500).json({ error: 'Failed to analyze run' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
