import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';

neonConfig.fetchConnectionCache = true;

const isProduction = process.env.NODE_ENV === 'production';

export class Pool {
  private pool: NeonPool | PgPool | null = null;
  private connectionString: string | undefined;
  
  constructor(config?: { connectionString?: string }) {
    this.connectionString = config?.connectionString || process.env.DATABASE_URL;
  }
  
  private getPool(): NeonPool | PgPool {
    if (this.pool) return this.pool;
    
    if (!this.connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    if (isProduction) {
      this.pool = new NeonPool({ 
        connectionString: this.connectionString,
        max: 1,
      });
    } else {
      this.pool = new PgPool({ 
        connectionString: this.connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
    return this.pool;
  }
  
  async query(text: string, params?: any[]) {
    return this.getPool().query(text, params);
  }
  
  async connect() {
    return this.getPool().connect();
  }
  
  async end() {
    if (this.pool) {
      return this.pool.end();
    }
  }
}

let sharedPool: Pool | null = null;

export function getSharedPool(): Pool {
  if (!sharedPool) {
    sharedPool = new Pool();
  }
  return sharedPool;
}

export const pool = getSharedPool();

export const db = {
  execute: async (text: string, params?: any[]) => {
    return pool.query(text, params);
  },
  query: async (text: string, params?: any[]) => {
    return pool.query(text, params);
  }
};

export default Pool;
