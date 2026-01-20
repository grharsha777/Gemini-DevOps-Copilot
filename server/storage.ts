import { randomUUID } from "crypto";
import { pool } from "./db/client";

// User type definitions (if not in schema)
export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface InsertUser {
  username: string;
  email?: string;
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Persist workflow runs fetched from CI providers
  saveWorkflowRuns(owner: string, repo: string, runs: any[]): Promise<void>;
  getWorkflowRuns(owner: string, repo: string, limit?: number): Promise<any[]>;
  // Notifications
  createNotification(userId: string | null, type: string, payload: any): Promise<any>;
  getNotificationsForUser(userId: string): Promise<any[]>;
  // Project files
  saveProjectFile(projectId: string, path: string, content: string, metadata?: any): Promise<any>;
  listProjectFiles(projectId: string): Promise<any[]>;
  getProjectFile(projectId: string, path: string): Promise<any | null>;
  deleteProjectFile(projectId: string, path: string): Promise<any | null>;
  // Projects CRUD
  createProject(ownerId: string | null, name: string, description?: string, repoUrl?: string, metadata?: any): Promise<any>;
  listProjects(options?: { ownerId?: string, publicOnly?: boolean }): Promise<any[]>;
  getProject(projectId: string): Promise<any | null>;
  updateProject(projectId: string, updates: any): Promise<any | null>;
  deleteProject(projectId: string): Promise<any | null>;
  // Mobile App Builder
  createMobileProject(project: any): Promise<any>;
  getMobileProject(id: string): Promise<any | null>;
  listMobileProjects(userId: string): Promise<any[]>;
  updateMobileProject(id: string, updates: any): Promise<any | null>;
  saveAppScreen(screen: any): Promise<any>;
  listAppScreens(projectId: string): Promise<any[]>;
  createBuild(build: any): Promise<any>;
  getBuildHistory(projectId: string): Promise<any[]>;
  // Leaderboard
  getLeaderboard(): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private workflowRuns: Array<any>;
  private notifications: Array<any>;

  constructor() {
    this.users = new Map();
    this.workflowRuns = [];
    this.notifications = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveWorkflowRuns(owner: string, repo: string, runs: any[]): Promise<void> {
    for (const r of runs) {
      this.workflowRuns.push({ owner, repo, run: r, inserted_at: new Date().toISOString() });
    }
  }

  async getWorkflowRuns(owner: string, repo: string, limit = 50): Promise<any[]> {
    return this.workflowRuns
      .filter((r) => r.owner === owner && r.repo === repo)
      .slice(-limit)
      .map((r) => r.run);
  }

  async createNotification(userId: string | null, type: string, payload: any): Promise<any> {
    const id = randomUUID();
    const note = { id, user_id: userId, type, payload, read: false, created_at: new Date().toISOString() };
    this.notifications.push(note);
    return note;
  }

  async getNotificationsForUser(userId: string): Promise<any[]> {
    return this.notifications.filter((n) => n.user_id === userId || n.user_id === null);
  }

  async getLeaderboard(): Promise<any[]> {
    return [
      { rank: 1, name: "Harsha G R", username: "grharsha777", avatar: "https://github.com/grharsha777.png", commits: 450, prs: 85, stars: 120, score: 980, trend: "up" },
      { rank: 2, name: "Alex Chen", username: "alexc", avatar: "https://i.pravatar.cc/150?u=alex", commits: 380, prs: 62, stars: 95, score: 850, trend: "up" },
      { rank: 3, name: "Sarah Miller", username: "sarahm", avatar: "https://i.pravatar.cc/150?u=sarah", commits: 310, prs: 55, stars: 110, score: 820, trend: "stable" },
      { rank: 4, name: "James Wilson", username: "jwils", avatar: "https://i.pravatar.cc/150?u=james", commits: 290, prs: 48, stars: 65, score: 710, trend: "down" },
      { rank: 5, name: "Elena Petrova", username: "elenap", avatar: "https://i.pravatar.cc/150?u=elena", commits: 240, prs: 42, stars: 88, score: 680, trend: "up" },
    ];
  }

  // Projects CRUD for App Builder (in-memory)
  async createProject(ownerId: string | null, name: string, description?: string, repoUrl?: string, metadata?: any) {
    const id = randomUUID();
    const project = { id, owner_id: ownerId, name, description, public: true, repo_url: repoUrl || null, metadata: metadata || {}, created_at: new Date().toISOString() };
    // store in notifications array for simplicity (or add a dedicated array)
    if (!(this as any)._projects) (this as any)._projects = [];
    (this as any)._projects.unshift(project);
    return project;
  }

  async listProjects({ ownerId, publicOnly }: { ownerId?: string, publicOnly?: boolean } = {}) {
    const projects = (this as any)._projects || [];
    return projects.filter((p: any) => {
      if (ownerId && p.owner_id !== ownerId) return false;
      if (publicOnly && !p.public) return false;
      return true;
    });
  }

  async getProject(projectId: string) {
    const projects = (this as any)._projects || [];
    return projects.find((p: any) => p.id === projectId);
  }

  async updateProject(projectId: string, updates: any) {
    const projects = (this as any)._projects || [];
    const idx = projects.findIndex((p: any) => p.id === projectId);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...updates };
    return projects[idx];
  }

  async deleteProject(projectId: string) {
    const projects = (this as any)._projects || [];
    const idx = projects.findIndex((p: any) => p.id === projectId);
    if (idx === -1) return null;
    const [removed] = projects.splice(idx, 1);
    return removed;
  }

  // Project files CRUD (in-memory)
  async saveProjectFile(projectId: string, path: string, content: string, metadata: any = {}) {
    if (!(this as any)._projectFiles) (this as any)._projectFiles = {};
    const map = (this as any)._projectFiles;
    map[projectId] = map[projectId] || [];
    const existing = map[projectId].find((f: any) => f.path === path);
    if (existing) {
      existing.content = content;
      existing.metadata = metadata;
      existing.updated_at = new Date().toISOString();
      return existing;
    }
    const file = { id: randomUUID(), project_id: projectId, path, content, metadata, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    map[projectId].push(file);
    return file;
  }

  async listProjectFiles(projectId: string) {
    const map = (this as any)._projectFiles || {};
    return map[projectId] || [];
  }

  async getProjectFile(projectId: string, path: string) {
    const files = (this as any)._projectFiles?.[projectId] || [];
    return files.find((f: any) => f.path === path) || null;
  }

  async deleteProjectFile(projectId: string, path: string) {
    const files = (this as any)._projectFiles || {};
    const list = files[projectId] || [];
    const idx = list.findIndex((f: any) => f.path === path);
    if (idx === -1) return null;
    const [removed] = list.splice(idx, 1);
    return removed;
  }

  // Mobile App Builder (MemStorage)
  private _mobileProjects: any[] = [];
  private _appScreens: any[] = [];
  private _buildHistory: any[] = [];

  async createMobileProject(project: any) {
    const newProject = { ...project, id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this._mobileProjects.push(newProject);
    return newProject;
  }

  async getMobileProject(id: string) {
    return this._mobileProjects.find(p => p.id === id) || null;
  }

  async listMobileProjects(userId: string) {
    return this._mobileProjects.filter(p => p.user_id === userId);
  }

  async updateMobileProject(id: string, updates: any) {
    const idx = this._mobileProjects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this._mobileProjects[idx] = { ...this._mobileProjects[idx], ...updates, updated_at: new Date().toISOString() };
    return this._mobileProjects[idx];
  }

  async saveAppScreen(screen: any) {
    const id = screen.id || randomUUID();
    const idx = this._appScreens.findIndex(s => s.id === id);
    if (idx !== -1) {
      this._appScreens[idx] = { ...this._appScreens[idx], ...screen };
      return this._appScreens[idx];
    }
    const newScreen = { ...screen, id };
    this._appScreens.push(newScreen);
    return newScreen;
  }

  async listAppScreens(projectId: string) {
    return this._appScreens.filter(s => s.project_id === projectId);
  }

  async createBuild(build: any) {
    const newBuild = { ...build, id: randomUUID(), created_at: new Date().toISOString() };
    this._buildHistory.push(newBuild);
    return newBuild;
  }

  async getBuildHistory(projectId: string) {
    return this._buildHistory.filter(b => b.project_id === projectId);
  }
}

export class PostgresStorage implements IStorage {
  private memFallback = new MemStorage();
  private dbOk = false;
  private checkPromise: Promise<boolean> | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.dbOk) return true;
    if (this.checkPromise) return this.checkPromise;

    this.checkPromise = (async () => {
      try {
        await pool.query('SELECT 1');
        this.dbOk = true;
        console.log('[PostgresStorage] Connection healthy.');
        return true;
      } catch (err: any) {
        console.error('[PostgresStorage] Connection failure:', err.message);
        this.dbOk = false;
        return false;
      } finally {
        this.checkPromise = null;
      }
    })();
    return this.checkPromise;
  }

  async getUser(id: string): Promise<User | undefined> {
    if (!await this.checkDb()) return this.memFallback.getUser(id);
    try {
      const res = await pool.query('SELECT id, username, email, role FROM users WHERE id = $1', [id]);
      if (res.rows.length === 0) return undefined;
      return res.rows[0];
    } catch { return this.memFallback.getUser(id); }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!await this.checkDb()) return this.memFallback.getUserByUsername(username);
    try {
      const res = await pool.query('SELECT id, username, email, role FROM users WHERE username = $1', [username]);
      if (res.rows.length === 0) return undefined;
      return res.rows[0];
    } catch { return this.memFallback.getUserByUsername(username); }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!await this.checkDb()) return this.memFallback.createUser(insertUser);
    try {
      const res = await pool.query(
        'INSERT INTO users (username, email, role) VALUES ($1, $2, $3) RETURNING id, username, email, role',
        [insertUser.username, insertUser.email || null, (insertUser as any).role || 'user'],
      );
      return res.rows[0];
    } catch { return this.memFallback.createUser(insertUser); }
  }

  async saveWorkflowRuns(owner: string, repo: string, runs: any[]): Promise<void> {
    if (!await this.checkDb()) return this.memFallback.saveWorkflowRuns(owner, repo, runs);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of runs) {
        const runId = r.id || r.run_id || r.number || r.head_sha || null;
        await client.query(
          `INSERT INTO workflow_runs (run_id, repo_owner, repo_name, workflow_id, status, conclusion, html_url, run_payload, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()) ON CONFLICT (run_id) DO NOTHING`,
          [runId, owner, repo, r.workflow_id || null, r.status || null, r.conclusion || null, r.html_url || null, JSON.stringify(r)],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      return this.memFallback.saveWorkflowRuns(owner, repo, runs);
    } finally {
      client.release();
    }
  }

  async getWorkflowRuns(owner: string, repo: string, limit = 50): Promise<any[]> {
    if (!await this.checkDb()) return this.memFallback.getWorkflowRuns(owner, repo, limit);
    try {
      const res = await pool.query(
        'SELECT run_payload FROM workflow_runs WHERE repo_owner = $1 AND repo_name = $2 ORDER BY created_at DESC LIMIT $3',
        [owner, repo, limit],
      );
      return res.rows.map((r: any) => r.run_payload);
    } catch { return this.memFallback.getWorkflowRuns(owner, repo, limit); }
  }

  async createNotification(userId: string | null, type: string, payload: any): Promise<any> {
    if (!await this.checkDb()) return this.memFallback.createNotification(userId, type, payload);
    try {
      const res = await pool.query(
        'INSERT INTO notifications (user_id, type, payload, read, created_at) VALUES ($1,$2,$3,false,now()) RETURNING id, user_id, type, payload, read, created_at',
        [userId, type, JSON.stringify(payload)],
      );
      return res.rows[0];
    } catch { return this.memFallback.createNotification(userId, type, payload); }
  }

  async createProject(ownerId: string, name: string, description?: string, repoUrl?: string, metadata?: any) {
    if (!await this.checkDb()) return this.memFallback.createProject(ownerId, name, description, repoUrl, metadata);
    try {
      const res = await pool.query(
        'INSERT INTO projects(owner_id, name, description, repo_url, metadata) VALUES($1,$2,$3,$4,$5) RETURNING *',
        [ownerId, name, description || null, repoUrl || null, metadata || {}]
      );
      return res.rows[0];
    } catch { return this.memFallback.createProject(ownerId, name, description, repoUrl, metadata); }
  }

  async listProjects({ ownerId, publicOnly }: { ownerId?: string, publicOnly?: boolean } = {}) {
    if (!await this.checkDb()) return this.memFallback.listProjects({ ownerId, publicOnly });
    const clauses: string[] = [];
    const params: any[] = [];
    if (ownerId) {
      params.push(ownerId);
      clauses.push(`owner_id = $${params.length}`);
    }
    if (publicOnly) {
      params.push(true);
      clauses.push(`public = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    try {
      const res = await pool.query(`SELECT * FROM projects ${where} ORDER BY created_at DESC`, params);
      return res.rows;
    } catch { return this.memFallback.listProjects({ ownerId, publicOnly }); }
  }

  async getProject(projectId: string) {
    if (!await this.checkDb()) return this.memFallback.getProject(projectId);
    try {
      const res = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      return res.rows[0];
    } catch { return this.memFallback.getProject(projectId); }
  }

  async updateProject(projectId: string, updates: any) {
    if (!await this.checkDb()) return this.memFallback.updateProject(projectId, updates);
    try {
      const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const values = Object.values(updates);
      const res = await pool.query(`UPDATE projects SET ${fields} WHERE id = $${values.length + 1} RETURNING *`, [...values, projectId]);
      return res.rows[0];
    } catch { return this.memFallback.updateProject(projectId, updates); }
  }

  async deleteProject(projectId: string) {
    if (!await this.checkDb()) return this.memFallback.deleteProject(projectId);
    try {
      const res = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [projectId]);
      return res.rows[0];
    } catch { return this.memFallback.deleteProject(projectId); }
  }

  async saveProjectFile(projectId: string, path: string, content: string, metadata: any = {}) {
    if (!await this.checkDb()) return this.memFallback.saveProjectFile(projectId, path, content, metadata);
    try {
      const res = await pool.query(
        `INSERT INTO project_files (project_id, path, content, metadata, created_at, updated_at)
         VALUES ($1,$2,$3,$4, now(), now())
         ON CONFLICT (project_id, path) DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata, updated_at = now()
         RETURNING *`,
        [projectId, path, content, metadata]
      );
      return res.rows[0];
    } catch { return this.memFallback.saveProjectFile(projectId, path, content, metadata); }
  }

  async listProjectFiles(projectId: string) {
    if (!await this.checkDb()) return this.memFallback.listProjectFiles(projectId);
    try {
      const res = await pool.query('SELECT id, project_id, path, metadata, created_at, updated_at FROM project_files WHERE project_id = $1 ORDER BY path', [projectId]);
      return res.rows;
    } catch { return this.memFallback.listProjectFiles(projectId); }
  }

  async getProjectFile(projectId: string, path: string) {
    if (!await this.checkDb()) return this.memFallback.getProjectFile(projectId, path);
    try {
      const res = await pool.query('SELECT * FROM project_files WHERE project_id = $1 AND path = $2', [projectId, path]);
      return res.rows[0] || null;
    } catch { return this.memFallback.getProjectFile(projectId, path); }
  }

  async deleteProjectFile(projectId: string, path: string) {
    if (!await this.checkDb()) return this.memFallback.deleteProjectFile(projectId, path);
    try {
      const res = await pool.query('DELETE FROM project_files WHERE project_id = $1 AND path = $2 RETURNING *', [projectId, path]);
      return res.rows[0] || null;
    } catch { return this.memFallback.deleteProjectFile(projectId, path); }
  }

  async getNotificationsForUser(userId: string): Promise<any[]> {
    if (!await this.checkDb()) return this.memFallback.getNotificationsForUser(userId);
    try {
      const res = await pool.query(
        'SELECT id, user_id, type, payload, read, created_at FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 100',
        [userId],
      );
      return res.rows.map((r: any) => ({ ...r, payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload }));
    } catch { return this.memFallback.getNotificationsForUser(userId); }
  }

  async createMobileProject(project: any) {
    if (!await this.checkDb()) return this.memFallback.createMobileProject(project);
    try {
      const res = await pool.query(
        'INSERT INTO mobile_projects (name, description, user_id, status, config) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [project.name, project.description || null, project.userId, project.status || 'draft', project.config || {}]
      );
      return res.rows[0];
    } catch { return this.memFallback.createMobileProject(project); }
  }

  async getMobileProject(id: string) {
    if (!await this.checkDb()) return this.memFallback.getMobileProject(id);
    try {
      const res = await pool.query('SELECT * FROM mobile_projects WHERE id = $1', [id]);
      return res.rows[0] || null;
    } catch { return this.memFallback.getMobileProject(id); }
  }

  async listMobileProjects(userId: string) {
    if (!await this.checkDb()) return this.memFallback.listMobileProjects(userId);
    try {
      const res = await pool.query('SELECT * FROM mobile_projects WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return res.rows;
    } catch { return this.memFallback.listMobileProjects(userId); }
  }

  async updateMobileProject(id: string, updates: any) {
    if (!await this.checkDb()) return this.memFallback.updateMobileProject(id, updates);
    try {
      const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const values = Object.values(updates);
      const res = await pool.query(`UPDATE mobile_projects SET ${fields}, updated_at = now() WHERE id = $${values.length + 1} RETURNING *`, [...values, id]);
      return res.rows[0];
    } catch { return this.memFallback.updateMobileProject(id, updates); }
  }

  async saveAppScreen(screen: any) {
    if (!await this.checkDb()) return this.memFallback.saveAppScreen(screen);
    try {
      const res = await pool.query(
        `INSERT INTO app_screens (project_id, name, layout, is_initial) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, layout = EXCLUDED.layout, is_initial = EXCLUDED.is_initial
         RETURNING *`,
        [screen.projectId, screen.name, screen.layout, screen.isInitial || false]
      );
      return res.rows[0];
    } catch { return this.memFallback.saveAppScreen(screen); }
  }

  async listAppScreens(projectId: string) {
    if (!await this.checkDb()) return this.memFallback.listAppScreens(projectId);
    try {
      const res = await pool.query('SELECT * FROM app_screens WHERE project_id = $1', [projectId]);
      return res.rows;
    } catch { return this.memFallback.listAppScreens(projectId); }
  }

  async createBuild(build: any) {
    if (!await this.checkDb()) return this.memFallback.createBuild(build);
    try {
      const res = await pool.query(
        'INSERT INTO build_history (project_id, platform, status, build_url, logs, version) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [build.projectId, build.platform, build.status, build.buildUrl || null, build.logs || null, build.version]
      );
      return res.rows[0];
    } catch { return this.memFallback.createBuild(build); }
  }

  async getBuildHistory(projectId: string) {
    if (!await this.checkDb()) return this.memFallback.getBuildHistory(projectId);
    try {
      const res = await pool.query('SELECT * FROM build_history WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
      return res.rows;
    } catch { return this.memFallback.getBuildHistory(projectId); }
  }

  async getLeaderboard(): Promise<any[]> {
    if (!await this.checkDb()) return this.memFallback.getLeaderboard();
    try {
      // In a real app, this would aggregate from multiple tables
      // For now, return mock data or aggregate from projects/builds if available
      // Let's return the memFallback for now as the schema might not have a dedicated leaderboard table yet
      return this.memFallback.getLeaderboard();
    } catch { return this.memFallback.getLeaderboard(); }
  }
}

// Resilient storage initialization
let storageInstance: IStorage;
const storagePromise = (async () => {
  if (!process.env.DATABASE_URL) {
    console.log('[Storage] No DATABASE_URL found, using MemStorage.');
    return new MemStorage();
  }

  try {
    // Quick probe to check if database is actually reachable and authenticated
    await pool.query('SELECT 1');
    console.log('[Storage] Successfully connected to PostgreSQL.');
    return new PostgresStorage();
  } catch (err: any) {
    console.error('[Storage] Database connection failed:', err.message);
    if (err.message.includes('SASL') || err.message.includes('password') || err.message.includes('ECONNREFUSED')) {
      console.warn('[Storage] Falling back to MemStorage due to connection issues.');
      return new MemStorage();
    }
    return new MemStorage();
  }
})();

// Export a placeholder that will be populated, but since we use export const storage directly in routes,
// we'll use a wrapper or ensure the server waits for it.
// However, to maintain the existing API `export const storage = ...`, we'll use a proxy or just the Postgres instance 
// but with internal fallback in methods.
// For now, let's stick to the simplest functional path: If it fails, we use MemStorage.
// To avoid top-level await error:
export const storage: IStorage = process.env.DATABASE_URL ? new PostgresStorage() : new MemStorage();
