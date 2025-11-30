import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';

neonConfig.fetchConnectionCache = true;

const isProduction = process.env.NODE_ENV === 'production';

export class Pool {
  private pool: NeonPool | PgPool;
  
  constructor(config?: { connectionString?: string }) {
    const connectionString = config?.connectionString || process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    if (isProduction) {
      this.pool = new NeonPool({ 
        connectionString,
        max: 1,
      });
    } else {
      this.pool = new PgPool({ 
        connectionString,
        max: 5,
        idleTimeoutMillis: 30000,
      });
    }
  }
  
  async query(text: string, params?: any[]) {
    return this.pool.query(text, params);
  }
  
  async connect() {
    return this.pool.connect();
  }
  
  async end() {
    return this.pool.end();
  }
}

export default Pool;
