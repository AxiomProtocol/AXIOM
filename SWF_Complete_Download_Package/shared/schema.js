const { pgTable, serial, text, boolean, timestamp } = require('drizzle-orm/pg-core');

// User table - match the exact column names in the database
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  is_admin: boolean('is_admin').default(false).notNull(), // Changed from isAdmin to is_admin
  created_at: timestamp('created_at').defaultNow().notNull() // Changed from createdAt to created_at
});

module.exports = {
  users
};