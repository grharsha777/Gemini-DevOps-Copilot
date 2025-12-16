import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Export a null client to avoid crashes; callers should check
  export const pool = null as unknown as Pool;
} else {
  export const pool = new Pool({ connectionString });
}
