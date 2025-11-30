/**
 * Create admin user directly using SQL
 */

require('dotenv').config();
const { Pool } = require('pg');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

// Function to hash a password
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${derivedKey.toString('hex')}.${salt}`;
}

// Admin credentials from env or defaults
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'administrator';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdminUser() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if admin user exists
    const checkResult = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [ADMIN_USERNAME]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`Admin user '${ADMIN_USERNAME}' not found. Creating...`);
      
      // Hash the password
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);
      
      // Insert admin user
      await client.query(
        'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3)',
        [ADMIN_USERNAME, hashedPassword, true]
      );
      
      console.log('Admin user created successfully!');
    } else {
      console.log(`Admin user '${ADMIN_USERNAME}' already exists.`);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    client.release();
  }
}

createAdminUser()
  .then(() => {
    console.log('Admin user setup complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });