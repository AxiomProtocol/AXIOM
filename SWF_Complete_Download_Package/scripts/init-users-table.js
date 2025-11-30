/**
 * Initialize users table with SQL
 */
require('dotenv').config();
const { Pool } = require('pg');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

// Default admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'administrator';

// Hash password function
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${derivedKey.toString('hex')}.${salt}`;
}

// Create a new pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initUsersTable() {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('Users table does not exist. Creating it...');
      
      // Create users table with snake_case column names for PostgreSQL compatibility
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      console.log('Users table created successfully.');
    } else {
      console.log('Users table already exists.');
    }
    
    // Now check if admin user exists
    const adminCheck = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [ADMIN_USERNAME]
    );
    
    if (adminCheck.rows.length === 0) {
      console.log(`Creating admin user: ${ADMIN_USERNAME}`);
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);
      
      await client.query(
        'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3)',
        [ADMIN_USERNAME, hashedPassword, true]
      );
      
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user already exists.');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute if called directly
if (require.main === module) {
  initUsersTable()
    .then(() => {
      console.log('Users table initialization completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { initUsersTable };