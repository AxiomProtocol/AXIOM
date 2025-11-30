import { Router } from 'express';
import { db } from './db';
import { 
  users, 
  userSessions, 
  userWallets, 
  userTransactions, 
  userNotifications 
} from '../shared/schema';
import { 
  authenticateToken, 
  AuthenticatedRequest,
  hashPassword,
  comparePassword,
  generateToken
} from './auth';
import { eq, desc, and, sql } from 'drizzle-orm';

const router = Router();

// Helper function: Register user
async function registerUser(userData: {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
}) {
  try {
    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, userData.email));
    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create user
    const [newUser] = await db.insert(users).values({
      email: userData.email,
      password: hashedPassword,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      walletAddress: userData.walletAddress,
      role: 'user',
      accountStatus: 'active',
      emailVerified: false
    }).returning();

    // Generate token
    const token = generateToken({
      id: String(newUser.id),
      email: newUser.email || '',
      role: newUser.role || 'user'
    });

    return {
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      }
    };
  } catch (error) {
    console.error('Register user error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

// Helper function: Login user
async function loginUser(email: string, password: string, deviceInfo: any) {
  try {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return { success: false, error: 'Account is suspended or deactivated' };
    }

    // Verify password
    if (!user.password) {
      return { success: false, error: 'Password not set for this account' };
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update login stats
    await db.update(users).set({
      lastLoginAt: new Date(),
      loginCount: (user.loginCount || 0) + 1
    }).where(eq(users.id, user.id));

    // Generate token
    const token = generateToken({
      id: String(user.id),
      email: user.email || '',
      role: user.role || 'user'
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        walletAddress: user.walletAddress,
        axmTokenBalance: user.axmTokenBalance
      }
    };
  } catch (error) {
    console.error('Login user error:', error);
    return { success: false, error: 'Login failed' };
  }
}

// Helper function: Logout user
async function logoutUser(token: string) {
  // Since we're using stateless JWT tokens, logout is handled client-side
  // This function is a placeholder for future session invalidation if needed
  return { success: true };
}

// User registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, firstName, lastName, walletAddress } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      location: req.headers['cf-ipcountry'] || 'Unknown',
    };

    const result = await registerUser({
      email,
      password,
      username,
      firstName,
      lastName,
      walletAddress,
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      location: req.headers['cf-ipcountry'] || 'Unknown',
    };

    const result = await loginUser(email, password, deviceInfo);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User logout
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await logoutUser(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        walletAddress: users.walletAddress,
        axmTokenBalance: users.axmTokenBalance,
        totalStaked: users.totalStaked,
        role: users.role,
        accountStatus: users.accountStatus,
        emailVerified: users.emailVerified,
        twoFactorEnabled: users.twoFactorEnabled,
        bio: users.bio,
        location: users.location,
        website: users.website,
        socialLinks: users.socialLinks,
        lastLoginAt: users.lastLoginAt,
        loginCount: users.loginCount,
        premiumExpiresAt: users.premiumExpiresAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      username,
      firstName,
      lastName,
      bio,
      location,
      website,
      socialLinks,
    } = req.body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (username !== undefined) updateData.username = username;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.user!.id))
      .returning();

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connect wallet to user account
router.post('/connect-wallet', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { walletAddress, walletType = 'MetaMask' } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate Ethereum address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Check if wallet is already connected to another user
    const existingWallet = await db
      .select()
      .from(userWallets)
      .where(eq(userWallets.walletAddress, walletAddress))
      .limit(1);

    if (existingWallet.length > 0 && existingWallet[0].userId !== req.user!.id) {
      return res.status(400).json({ error: 'Wallet is already connected to another account' });
    }

    // Add wallet to user's wallets
    const [newWallet] = await db
      .insert(userWallets)
      .values({
        userId: req.user!.id,
        walletAddress,
        walletType,
        isDefault: true,
      })
      .returning();

    // Update user's primary wallet address
    await db
      .update(users)
      .set({
        walletAddress,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.id));

    res.json({
      success: true,
      message: 'Wallet connected successfully',
      wallet: newWallet,
    });
  } catch (error) {
    console.error('Wallet connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's wallet history
router.get('/wallets', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const wallets = await db
      .select()
      .from(userWallets)
      .where(eq(userWallets.userId, req.user!.id))
      .orderBy(desc(userWallets.createdAt));

    res.json({ wallets });
  } catch (error) {
    console.error('Wallets fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's transaction history
router.get('/transactions', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const transactions = await db
      .select()
      .from(userTransactions)
      .where(eq(userTransactions.userId, req.user!.id))
      .orderBy(desc(userTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userTransactions)
      .where(eq(userTransactions.userId, req.user!.id));

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user notifications
router.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    
    let query = db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, req.user!.id));

    if (unreadOnly) {
      query = query.where(eq(userNotifications.isRead, false));
    }

    const notifications = await query
      .orderBy(desc(userNotifications.createdAt))
      .limit(50);

    res.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    await db
      .update(userNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(userNotifications.id, id),
          eq(userNotifications.userId, req.user!.id)
        )
      );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Notification update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's active sessions
router.get('/sessions', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const sessions = await db
      .select({
        id: userSessions.id,
        deviceInfo: userSessions.deviceInfo,
        ipAddress: userSessions.ipAddress,
        location: userSessions.location,
        isActive: userSessions.isActive,
        expiresAt: userSessions.expiresAt,
        createdAt: userSessions.createdAt,
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, req.user!.id),
          eq(userSessions.isActive, true)
        )
      )
      .orderBy(desc(userSessions.createdAt));

    res.json({ sessions });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;