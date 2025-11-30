/**
 * Authentication and Authorization Middleware
 * Secure middleware for protecting routes and role-based access control
 */

const jwt = require('jsonwebtoken');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Database connection
let pool = null;

async function initializeAuthDatabase() {
  try {
    // Check if we have DATABASE_URL or individual PostgreSQL environment variables
    const databaseUrl = process.env.DATABASE_URL || 
      `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?sslmode=require`;
    
    if (!databaseUrl || databaseUrl.includes('undefined')) {
      console.warn('⚠️ No database configuration found for auth middleware');
      return;
    }
    
    pool = new Pool({ 
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection with timeout
    const testConnection = await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Auth middleware database connection timeout')), 10000))
    ]);
    
    console.log('✅ Auth middleware database connected successfully');
  } catch (error) {
    console.error('❌ Auth middleware database connection failed:', error.message);
    pool = null; // Ensure pool is null on failure
  }
}

// Initialize database connection
initializeAuthDatabase();

// SECURITY: JWT_SECRET configuration - REQUIRED in production
const JWT_SECRET = (() => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is required in production');
    console.error('❌ Server will not start without JWT_SECRET for security');
    process.exit(1);
  }
  
  if (!process.env.JWT_SECRET) {
    const defaultSecret = 'swf-auth-dev-' + require('crypto').randomBytes(32).toString('hex');
    console.log('⚠️  Using auto-generated JWT_SECRET for development only');
    return defaultSecret;
  }
  
  console.log('✅ Using production JWT_SECRET from environment');
  return process.env.JWT_SECRET;
})();

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware - verifies JWT token and loads user data
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    let user;
    
    if (pool) {
      try {
        // Get fresh user data from database
        const result = await pool.query(`
          SELECT 
            id, email, username, first_name, last_name, role, 
            account_status, wallet_address, swf_token_balance,
            email_verified, two_factor_enabled, last_login_at
          FROM users 
          WHERE id = $1
        `, [decoded.id]);
        
        user = result.rows[0];
        
        if (!user) {
          return res.status(403).json({ 
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }
        
        // Check account status
        if (user.account_status !== 'active') {
          return res.status(403).json({ 
            error: `Account ${user.account_status}. Please contact support.`,
            code: 'ACCOUNT_INACTIVE',
            status: user.account_status
          });
        }
        
        // Update last login timestamp
        await pool.query(
          'UPDATE users SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = $1',
          [user.id]
        );
        
      } catch (dbError) {
        console.error('Database error in auth middleware:', dbError);
        
        // SECURITY: For KYC routes, always require database validation
        if (req.path.includes('/kyc/') || req.path.includes('/admin/')) {
          return res.status(503).json({ 
            error: 'Service temporarily unavailable. Database validation required for secure operations.',
            code: 'DB_VALIDATION_REQUIRED',
            retryAfter: 30
          });
        }
        
        // For non-critical routes, use limited fallback with warnings
        console.warn('⚠️  AUTH FALLBACK: Using token data only due to DB unavailability');
        user = {
          id: decoded.id,
          email: decoded.email,
          role: 'user', // Default to least privileged role
          account_status: 'active', // Limited fallback
          fallbackMode: true // Flag for logging
        };
      }
    } else {
      // SECURITY: No database connection - deny access to KYC routes
      if (req.path.includes('/kyc/') || req.path.includes('/admin/')) {
        return res.status(503).json({ 
          error: 'Service unavailable. Database connection required for secure operations.',
          code: 'DB_CONNECTION_REQUIRED'
        });
      }
      
      // Limited fallback mode for non-critical routes only
      console.warn('⚠️  AUTH NO-DB: Using token data only - no database connection');
      user = {
        id: decoded.id,
        email: decoded.email,
        role: 'user', // Default to least privileged
        account_status: 'active',
        wallet_address: null,
        first_name: 'User',
        last_name: '',
        swf_token_balance: '0',
        fallbackMode: true
      };
    }
    
    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      accountStatus: user.account_status,
      walletAddress: user.wallet_address,
      swfTokenBalance: user.swf_token_balance,
      emailVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled
    };
    
    next();
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Role-based authorization middleware factory
 * @param {string|string[]} allowedRoles - Single role or array of roles
 * @returns {Function} Express middleware function
 */
function requireRole(allowedRoles) {
  // Normalize to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    // Check if user is authenticated (should be called after authenticateToken)
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
}

/**
 * Admin-only middleware (convenience function)
 */
function requireAdmin(req, res, next) {
  return requireRole(['admin', 'super_admin'])(req, res, next);
}

/**
 * Super admin-only middleware (convenience function)
 */
function requireSuperAdmin(req, res, next) {
  return requireRole(['super_admin'])(req, res, next);
}

/**
 * Ownership verification middleware - checks if user owns the resource
 * @param {string} paramName - Name of the parameter containing the user ID
 * @returns {Function} Express middleware function
 */
function requireOwnership(paramName = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const resourceUserId = parseInt(req.params[paramName]);
    const currentUserId = req.user.id;
    
    // Allow access if user owns the resource OR is admin
    if (resourceUserId === currentUserId || ['admin', 'super_admin'].includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ 
        error: 'Access denied. You can only access your own resources.',
        code: 'OWNERSHIP_REQUIRED'
      });
    }
  };
}

/**
 * Rate limiting by user ID (for authenticated endpoints)
 */
function createUserRateLimit(windowMs, maxRequests) {
  const userLimits = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next(); // Skip if not authenticated
    }
    
    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create user's request history
    if (!userLimits.has(userId)) {
      userLimits.set(userId, []);
    }
    
    const userRequests = userLimits.get(userId);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests from this user',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    validRequests.push(now);
    userLimits.set(userId, validRequests);
    
    next();
  };
}

/**
 * Audit logging middleware - logs user actions for compliance
 */
function auditLog(action, targetType = 'unknown') {
  return async (req, res, next) => {
    // Store audit data in request for later logging
    req.auditData = {
      action,
      targetType,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    // Log to database if available
    if (pool && req.user) {
      try {
        await pool.query(`
          INSERT INTO admin_logs (
            admin_id, action, target_type, target_id, details,
            ip_address, user_agent, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          req.user.id,
          action,
          targetType,
          req.params.id || req.params.kycId || null,
          JSON.stringify({ 
            method: req.method, 
            path: req.path, 
            body: req.body 
          }),
          req.ip,
          req.get('User-Agent')
        ]);
      } catch (error) {
        console.error('Failed to log audit:', error);
      }
    }
    
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireOwnership,
  createUserRateLimit,
  auditLog,
  verifyToken
};