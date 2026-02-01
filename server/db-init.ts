import { db } from './db';
import { sql } from 'drizzle-orm';

export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Create user roles enum if not exists
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'premium', 'admin', 'super_admin', 'moderator');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create account status enum if not exists
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE account_status AS ENUM ('active', 'suspended', 'pending_verification', 'deactivated');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create sessions table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);

    // Create sessions index if not exists
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
    `);

    // Create users table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE,
        password VARCHAR,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        profile_image_url VARCHAR,
        wallet_address VARCHAR(42),
        swf_token_balance DECIMAL(18,8) DEFAULT 0,
        total_staked DECIMAL(18,8) DEFAULT 0,
        role user_role DEFAULT 'user',
        account_status account_status DEFAULT 'active',
        email_verified BOOLEAN DEFAULT false,
        two_factor_enabled BOOLEAN DEFAULT false,
        bio TEXT,
        location VARCHAR(100),
        website VARCHAR,
        social_links JSONB,
        last_login_at TIMESTAMP,
        login_count INTEGER DEFAULT 0,
        premium_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}