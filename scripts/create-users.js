#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text,
  provider text,
  provider_id text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Table for connect-pg-simple
CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);
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
