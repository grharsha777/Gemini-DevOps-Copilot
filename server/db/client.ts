import { Pool, PoolConfig, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

type QueryParams = (string | number | boolean | null)[];

interface DatabaseConfig extends PoolConfig {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class DatabaseClient {
  private pool: Pool;
  private static instance: DatabaseClient;

  private constructor(config: DatabaseConfig) {
    const defaultConfig: DatabaseConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ...config
    };

    this.pool = new Pool(defaultConfig);

    this.pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle database client', { error: err });
      process.exit(-1);
    });
  }

  public static getInstance(config: DatabaseConfig = {}): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient(config);
    }
    return DatabaseClient.instance;
  }

  public async query<T extends QueryResultRow>(
    text: string, 
    params: QueryParams = []
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { 
        query: text, 
        duration: `${duration}ms`,
        rows: res.rowCount 
      });
      return res;
    } catch (error) {
      logger.error('Database query error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: text, 
        params
      });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    const client = await this.pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Set a timeout of 5 seconds
    const timeout = setTimeout(() => {
      const lastQuery = (client as any).lastQuery || 'No query executed';
      logger.error('Database client timeout', {
        message: 'Client has been checked out for more than 5 seconds',
        lastQuery
      });
    }, 5000);

    // Monkey patch the query method to keep track of the last query
    (client as any).query = (...args: [string, QueryParams?]) => {
      (client as any).lastQuery = args[0];
      return query.apply(client, args);
    };

    client.release = () => {
      clearTimeout(timeout);
      client.release = release;
      return release.apply(client);
    };

    return client;
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      const error = e instanceof Error ? e : new Error('Transaction failed');
      logger.error('Transaction error', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Export a singleton instance
export const db = DatabaseClient.getInstance();

export default db;
