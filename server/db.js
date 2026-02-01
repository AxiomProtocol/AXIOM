const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('../shared/schema');

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

module.exports = { db, pool };