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

  // Projects CRUD for App Builder (in-memory)
  async createProject(ownerId: string | null, name: string, description?: string, repoUrl?: string, metadata?: any) {
    const id = randomUUID();
    const project = { id, owner_id: ownerId, name, description, public: true, repo_url: repoUrl || null, metadata: metadata || {}, created_at: new Date().toISOString() };
    // store in notifications array for simplicity (or add a dedicated array)
    if (!(this as any)._projects) (this as any)._projects = [];
    (this as any)._projects.unshift(project);
    return project;
  }

  async listProjects({ownerId, publicOnly} : {ownerId?: string, publicOnly?: boolean} = {}) {
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
}

export class PostgresStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!pool) return undefined;
    const res = await pool.query('SELECT id, username, email, role FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    return res.rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!pool) return undefined;
    const res = await pool.query('SELECT id, username, email, role FROM users WHERE username = $1', [username]);
    if (res.rows.length === 0) return undefined;
    return res.rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!pool) {
      const id = randomUUID();
      return { id, username: insertUser.username, email: insertUser.email };
    }
    const res = await pool.query(
      'INSERT INTO users (username, email, role) VALUES ($1, $2, $3) RETURNING id, username, email, role',
      [insertUser.username, insertUser.email || null, (insertUser as any).role || 'user'],
    );
    return res.rows[0];
  }

  async saveWorkflowRuns(owner: string, repo: string, runs: any[]): Promise<void> {
    if (!pool) return;
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
      console.error('saveWorkflowRuns error', e);
    } finally {
      client.release();
    }
  }

  async getWorkflowRuns(owner: string, repo: string, limit = 50): Promise<any[]> {
    if (!pool) return [];
    const res = await pool.query(
      'SELECT run_payload FROM workflow_runs WHERE repo_owner = $1 AND repo_name = $2 ORDER BY created_at DESC LIMIT $3',
      [owner, repo, limit],
    );
    return res.rows.map((r: any) => r.run_payload);
  }

  async createNotification(userId: string | null, type: string, payload: any): Promise<any> {
    if (!pool) return { id: randomUUID(), user_id: userId, type, payload, read: false, created_at: new Date().toISOString() };
    const res = await pool.query(
      'INSERT INTO notifications (user_id, type, payload, read, created_at) VALUES ($1,$2,$3,false,now()) RETURNING id, user_id, type, payload, read, created_at',
      [userId, type, JSON.stringify(payload)],
    );
    return res.rows[0];
  }

  // Projects CRUD for App Builder
  async createProject(ownerId: string, name: string, description?: string, repoUrl?: string, metadata?: any) {
    if (!pool) return { id: randomUUID(), owner_id: ownerId, name, description, repo_url: repoUrl, metadata, created_at: new Date().toISOString() };
    const res = await pool.query(
      'INSERT INTO projects(owner_id, name, description, repo_url, metadata) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [ownerId, name, description || null, repoUrl || null, metadata || {}]
    );
    return res.rows[0];
  }

  async listProjects({ownerId, publicOnly} : {ownerId?: string, publicOnly?: boolean} = {}) {
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
    if (!pool) return [];
    const res = await pool.query(`SELECT * FROM projects ${where} ORDER BY created_at DESC`, params);
    return res.rows;
  }

  async getProject(projectId: string) {
    if (!pool) return null;
    const res = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    return res.rows[0];
  }

  async updateProject(projectId: string, updates: any) {
    if (!pool) return null;
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    const res = await pool.query(`UPDATE projects SET ${fields} WHERE id = $${values.length + 1} RETURNING *`, [...values, projectId]);
    return res.rows[0];
  }

  async deleteProject(projectId: string) {
    if (!pool) return null;
    const res = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [projectId]);
    return res.rows[0];
  }

  async getNotificationsForUser(userId: string): Promise<any[]> {
    if (!pool) return [];
    const res = await pool.query(
      'SELECT id, user_id, type, payload, read, created_at FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 100',
      [userId],
    );
    return res.rows.map((r: any) => ({ ...r, payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload }));
  }
}

export const storage = process.env.DATABASE_URL ? new PostgresStorage() : new MemStorage();
