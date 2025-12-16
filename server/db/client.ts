import pkg from 'pg';
const { Pool } = (pkg as any);

const connectionString = process.env.DATABASE_URL;
export const pool = connectionString ? new Pool({ connectionString }) : null;
