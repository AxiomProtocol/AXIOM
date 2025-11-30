// Database connection for SWF platform
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

// Configure Neon database connection to use WebSockets
neonConfig.webSocketConstructor = ws;

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable not found');
}

// Create a database connection pool
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create a Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export a function to check the database connection
export async function checkConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { 
      connected: true, 
      timestamp: result.rows[0].now 
    };
  } catch (error) {
    console.error('Database connection error:', error);
    return { 
      connected: false, 
      error: (error as Error).message 
    };
  }
}