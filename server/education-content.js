/**
 * Educational Content Structure for SWF Wealth Building Platform
 * Culturally relevant, accessible content focused on African American community
 */

// Course Categories
export const courseCategories = [
  {
    id: 1,
    name: 'Financial Foundations',
    description: 'Master the fundamentals of money management and building wealth',
    icon: '💰',
    color: '#10B981',
    orderIndex: 1,
    isActive: true
  },
  {
    id: 2,
    name: 'Traditional Investing',
    description: 'Learn about stocks, bonds, retirement accounts, and building a portfolio',
    icon: '📈',
    color: '#3B82F6',
    orderIndex: 2,
    isActive: true
  },
  {
    id: 3,
    name: 'Digital Assets & DeFi',
    description: 'Understand cryptocurrency, DeFi protocols, and digital wealth building',
    icon: '💎',
    color: '#8B5CF6',
    orderIndex: 3,
    isActive: true
  },
  {
    id: 4,
    name: 'Real Estate & Property',
    description: 'Build wealth through real estate investment and property ownership',
    icon: '🏠',
    color: '#F59E0B',
    orderIndex: 4,
    isActive: true
  },
  {
    id: 5,
    name: 'Business & Entrepreneurship',
    description: 'Create income streams through business ownership and entrepreneurship',
    icon: '🚀',
    color: '#EF4444',
    orderIndex: 5,
    isActive: true
  },
  {
    id: 6,
    name: 'Community & Legacy',
    description: 'Building generational wealth and supporting community prosperity',
    icon: '👥',
    color: '#6366F1',
    orderIndex: 6,
    isActive: true
  }
];

// Comprehensive Course Curriculum
export const courses = [
  // FINANCIAL FOUNDATIONS
  {
    id: 1,
    categoryId: 1,
    title: 'Money Mindset & Financial Psychology',
    description: 'Overcome limiting beliefs and develop a wealth-building mindset',
    longDescription: 'Understanding how our relationship with money shapes our financial decisions. Learn to identify and overcome common mental barriers to wealth building.',
    thumbnail: '/images/courses/money-mindset.jpg',
    orderIndex: 1,
    estimatedHours: 2.5,
    difficultyLevel: 'beginner',
    prerequisites: [],
    tags: ['psychology', 'mindset', 'foundations', 'beginner'],
    isPublished: true,
    isFeatured: true
  },
  {
    id: 2,
    categoryId: 1,
    title: 'Budgeting & Cash Flow Management',
    description: 'Master your money flow and create a sustainable budgeting system',
    longDescription: 'Learn practical budgeting techniques that work for real life. Understand how to track income, manage expenses, and create positive cash flow.',
    thumbnail: '/images/courses/budgeting.jpg',
    orderIndex: 2,
    estimatedHours: 3.0,
    difficultyLevel: 'beginner',
    prerequisites: [1],
    tags: ['budgeting', 'cash-flow', 'management', 'practical'],
    isPublished: true,
    isFeatured: true
  },
  {
    id: 3,
    categoryId: 1,
    title: 'Emergency Fund & Financial Security',
    description: 'Build your financial foundation with proper emergency planning',
    longDescription: 'Learn why emergency funds are crucial and how to build one that fits your situation. Understand different types of financial security.',
    thumbnail: '/images/courses/emergency-fund.jpg',
    orderIndex: 3,
    estimatedHours: 2.0,
    difficultyLevel: 'beginner',
    prerequisites: [2],
    tags: ['emergency-fund', 'security', 'savings', 'planning'],
    isPublished: true,
    isFeatured: false
  },
  {
    id: 4,
    categoryId: 1,
    title: 'Debt Strategy & Credit Building',
    description: 'Transform debt from burden to tool and build excellent credit',
    longDescription: 'Learn strategic approaches to debt management, credit building, and using leverage responsibly for wealth building.',
    thumbnail: '/images/courses/debt-credit.jpg',
    orderIndex: 4,
    estimatedHours: 3.5,
    difficultyLevel: 'intermediate',
    prerequisites: [3],
    tags: ['debt', 'credit', 'strategy', 'leverage'],
    isPublished: true,
    isFeatured: false
  },

  // TRADITIONAL INVESTING
  {
    id: 5,
    categoryId: 2,
    title: 'Investment Fundamentals',
    description: 'Learn the basics of investing and building long-term wealth',
    longDescription: 'Understand different investment types, risk vs reward, compound interest, and the fundamentals of building a diversified portfolio.',
    thumbnail: '/images/courses/investment-basics.jpg',
    orderIndex: 1,
    estimatedHours: 4.0,
    difficultyLevel: 'beginner',
    prerequisites: [3],
    tags: ['investing', 'stocks', 'bonds', 'fundamentals'],
    isPublished: true,
    isFeatured: true
  },
  {
    id: 6,
    categoryId: 2,
    title: 'Stock Market Mastery',
    description: 'Deep dive into stock investing and market analysis',
    longDescription: 'Learn how to research stocks, understand financial statements, analyze market trends, and make informed investment decisions.',
    thumbnail: '/images/courses/stock-market.jpg',
    orderIndex: 2,
    estimatedHours: 5.0,
    difficultyLevel: 'intermediate',
    prerequisites: [5],
    tags: ['stocks', 'analysis', 'research', 'markets'],
    isPublished: true,
    isFeatured: true
  },
  {
    id: 7,
    categoryId: 2,
    title: 'Retirement Planning & 401(k) Optimization',
    description: 'Maximize your retirement accounts and plan for financial freedom',
    longDescription: 'Learn how to optimize 401(k), IRA, and other retirement accounts. Understand employer matching, tax strategies, and retirement planning.',
    thumbnail: '/images/courses/retirement.jpg',
    orderIndex: 3,
    estimatedHours: 3.5,
    difficultyLevel: 'intermediate',
    prerequisites: [5],
    tags: ['retirement', '401k', 'ira', 'tax-planning'],
    isPublished: true,
    isFeatured: false
  },

  // DIGITAL ASSETS & DEFI
  {
    id: 8,
    categoryId: 3,
    title: 'Cryptocurrency Basics',
    description: 'Understand Bitcoin, Ethereum, and the digital asset ecosystem',
    longDescription: 'Learn about blockchain technology, different cryptocurrencies, how to safely store and trade digital assets.',
    thumbnail: '/images/courses/crypto-basics.jpg',
    orderIndex: 1,
    estimatedHours: 3.0,
    difficultyLevel: 'beginner',
    prerequisites: [5],
    tags: ['cryptocurrency', 'bitcoin', 'ethereum', 'blockchain'],
    isPublished: true,
    isFeatured: true
  },
  {
    id: 9,
    categoryId: 3,
    title: 'DeFi Protocols & Yield Farming',
    description: 'Learn decentralized finance and how to earn yield on crypto assets',
    longDescription: 'Understand lending protocols, liquidity mining, staking, and other DeFi strategies to generate passive income.',
    thumbnail: '/images/courses/defi.jpg',
    orderIndex: 2,
    estimatedHours: 4.5,
    difficultyLevel: 'advanced',
    prerequisites: [8],
    tags: ['defi', 'yield-farming', 'protocols', 'passive-income'],
    isPublished: true,
    isFeatured: true
  },
  {
    id: 10,
    categoryId: 3,
    title: 'NFTs & Digital Ownership',
    description: 'Explore NFTs, digital art, and new forms of asset ownership',
    longDescription: 'Learn about non-fungible tokens, digital art markets, utility NFTs, and how digital ownership creates new wealth opportunities.',
    thumbnail: '/images/courses/nfts.jpg',
    orderIndex: 3,
    estimatedHours: 2.5,
    difficultyLevel: 'intermediate',
    prerequisites: [8],
    tags: ['nfts', 'digital-art', 'ownership', 'collectibles'],
    isPublished: true,
    isFeatured: false
  },

  // REAL ESTATE & PROPERTY
  {
    id: 11,
    categoryId: 4,
    title: 'Real Estate Investment Fundamentals',
    description: 'Learn the basics of property investment and real estate wealth building',
    longDescription: 'Understand different real estate investment strategies, market analysis, financing options, and how to get started in real estate.',
    thumbnail: '/images/courses/real-estate-basics.jpg',
    orderIndex: 1,
    estimatedHours: 4.0,
    difficultyLevel: 'intermediate',
    prerequisites: [4],
    tags: ['real-estate', 'property', 'investment', 'financing'],
    isPublished: true,
    isFeatured: true
  },
  {
    id: 12,
    categoryId: 4,
    title: 'Rental Property & Cash Flow',
    description: 'Generate passive income through rental property investment',
    longDescription: 'Learn how to analyze rental properties, calculate cash flow, manage tenants, and build a rental portfolio.',
    thumbnail: '/images/courses/rental-property.jpg',
    orderIndex: 2,
    estimatedHours: 5.0,
    difficultyLevel: 'intermediate',
    prerequisites: [11],
    tags: ['rental-property', 'cash-flow', 'passive-income', 'property-management'],
    isPublished: true,
    isFeatured: false
  },
  {
    id: 13,
    categoryId: 4,
    title: 'Real Estate Tokenization & REITs',
    description: 'Modern approaches to real estate investing through tokenization',
    longDescription: 'Understand REITs, crowdfunded real estate, and blockchain-based property tokenization for accessible real estate investment.',
    thumbnail: '/images/courses/real-estate-tokens.jpg',
    orderIndex: 3,
    estimatedHours: 3.0,
    difficultyLevel: 'advanced',
    prerequisites: [11, 8],
    tags: ['tokenization', 'reits', 'crowdfunding', 'blockchain'],
    isPublished: true,
    isFeatured: true
  }
];

// Course Modules Structure
export const courseModules = [
  // Money Mindset & Financial Psychology (Course 1)
  {
    id: 1,
    courseId: 1,
    title: 'Understanding Your Money Story',
    description: 'Explore how your background shapes your financial beliefs',
    orderIndex: 1,
    isOptional: false
  },
  {
    id: 2,
    courseId: 1,
    title: 'Breaking Limiting Beliefs',
    description: 'Identify and overcome mental barriers to wealth',
    orderIndex: 2,
    isOptional: false
  },
  {
    id: 3,
    courseId: 1,
    title: 'Developing a Wealth Mindset',
    description: 'Cultivate attitudes that support financial growth',
    orderIndex: 3,
    isOptional: false
  },

  // Budgeting & Cash Flow Management (Course 2)
  {
    id: 4,
    courseId: 2,
    title: 'Tracking Your Money Flow',
    description: 'Learn to monitor income and expenses effectively',
    orderIndex: 1,
    isOptional: false
  },
  {
    id: 5,
    courseId: 2,
    title: 'Creating Your Budget System',
    description: 'Build a personalized budgeting approach',
    orderIndex: 2,
    isOptional: false
  },
  {
    id: 6,
    courseId: 2,
    title: 'Automating Your Finances',
    description: 'Set up systems for consistent financial management',
    orderIndex: 3,
    isOptional: false
  }
];

// Enhanced Lessons with Culturally Relevant Content
export const enhancedLessons = [
  // Money Mindset Course - Module 1: Understanding Your Money Story
  {
    id: 1,
    moduleId: 1,
    title: 'The Historical Context of Black Wealth in America',
    description: 'Understanding how historical policies affected wealth building in Black communities',
    content: `
# The Historical Context of Black Wealth in America

## Understanding Our Starting Point

Building wealth isn't just about personal choices—it's about understanding the broader context that shapes our financial reality. For African Americans, this context includes unique historical challenges that have impacted wealth accumulation across generations.

### Key Historical Factors

**Homeownership Barriers**
- Redlining practices prevented Black families from buying homes in appreciating neighborhoods
- FHA loans were largely unavailable to Black families until the 1960s
- Home equity represents 70% of typical American family wealth

**Educational Access**
- Restricted access to quality education limited earning potential
- Professional schools and unions often excluded Black Americans
- Educational gaps compound over generations

**Business and Entrepreneurship**
- Limited access to business loans and capital
- Segregation created both opportunities (Black business districts) and limitations (restricted customer base)
- Urban renewal often destroyed thriving Black business communities

### Why This Matters Today

Understanding this history helps us:
- Realize wealth gaps aren't due to personal failings
- Appreciate the need for intentional wealth-building strategies
- Connect with community-focused approaches to financial growth
- Understand why traditional financial advice may not fully apply

### Moving Forward with Awareness

While we can't change the past, we can:
- Make informed decisions about wealth-building strategies
- Support Black-owned businesses and communities
- Pass financial knowledge to the next generation
- Build wealth through both traditional and innovative approaches

## Reflection Questions

1. How has your family's financial story been shaped by broader historical factors?
2. What wealth-building opportunities exist today that previous generations didn't have?
3. How can you contribute to building wealth in your community?

## Key Takeaway

Understanding our collective financial history empowers us to make strategic choices for building wealth today and for future generations.
    `,
    contentType: 'markdown',
    videoUrl: null,
    audioUrl: null,
    orderIndex: 1,
    estimatedMinutes: 15,
    hasQuiz: true,
    isRequired: true,
    passScore: 70,
    maxAttempts: 3,
    tags: ['history', 'context', 'community', 'awareness'],
    isPublished: true
  },
  {
    id: 2,
    moduleId: 1,
    title: 'Your Personal Money Story',
    description: 'Examining how your upbringing shapes your financial decisions',
    content: `
# Your Personal Money Story

## Everyone Has a Money Story

Your relationship with money was shaped long before you earned your first dollar. Understanding your personal money story helps you make more intentional financial decisions.

### Common Money Messages in Black Families

**Scarcity-Based Messages**
- "Money doesn't grow on trees"
- "Rich people are greedy"
- "You have to work twice as hard to get half as much"

**Security-Focused Messages**
- "Save every penny"
- "Don't put all your eggs in one basket"
- "Get a good government job with benefits"

**Community-Oriented Messages**
- "Family comes first"
- "Help others when you can"
- "Don't forget where you came from"

### Identifying Your Money Messages

Think about what you heard growing up:
- What did your family say about money?
- How did your parents handle financial stress?
- What were you taught about rich people?
- How was generosity and helping others discussed?

### Adaptive vs. Limiting Beliefs

**Adaptive Beliefs (Keep These)**
- Hard work leads to rewards
- Education and skills matter
- Community support is valuable
- Financial responsibility is important

**Limiting Beliefs (Question These)**
- "Investing is too risky for people like us"
- "You need money to make money"
- "Financial success means abandoning your community"
- "Money is the root of all evil"

### Rewriting Your Money Story

You can honor your background while adopting beliefs that support wealth building:

**Old:** "Investing is gambling"
**New:** "Informed investing is a tool for building generational wealth"

**Old:** "Money changes people"
**New:** "Money amplifies your character and expands your ability to help others"

**Old:** "I'm not good with money"
**New:** "I'm learning to master money so it can work for me"

## Exercise: Your Money Story Map

1. **Past:** What money messages did you receive growing up?
2. **Present:** How do these messages affect your current financial decisions?
3. **Future:** What new beliefs would serve your wealth-building goals?

## Key Takeaway

Your money story was written by others, but you have the power to edit it. Keep the wisdom, release the limitations, and write a new chapter focused on building wealth for yourself and your community.
    `,
    contentType: 'markdown',
    videoUrl: null,
    audioUrl: null,
    orderIndex: 2,
    estimatedMinutes: 20,
    hasQuiz: true,
    isRequired: true,
    passScore: 70,
    maxAttempts: 3,
    tags: ['personal', 'beliefs', 'mindset', 'reflection'],
    isPublished: true
  },
  {
    id: 3,
    moduleId: 1,
    title: 'The Psychology of Financial Decision Making',
    description: 'How emotions and cognitive biases affect our money choices',
    content: `
# The Psychology of Financial Decision Making

## Your Brain on Money

Making smart financial decisions isn't just about knowing the facts—it's about understanding how your brain processes financial information and why you make certain choices.

### Common Cognitive Biases That Affect Financial Decisions

**Loss Aversion**
- We feel losses twice as strongly as equivalent gains
- This makes us overly conservative with investing
- Example: Keeping money in low-yield savings to avoid investment "risk"

**Present Bias**
- We value immediate rewards over future benefits
- Makes it hard to save for long-term goals
- Example: Spending tax refund instead of investing it

**Confirmation Bias**
- We seek information that confirms our existing beliefs
- Can prevent us from learning new financial strategies
- Example: Only reading news that supports your investment choices

**Social Proof**
- We make decisions based on what others around us are doing
- Can lead to following crowd instead of personal financial goals
- Example: Lifestyle inflation because "everyone else is doing it"

### Cultural Factors in Financial Psychology

**Collective vs. Individual Focus**
- Strong family/community ties can create tension between personal wealth building and helping others
- Balance: Build your foundation first so you can help more effectively

**Risk Perception**
- Historical experiences may make certain investments seem riskier
- Solution: Education and gradual exposure to different investment types

**Success Guilt**
- Feeling guilty about financial success or "leaving others behind"
- Reframe: Your success creates opportunities to lift others up

### Strategies for Better Financial Decision Making

**1. Pause Before Major Financial Decisions**
- Take 24 hours to think about purchases over $500
- Ask: "Does this align with my wealth-building goals?"

**2. Automate Good Decisions**
- Set up automatic transfers to savings and investments
- Remove the emotional component from routine financial tasks

**3. Use the 10-10-10 Rule**
- How will I feel about this decision in 10 minutes, 10 months, and 10 years?
- Helps balance short-term desires with long-term goals

**4. Create Implementation Intentions**
- "If X happens, then I will do Y"
- Example: "If I get a bonus, then I will invest 50% of it"

### Building Financial Confidence

**Start Small**
- Make small, successful financial decisions to build confidence
- Success breeds more success

**Track Your Wins**
- Keep a record of smart financial choices you've made
- Review during moments of doubt

**Learn from Others**
- Study successful investors and entrepreneurs who share your background
- Proof that wealth building is possible for people like you

## Practical Exercise: Decision Framework

Before your next financial decision, ask:
1. What emotions am I feeling about this choice?
2. What biases might be influencing me?
3. How does this support my long-term wealth goals?
4. What would my future self want me to do?

## Key Takeaway

Understanding the psychology behind financial decisions empowers you to make choices based on logic and long-term goals rather than emotions and impulses.
    `,
    contentType: 'markdown',
    videoUrl: null,
    audioUrl: null,
    orderIndex: 3,
    estimatedMinutes: 18,
    hasQuiz: true,
    isRequired: true,
    passScore: 70,
    maxAttempts: 3,
    tags: ['psychology', 'decision-making', 'biases', 'strategy'],
    isPublished: true
  }
];

// Sample Quiz Questions
export const quizQuestions = [
  // Lesson 1: Historical Context Quiz
  {
    id: 1,
    lessonId: 1,
    questionText: 'Which practice historically prevented many Black families from accessing homeownership and building wealth through real estate?',
    questionType: 'multiple_choice',
    options: ['Redlining', 'Credit checks', 'Property taxes', 'Mortgage rates'],
    correctAnswers: ['Redlining'],
    explanation: 'Redlining was a discriminatory practice where banks and insurance companies would refuse loans or charge higher rates in predominantly Black neighborhoods, preventing wealth building through homeownership.',
    points: 1,
    orderIndex: 1,
    isActive: true
  },
  {
    id: 2,
    lessonId: 1,
    questionText: 'What percentage of typical American family wealth comes from home equity?',
    questionType: 'multiple_choice',
    options: ['40%', '55%', '70%', '85%'],
    correctAnswers: ['70%'],
    explanation: 'Home equity represents approximately 70% of typical American family wealth, which is why historical barriers to homeownership had such a significant impact on wealth accumulation.',
    points: 1,
    orderIndex: 2,
    isActive: true
  },
  {
    id: 3,
    lessonId: 1,
    questionText: 'True or False: Understanding historical context helps us realize that wealth gaps are not due to personal failings.',
    questionType: 'true_false',
    options: ['True', 'False'],
    correctAnswers: ['True'],
    explanation: 'Understanding historical policies and barriers helps us recognize that current wealth gaps are largely the result of systemic factors rather than individual choices or capabilities.',
    points: 1,
    orderIndex: 3,
    isActive: true
  },

  // Lesson 2: Personal Money Story Quiz
  {
    id: 4,
    lessonId: 2,
    questionText: 'Which is an example of an adaptive (helpful) money belief?',
    questionType: 'multiple_choice',
    options: [
      'Investing is gambling',
      'You need money to make money',
      'Hard work leads to rewards',
      'Money is the root of all evil'
    ],
    correctAnswers: ['Hard work leads to rewards'],
    explanation: 'The belief that hard work leads to rewards is adaptive because it encourages effort and skill development, which are important for wealth building.',
    points: 1,
    orderIndex: 1,
    isActive: true
  },
  {
    id: 5,
    lessonId: 2,
    questionText: 'What is a better reframe for the limiting belief "Investing is gambling"?',
    questionType: 'multiple_choice',
    options: [
      'Only invest what you can afford to lose',
      'Informed investing is a tool for building generational wealth',
      'Rich people can afford to gamble',
      'Stick to savings accounts only'
    ],
    correctAnswers: ['Informed investing is a tool for building generational wealth'],
    explanation: 'This reframe emphasizes that informed investing (not blind speculation) is a legitimate tool for building wealth over time, especially for future generations.',
    points: 1,
    orderIndex: 2,
    isActive: true
  }
];

// Achievement Definitions
export const achievementDefinitions = [
  {
    id: 1,
    name: 'First Steps',
    description: 'Complete your first lesson',
    achievementType: 'course_complete',
    criteria: { lessonsCompleted: 1 },
    points: 10,
    badgeIcon: '🎯',
    badgeColor: '#10B981',
    rarity: 'common',
    isActive: true
  },
  {
    id: 2,
    name: 'Knowledge Seeker',
    description: 'Complete 5 lessons',
    achievementType: 'course_complete',
    criteria: { lessonsCompleted: 5 },
    points: 25,
    badgeIcon: '📚',
    badgeColor: '#3B82F6',
    rarity: 'common',
    isActive: true
  },
  {
    id: 3,
    name: 'Learning Streak',
    description: 'Study for 7 days in a row',
    achievementType: 'streak',
    criteria: { streakDays: 7 },
    points: 50,
    badgeIcon: '🔥',
    badgeColor: '#F59E0B',
    rarity: 'rare',
    isActive: true
  },
  {
    id: 4,
    name: 'Course Master',
    description: 'Complete your first full course',
    achievementType: 'course_complete',
    criteria: { coursesCompleted: 1 },
    points: 100,
    badgeIcon: '🏆',
    badgeColor: '#EF4444',
    rarity: 'epic',
    isActive: true
  },
  {
    id: 5,
    name: 'Quiz Champion',
    description: 'Score 100% on 3 quizzes in a row',
    achievementType: 'assessment',
    criteria: { perfectQuizStreak: 3 },
    points: 75,
    badgeIcon: '⭐',
    badgeColor: '#8B5CF6',
    rarity: 'rare',
    isActive: true
  },
  {
    id: 6,
    name: 'Community Builder',
    description: 'Share a course completion on social media',
    achievementType: 'engagement',
    criteria: { socialShares: 1 },
    points: 30,
    badgeIcon: '🌟',
    badgeColor: '#6366F1',
    rarity: 'uncommon',
    isActive: true
  }
];

// Learning Paths
export const learningPaths = [
  {
    id: 1,
    title: 'Complete Beginner to Wealth Builder',
    description: 'Start from zero and build comprehensive wealth-building knowledge',
    pathType: 'beginner',
    targetAudience: 'People new to investing and wealth building',
    estimatedWeeks: 12,
    difficultyLevel: 'beginner',
    courseOrder: [1, 2, 3, 4, 5, 6, 7],
    prerequisites: [],
    outcomes: [
      'Master personal finance fundamentals',
      'Understand different investment options',
      'Create a personalized wealth-building plan',
      'Build confidence in financial decision making'
    ],
    icon: '🌱',
    color: '#10B981',
    isPublished: true,
    isFeatured: true
  },
  {
    id: 2,
    title: 'Digital Wealth Pioneer',
    description: 'Explore cryptocurrency and DeFi opportunities',
    pathType: 'crypto-defi',
    targetAudience: 'People interested in digital assets and modern investing',
    estimatedWeeks: 8,
    difficultyLevel: 'intermediate',
    courseOrder: [5, 8, 9, 10],
    prerequisites: [],
    outcomes: [
      'Understand cryptocurrency fundamentals',
      'Learn DeFi protocols and strategies',
      'Explore NFTs and digital ownership',
      'Build a diversified digital asset portfolio'
    ],
    icon: '💎',
    color: '#8B5CF6',
    isPublished: true,
    isFeatured: true
  },
  {
    id: 3,
    title: 'Property Wealth Builder',
    description: 'Build wealth through real estate and property investment',
    pathType: 'real-estate',
    targetAudience: 'People interested in property investment and passive income',
    estimatedWeeks: 10,
    difficultyLevel: 'intermediate',
    courseOrder: [1, 2, 4, 11, 12, 13],
    prerequisites: [],
    outcomes: [
      'Master real estate investment fundamentals',
      'Learn rental property strategies',
      'Understand modern property tokenization',
      'Create multiple real estate income streams'
    ],
    icon: '🏠',
    color: '#F59E0B',
    isPublished: true,
    isFeatured: true
  }
];

// Export all educational content
export const educationalContent = {
  courseCategories,
  courses,
  courseModules,
  enhancedLessons,
  quizQuestions,
  achievementDefinitions,
  learningPaths
};

export default educationalContent;