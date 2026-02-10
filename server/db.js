const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('../shared/schema');

let _pool = null;
let _db = null;

function getPool() {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Cannot create database pool.");
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

const pool = new Proxy({}, {
  get(_target, prop) {
    return getPool()[prop];
  }
});

const db = new Proxy({}, {
  get(_target, prop) {
    return getDb()[prop];
  }
});

module.exports = { db, pool };
