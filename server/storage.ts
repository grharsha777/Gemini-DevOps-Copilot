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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
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
}

export class PostgresStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!pool) return undefined;
    const res = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    return res.rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!pool) return undefined;
    const res = await pool.query('SELECT id, username, email FROM users WHERE username = $1', [username]);
    if (res.rows.length === 0) return undefined;
    return res.rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!pool) {
      const id = randomUUID();
      return { id, username: insertUser.username, email: insertUser.email };
    }
    const res = await pool.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email',
      [insertUser.username, insertUser.email || null],
    );
    return res.rows[0];
  }
}

export const storage = process.env.DATABASE_URL ? new PostgresStorage() : new MemStorage();
