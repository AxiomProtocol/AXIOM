# Sovran Wealth Fund Admin Area Guide

This guide explains how to use the restricted administrative area of the Sovran Wealth Fund platform to manage your token.

## Overview

The admin area provides a secure, password-protected interface where you can:

1. View token information (supply, balances, ownership)
2. Verify the token on PolygonScan
3. Deploy a new token (if needed)
4. Monitor wallet balances and distribution

## Accessing the Admin Area

Access the admin dashboard at:
```
https://your-replit-url.replit.app/admin
```

You'll need to log in with your admin credentials:
- Username: Set in your `.env` file as `ADMIN_USERNAME` (default: "admin")
- Password: Set in your `.env` file as `ADMIN_PASSWORD` (default: "administrator")

## Security

The admin area is secured with:
- Server-side authentication
- Session-based access control
- PostgreSQL database for user storage
- Password hashing using scrypt algorithm

## Configuration

You can configure the admin credentials by setting these variables in your `.env` file:

```
ADMIN_USERNAME=your_desired_username
ADMIN_PASSWORD=your_secure_password
SESSION_SECRET=random_string_for_encrypting_sessions
```

## Important Features

### Dashboard

The dashboard provides an overview of your token:
- Total supply
- Main distributor balance
- Treasury wallet balance

### Token Management

From the Token Management page, you can:
1. **View Token Information** - See details about the token contract
2. **Verify Token on PolygonScan** - Make your token code publicly visible on the block explorer
3. **Deploy New Token** - Only use this if you need to create a new token contract

## Database Initialization

The database is automatically initialized when the server starts. If you need to reinitialize it manually:

```bash
node scripts/db-init.js
```

## Data Storage

User credentials are stored in a PostgreSQL database with the following schema:

```javascript
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // Stored as a hashed value
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

## API Endpoints

The admin area includes the following API endpoints:

- **GET /api/admin/me** - Get current user information
- **POST /api/admin/login** - Login with username/password
- **POST /api/admin/logout** - Logout current user
- **GET /api/admin/token/token-info** - Get token information
- **POST /api/admin/token/verify-token** - Verify token on PolygonScan
- **POST /api/admin/token/deploy-token** - Deploy a new token
- **GET /api/admin/token/deployment-info** - Get token deployment information

## Troubleshooting

If you encounter issues with the admin area:

1. Check the server logs for errors
2. Verify database connectivity
3. Ensure your `.env` file has the necessary credentials
4. Try restarting the server
5. Reinitialize the database with `node scripts/db-init.js`