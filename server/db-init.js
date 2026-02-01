// Use the SQL-based initialization script
const { initUsersTable } = require('../scripts/init-users-table');

// Alias for backward compatibility
const initializeDatabase = initUsersTable;

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

// Export the initialization function
module.exports = { initializeDatabase };