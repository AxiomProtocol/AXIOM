const { db } = require('./db');
const { users } = require('../shared/schema');
const { eq } = require('drizzle-orm');
const { scrypt } = require('crypto');
const { promisify } = require('util');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./db');

const scryptAsync = promisify(scrypt);

// Function to compare passwords
async function comparePasswords(suppliedPassword, storedPassword) {
  const [hashedPwd, salt] = storedPassword.split('.');
  const derivedKey = await scryptAsync(suppliedPassword, salt, 64);
  return hashedPwd === derivedKey.toString('hex');
}

// Configure session middleware
function setupSession(app) {
  app.use(session({
    store: new pgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'swf_secret_key_change_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  return res.redirect('/admin/login');
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  return res.redirect('/admin/login');
}

// Setup authentication routes
function setupAuthRoutes(app) {
  // Login route - using direct SQL queries instead of ORM
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }
      
      // Use direct SQL query instead of ORM
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM users WHERE username = $1',
          [username]
        );
        
        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const isPasswordValid = await comparePasswords(password, user.password);
        
        if (!isPasswordValid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Set session data
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.is_admin;
        
        return res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            username: user.username, 
            isAdmin: user.is_admin 
          } 
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });
  
  // Logout route
  app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ success: true });
    });
  });
  
  // Get current user
  app.get('/api/admin/me', (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
      id: req.session.userId,
      username: req.session.username,
      isAdmin: req.session.isAdmin
    });
  });
}

module.exports = {
  setupSession,
  setupAuthRoutes,
  requireAuth,
  requireAdmin
};