/**
 * Database initialization script for SWF Admin
 * Run this script to set up the database tables and create the admin user
 */

require('dotenv').config();
const { initializeDatabase } = require('../server/db-init');

console.log('Starting database initialization...');

initializeDatabase()
  .then(() => {
    console.log('Database initialization completed successfully!');
    console.log('You can now access the admin interface at /admin');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });