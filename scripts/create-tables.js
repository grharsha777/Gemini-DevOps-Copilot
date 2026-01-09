#!/usr/bin/env node
const { Pool } = require('pg');

const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text,
  password text,
  provider text,
  provider_id text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);

-- Workflow runs persisted from CI providers
CREATE TABLE IF NOT EXISTS workflow_runs (
  id bigserial PRIMARY KEY,
  run_id text UNIQUE,
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  workflow_id text,
  status text,
  conclusion text,
  html_url text,
  run_payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_repo ON workflow_runs(repo_owner, repo_name);

-- Notifications for users
CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  user_id uuid,
  type text NOT NULL,
  payload jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Projects table for community / app builder
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  name text NOT NULL,
  description text,
  public boolean DEFAULT true,
  repo_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- Project files storage for App Builder
CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  path text NOT NULL,
  content text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_project_files_project_path ON project_files(project_id, path);
`;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set; cannot create tables');
  process.exit(1);
}

(async () => {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    await pool.query(sql);
    console.log('Tables created/verified');
  } catch (err) {
    console.error('Failed to create tables', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
