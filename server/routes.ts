import express, { Request, Response } from 'express';
import { db } from './db';
import { users, contributionPlans } from '../shared/schema';
import { eq, desc, count } from 'drizzle-orm';
import { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  authenticateToken, 
  optionalAuth,
  requireAdmin,
  AuthenticatedRequest 
} from './auth';

const router = express.Router();

// ==================== AUTHENTICATION ROUTES ====================

// Register new user
router.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, email));
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 4);

    const [newUser] = await db.insert(users).values({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      emailVerified: false,
      loginCount: 0
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role
    });

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during registration' 
    });
  }
});

// Login user
router.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || !user.password) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({ 
        success: false, 
        error: 'Account is suspended or deactivated' 
      });
    }

    // Update login stats
    await db.update(users)
      .set({ 
        lastLoginAt: new Date(),
        loginCount: (user.loginCount || 0) + 1
      })
      .where(eq(users.id, user.id));

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        walletAddress: user.walletAddress,
        axmTokenBalance: user.axmTokenBalance
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during login' 
    });
  }
});

// Verify token
router.get('/api/auth/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    
    // Get fresh user data
    const [userData] = await db.select().from(users).where(eq(users.id, user.id));
    
    if (!userData) {
      return res.status(404).json({ 
        valid: false, 
        error: 'User not found' 
      });
    }

    res.json({
      valid: true,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        walletAddress: userData.walletAddress,
        axmTokenBalance: userData.axmTokenBalance,
        accountStatus: userData.accountStatus,
        emailVerified: userData.emailVerified
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Token verification failed' 
    });
  }
});

// Get current user profile
router.get('/api/auth/user', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [userData] = await db.select().from(users).where(eq(users.id, req.user!.id));
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: userData.id,
      email: userData.email,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      role: userData.role,
      walletAddress: userData.walletAddress,
      axmTokenBalance: userData.axmTokenBalance,
      totalStaked: userData.totalStaked,
      accountStatus: userData.accountStatus,
      emailVerified: userData.emailVerified,
      bio: userData.bio,
      location: userData.location,
      website: userData.website,
      lastLoginAt: userData.lastLoginAt,
      createdAt: userData.createdAt
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// ==================== DASHBOARD ROUTES ====================

// Dashboard stats
router.get('/api/dashboard/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [userData] = await db.select().from(users).where(eq(users.id, req.user!.id));
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate portfolio stats
    const portfolioValue = parseFloat(userData.axmTokenBalance || '0') * 1.23; // SWF price example
    const stakingRewards = parseFloat(userData.totalStaked || '0') * 0.125; // 12.5% APY

    res.json({
      portfolioValue: portfolioValue.toFixed(2),
      axmBalance: userData.axmTokenBalance || '0',
      axmUsdValue: (parseFloat(userData.axmTokenBalance || '0') * 1.23).toFixed(2),
      stakingRewards: stakingRewards.toFixed(2),
      totalStaked: userData.totalStaked || '0',
      activePositions: 3, // Example
      lastUpdate: new Date().toISOString(),
      walletAddress: userData.walletAddress
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all users (admin only)
router.get('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      role: users.role,
      accountStatus: users.accountStatus,
      emailVerified: users.emailVerified,
      lastLoginAt: users.lastLoginAt,
      loginCount: users.loginCount,
      createdAt: users.createdAt
    }).from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    const [totalResult] = await db.select({ count: count() }).from(users);
    const total = totalResult.count;

    res.json({
      users: allUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Platform statistics
router.get('/api/platform-stats', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get real platform statistics from database
    const [userStats] = await db.select({ count: count() }).from(users);
    const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.accountStatus, 'active'));
    
    res.json({
      activeWallets: activeUsers.count,
      totalUsers: userStats.count,
      totalQuotes: 249, // This could come from a quotes table
      favoritesCount: 0, // This could come from user favorites
      categoriesCount: 6, // This could come from categories table
      timestamp: new Date().toISOString(),
      deployment: "unified-v1",
      contract: "0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738",
      status: "live"
    });

  } catch (error) {
    console.error('Platform stats error:', error);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// ==================== KEYGROW PATHWAY ROUTES ====================

// Get market data for a ZIP code
router.get('/api/keygrow/market-data/:zipCode', async (req: Request, res: Response) => {
  try {
    const { zipCode } = req.params;
    
    // TODO: In production, integrate with real estate APIs (Zillow, RentSpree, etc.)
    // For now, return simulated data based on ZIP code
    const mockMarketData = {
      zipCode,
      averageHomePrice: 250000 + Math.random() * 300000, // $250k-$550k range
      averageRent: 1200 + Math.random() * 1500, // $1.2k-$2.7k range
      appreciationRate: 2 + Math.random() * 6, // 2-8% annual
      medianHouseholdIncome: 45000 + Math.random() * 60000,
      propertyTaxRate: 0.8 + Math.random() * 2, // 0.8-2.8%
      lastUpdated: new Date(),
      neighborhoods: [
        {
          name: 'Downtown',
          avgPrice: 350000 + Math.random() * 200000,
          walkScore: 70 + Math.random() * 30,
          crimeRate: 'Low'
        },
        {
          name: 'Suburbs',
          avgPrice: 300000 + Math.random() * 150000,
          walkScore: 40 + Math.random() * 30,
          crimeRate: 'Very Low'
        },
        {
          name: 'Family District',
          avgPrice: 320000 + Math.random() * 180000,
          walkScore: 55 + Math.random() * 25,
          crimeRate: 'Low'
        }
      ],
      marketTrends: {
        inventoryLevel: 'Moderate',
        timeOnMarket: 45 + Math.random() * 30, // Days
        competitiveness: 'Balanced'
      }
    };

    res.json({
      success: true,
      data: mockMarketData
    });
  } catch (error) {
    console.error('Market data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data'
    });
  }
});

// Calculate affordability based on user financial info
router.post('/api/keygrow/affordability', async (req: Request, res: Response) => {
  try {
    const {
      monthlyIncome,
      monthlyDebt,
      downPaymentPercent = 20,
      interestRate = 6.5,
      propertyTaxRate = 1.2,
      insuranceRate = 0.35
    } = req.body;

    if (!monthlyIncome) {
      return res.status(400).json({
        success: false,
        error: 'Monthly income is required'
      });
    }

    // Calculate maximum monthly payment (28% rule)
    const maxMonthlyPayment = monthlyIncome * 0.28;
    
    // Calculate DTI
    const debtToIncomeRatio = monthlyDebt ? (monthlyDebt / monthlyIncome) * 100 : 0;
    
    // Estimate property taxes and insurance
    const estimatedTaxesInsurance = maxMonthlyPayment * 0.25; // Rough estimate
    const maxPrincipalInterest = maxMonthlyPayment - estimatedTaxesInsurance;
    
    // Calculate maximum loan amount (simplified)
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 30 * 12;
    const maxLoanAmount = maxPrincipalInterest * 
      ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate);
    
    // Calculate maximum home price
    const maxHomePrice = maxLoanAmount / (1 - downPaymentPercent / 100);
    
    // Calculate down payment needed
    const downPaymentAmount = maxHomePrice * (downPaymentPercent / 100);
    
    // Calculate closing costs (estimate 3% of home price)
    const closingCosts = maxHomePrice * 0.03;
    
    const affordabilityData = {
      maxHomePrice: Math.round(maxHomePrice),
      maxMonthlyPayment: Math.round(maxMonthlyPayment),
      maxLoanAmount: Math.round(maxLoanAmount),
      downPaymentAmount: Math.round(downPaymentAmount),
      closingCosts: Math.round(closingCosts),
      totalCashNeeded: Math.round(downPaymentAmount + closingCosts),
      debtToIncomeRatio: debtToIncomeRatio.toFixed(1),
      recommendedDTI: debtToIncomeRatio <= 43 ? 'Good' : 'Needs Improvement',
      monthlyBreakdown: {
        principalInterest: Math.round(maxPrincipalInterest),
        taxes: Math.round(maxHomePrice * (propertyTaxRate / 100) / 12),
        insurance: Math.round(maxHomePrice * (insuranceRate / 100) / 12),
        pmi: downPaymentPercent < 20 ? Math.round(maxLoanAmount * 0.005 / 12) : 0
      }
    };

    res.json({
      success: true,
      data: affordabilityData
    });
  } catch (error) {
    console.error('Affordability calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate affordability'
    });
  }
});

// Save user's KeyGrow pathway progress
router.post('/api/keygrow/progress', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      step,
      readinessScore,
      targetHomePrice,
      targetLocation,
      monthlyContribution,
      selectedPathways,
      completedSteps,
      progressData
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // In a real implementation, this would use a dedicated KeyGrow progress table
    // For now, we'll use the contribution_plans table with property type
    const planData = {
      goalName: `KeyGrow - ${targetLocation || 'Homeownership'}`,
      targetAmount: targetHomePrice || 300000,
      monthlyContribution: monthlyContribution || 0,
      pathType: 'property',
      // Store additional data as JSON in a metadata field when available
    };

    // Check if user already has a property plan
    const [existingPlan] = await db
      .select()
      .from(contributionPlans)
      .where(eq(contributionPlans.userId, userId))
      .where(eq(contributionPlans.pathType, 'property'));

    let result;
    if (existingPlan) {
      // Update existing plan
      [result] = await db
        .update(contributionPlans)
        .set({
          targetAmount: planData.targetAmount,
          monthlyContribution: planData.monthlyContribution,
          updatedAt: new Date()
        })
        .where(eq(contributionPlans.id, existingPlan.id))
        .returning();
    } else {
      // Create new plan
      [result] = await db
        .insert(contributionPlans)
        .values({
          userId,
          ...planData
        })
        .returning();
    }

    res.json({
      success: true,
      data: {
        planId: result.id,
        message: 'KeyGrow progress saved successfully'
      }
    });
  } catch (error) {
    console.error('KeyGrow progress save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save progress'
    });
  }
});

// Get user's KeyGrow pathway progress
router.get('/api/keygrow/progress', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const [propertyPlan] = await db
      .select()
      .from(contributionPlans)
      .where(eq(contributionPlans.userId, userId))
      .where(eq(contributionPlans.pathType, 'property'));

    if (!propertyPlan) {
      return res.json({
        success: true,
        data: null,
        message: 'No KeyGrow progress found'
      });
    }

    res.json({
      success: true,
      data: {
        targetAmount: propertyPlan.targetAmount,
        currentAmount: propertyPlan.currentAmount,
        monthlyContribution: propertyPlan.monthlyContribution,
        status: propertyPlan.status,
        streakDays: propertyPlan.streakDays,
        expectedCompletionDate: propertyPlan.expectedCompletionDate,
        lastContributionAt: propertyPlan.lastContributionAt,
        createdAt: propertyPlan.createdAt,
        updatedAt: propertyPlan.updatedAt
      }
    });
  } catch (error) {
    console.error('KeyGrow progress fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress'
    });
  }
});

// Calculate readiness score
router.post('/api/keygrow/readiness-score', async (req: Request, res: Response) => {
  try {
    const {
      creditScore,
      monthlyIncome,
      monthlyDebt,
      emergencyFund,
      monthlyExpenses,
      savingsRate,
      hasStableEmployment,
      isFirstTimeBuyer
    } = req.body;

    let score = 0;
    const recommendations: string[] = [];
    const maxScore = 100;

    // Credit Score (30 points)
    if (creditScore) {
      if (creditScore >= 740) {
        score += 30;
      } else if (creditScore >= 670) {
        score += 25;
        recommendations.push("Consider improving credit score to 740+ for best mortgage rates");
      } else if (creditScore >= 580) {
        score += 15;
        recommendations.push("Focus on improving credit score - pay bills on time and reduce debt utilization");
      } else if (creditScore >= 500) {
        score += 10;
        recommendations.push("Credit improvement is essential - consider credit counseling services");
      } else {
        score += 5;
        recommendations.push("Work with a credit counselor to rebuild your credit foundation");
      }
    } else {
      recommendations.push("Check your credit score for free at annualcreditreport.com");
    }

    // Debt-to-Income Ratio (25 points)
    if (monthlyIncome && monthlyDebt) {
      const dti = (monthlyDebt / monthlyIncome) * 100;
      if (dti <= 28) {
        score += 25;
      } else if (dti <= 36) {
        score += 20;
        recommendations.push("Good DTI ratio - you're in a strong position for mortgage approval");
      } else if (dti <= 43) {
        score += 15;
        recommendations.push("Consider paying down debt to improve debt-to-income ratio");
      } else if (dti <= 50) {
        score += 10;
        recommendations.push("Focus on debt reduction before applying for a mortgage");
      } else {
        score += 5;
        recommendations.push("Significant debt reduction needed - consider debt consolidation options");
      }
    }

    // Emergency Fund (20 points)
    if (emergencyFund && monthlyExpenses) {
      const monthsOfExpenses = emergencyFund / monthlyExpenses;
      if (monthsOfExpenses >= 6) {
        score += 20;
      } else if (monthsOfExpenses >= 3) {
        score += 15;
        recommendations.push("Good emergency fund - consider building to 6 months of expenses");
      } else if (monthsOfExpenses >= 1) {
        score += 10;
        recommendations.push("Build emergency fund to at least 3 months of expenses before home purchase");
      } else {
        score += 5;
        recommendations.push("Emergency fund is critical - start with $1,000 then build to 3-6 months expenses");
      }
    }

    // Savings Rate (15 points)
    if (savingsRate) {
      if (savingsRate >= 20) {
        score += 15;
      } else if (savingsRate >= 15) {
        score += 12;
        recommendations.push("Excellent savings rate - you're building wealth effectively");
      } else if (savingsRate >= 10) {
        score += 10;
        recommendations.push("Good savings rate - consider increasing to 15-20% if possible");
      } else if (savingsRate >= 5) {
        score += 7;
        recommendations.push("Increase savings rate to at least 10% for stronger financial foundation");
      } else {
        score += 3;
        recommendations.push("Start with saving even $25-50 per month and gradually increase");
      }
    }

    // Employment Stability (10 points)
    if (hasStableEmployment) {
      score += 10;
    } else {
      recommendations.push("Lenders prefer 2+ years stable employment - document any job changes carefully");
    }

    // First-time buyer bonus insight
    if (isFirstTimeBuyer) {
      recommendations.push("Great! First-time buyer programs may offer down payment assistance and better rates");
    }

    // Overall assessment
    let assessment = '';
    if (score >= 80) {
      assessment = 'Excellent! You\'re ready to start your homeownership journey.';
    } else if (score >= 60) {
      assessment = 'Good progress! A few improvements will strengthen your position.';
    } else if (score >= 40) {
      assessment = 'On your way! Focus on the key areas below to improve readiness.';
    } else {
      assessment = 'Getting started! Follow the action plan to build toward homeownership.';
    }

    res.json({
      success: true,
      data: {
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
        assessment,
        recommendations,
        breakdown: {
          creditScore: creditScore ? Math.min(Math.floor(score * 0.3), 30) : 0,
          debtToIncome: monthlyIncome && monthlyDebt ? Math.min(Math.floor(score * 0.25), 25) : 0,
          emergencyFund: emergencyFund && monthlyExpenses ? Math.min(Math.floor(score * 0.2), 20) : 0,
          savingsRate: savingsRate ? Math.min(Math.floor(score * 0.15), 15) : 0,
          employment: hasStableEmployment ? 10 : 0
        }
      }
    });
  } catch (error) {
    console.error('Readiness score calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate readiness score'
    });
  }
});

// Get pre-qualification estimate
router.post('/api/keygrow/pre-qualification', async (req: Request, res: Response) => {
  try {
    const {
      creditScore,
      monthlyIncome,
      monthlyDebt,
      downPaymentAmount,
      loanType = 'conventional'
    } = req.body;

    if (!creditScore || !monthlyIncome) {
      return res.status(400).json({
        success: false,
        error: 'Credit score and monthly income are required'
      });
    }

    // Estimate qualification based on credit score and loan type
    let estimatedRate = 7.0; // Base rate
    let maxLoanAmount = 0;
    let qualification = 'Not Qualified';

    // Adjust rate based on credit score
    if (creditScore >= 740) estimatedRate = 6.2;
    else if (creditScore >= 680) estimatedRate = 6.5;
    else if (creditScore >= 620) estimatedRate = 7.0;
    else if (creditScore >= 580) estimatedRate = 7.5;
    else estimatedRate = 8.0;

    // Loan type adjustments
    const loanLimits = {
      conventional: { minCredit: 620, maxDTI: 43, minDown: 5 },
      fha: { minCredit: 580, maxDTI: 43, minDown: 3.5 },
      va: { minCredit: 620, maxDTI: 41, minDown: 0 },
      usda: { minCredit: 640, maxDTI: 41, minDown: 0 }
    };

    const limits = loanLimits[loanType as keyof typeof loanLimits] || loanLimits.conventional;
    
    // Calculate DTI
    const dti = monthlyDebt ? (monthlyDebt / monthlyIncome) * 100 : 0;
    
    // Check basic qualification
    if (creditScore >= limits.minCredit && dti <= limits.maxDTI) {
      // Calculate max loan amount
      const maxMonthlyPayment = monthlyIncome * 0.28;
      const monthlyRate = estimatedRate / 100 / 12;
      const numPayments = 30 * 12;
      
      maxLoanAmount = maxMonthlyPayment * 
        ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate);
      
      qualification = 'Likely Qualified';
      
      if (creditScore >= 740 && dti <= 28) {
        qualification = 'Excellent Qualification';
      } else if (creditScore >= 680 && dti <= 36) {
        qualification = 'Strong Qualification';
      }
    }

    const maxHomePrice = downPaymentAmount ? 
      maxLoanAmount + downPaymentAmount : 
      maxLoanAmount / (1 - limits.minDown / 100);

    res.json({
      success: true,
      data: {
        qualification,
        estimatedRate: estimatedRate.toFixed(2),
        maxLoanAmount: Math.round(maxLoanAmount),
        maxHomePrice: Math.round(maxHomePrice),
        monthlyPaymentEstimate: Math.round(maxLoanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -numPayments))),
        loanType,
        requirements: {
          minimumCreditScore: limits.minCredit,
          maximumDTI: limits.maxDTI,
          minimumDownPayment: limits.minDown
        },
        recommendations: qualification === 'Not Qualified' ? [
          creditScore < limits.minCredit ? 'Improve credit score for qualification' : '',
          dti > limits.maxDTI ? 'Reduce debt-to-income ratio' : '',
          'Consider FHA loan for lower credit requirements',
          'Explore first-time buyer programs'
        ].filter(Boolean) : [
          'Shop around with multiple lenders for best rates',
          'Get pre-approval letter before house hunting',
          'Consider making a larger down payment to reduce monthly costs'
        ]
      }
    });
  } catch (error) {
    console.error('Pre-qualification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate pre-qualification'
    });
  }
});

export default router;