export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: number;
  content: string;
  quiz: QuizQuestion[];
  passingScore: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface CertificationLevel {
  id: string;
  name: string;
  badge: string;
  color: string;
  requiredModules: string[];
  benefits: string[];
}

export const CERTIFICATION_LEVELS: CertificationLevel[] = [
  {
    id: 'foundation',
    name: 'Foundation Organizer',
    badge: '🎓',
    color: '#10b981',
    requiredModules: ['susu-basics', 'member-management'],
    benefits: [
      'Create Community Mode groups',
      'Manage up to 12 members',
      'Access to organizer dashboard'
    ]
  },
  {
    id: 'certified',
    name: 'Certified Organizer',
    badge: '⭐',
    color: '#eab308',
    requiredModules: ['susu-basics', 'member-management', 'conflict-resolution', 'financial-literacy'],
    benefits: [
      'Create Capital Mode groups',
      'Manage up to 25 members',
      'Priority support access',
      'Featured in organizer directory'
    ]
  },
  {
    id: 'master',
    name: 'Master Organizer',
    badge: '👑',
    color: '#f59e0b',
    requiredModules: ['susu-basics', 'member-management', 'conflict-resolution', 'financial-literacy', 'graduation-management', 'advanced-strategies'],
    benefits: [
      'Create unlimited groups',
      'Manage graduated investment pools',
      'Train other organizers',
      'Earn referral rewards',
      'VIP governance voting power'
    ]
  }
];

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'susu-basics',
    title: 'SUSU Fundamentals',
    description: 'Learn the history, principles, and mechanics of rotating savings groups.',
    duration: 20,
    content: `# SUSU Fundamentals

## What is SUSU?

SUSU (also known as ROSCA - Rotating Savings and Credit Association) is a centuries-old practice where a group of trusted individuals pool money together and take turns receiving the full pot.

### Historical Origins

SUSU practices originated in West Africa and the Caribbean, where communities developed ingenious ways to save and access capital without formal banking. The practice has spread globally, with variations found in:

- **Caribbean**: SUSU, Partner, Box Hand
- **Africa**: Tontines, Chit Funds
- **Asia**: Hui, Chit Funds, Arisan
- **Latin America**: Tandas, Cundinas

### How Traditional SUSU Works

1. A group of people agree to contribute a fixed amount regularly (weekly, monthly)
2. Each contribution period, one member receives the entire pot
3. The cycle continues until everyone has received the pot once
4. Trust and social bonds ensure participation

### Example: 10-Member Monthly SUSU

- 10 members, $100 each per month
- Monthly pot: $1,000
- Each member contributes $1,000 total over 10 months
- Each member receives $1,000 once

## Axiom's On-Chain SUSU

Axiom brings SUSU into the digital age with blockchain technology:

### Key Advantages

1. **Transparency**: All transactions visible on-chain
2. **Security**: Smart contracts enforce rules automatically
3. **Flexibility**: Digital payments, flexible scheduling
4. **Scale**: Connect with members beyond your local community
5. **Reputation**: On-chain history builds trust

### The Organizer's Role

As an organizer, you are the heart of your SUSU group. Your responsibilities include:

- Setting group parameters (contribution amount, frequency, size)
- Recruiting and vetting members
- Facilitating communication
- Managing payout order
- Resolving any issues that arise
- Ensuring group completion

## Trust Building

Trust is the foundation of every successful SUSU. As an organizer, you build trust by:

- Being transparent about all processes
- Communicating regularly and clearly
- Treating all members fairly
- Following through on commitments
- Addressing concerns promptly

## The Axiom Difference

Unlike traditional SUSU, Axiom provides:

- **Policy Guard**: Soft enforcement through deposits and reputation
- **Mode Progression**: Grow from Community to Capital Mode
- **Graduation Path**: Access larger investment opportunities
- **Support Network**: Training and assistance for organizers`,
    quiz: [
      {
        id: 1,
        question: 'What does SUSU/ROSCA stand for?',
        options: [
          'Rotating Savings and Credit Association',
          'Regular Savings Under Supervision',
          'Rotating Shares and Unified Accounts',
          'Registered Savings Union Cooperative'
        ],
        correctAnswer: 0
      },
      {
        id: 2,
        question: 'In a 10-member SUSU with $100 monthly contributions, what is the pot size?',
        options: ['$100', '$500', '$1,000', '$10,000'],
        correctAnswer: 2
      },
      {
        id: 3,
        question: 'What is the primary role of an organizer?',
        options: [
          'To profit from the group',
          'To facilitate, communicate, and ensure group success',
          'To decide who gets paid first',
          'To invest the pot money'
        ],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'What advantage does blockchain bring to SUSU?',
        options: [
          'Higher interest rates',
          'Transparency and automatic enforcement',
          'Faster payouts only',
          'Government protection'
        ],
        correctAnswer: 1
      },
      {
        id: 5,
        question: 'What is the foundation of every successful SUSU?',
        options: ['Large contributions', 'Trust', 'Speed', 'Profit'],
        correctAnswer: 1
      }
    ],
    passingScore: 80
  },
  {
    id: 'member-management',
    title: 'Member Management',
    description: 'Best practices for recruiting, vetting, and managing group members.',
    duration: 25,
    content: `# Member Management

## Recruiting the Right Members

The success of your SUSU depends on having reliable members. Quality over quantity.

### Where to Find Members

1. **Personal Network**: Friends, family, colleagues
2. **Community Groups**: Churches, associations, clubs
3. **Online Communities**: Social media, forums
4. **Referrals**: Ask current members to invite trusted contacts

### Screening Criteria

Before accepting a member, consider:

- **Reliability**: Do they have a history of keeping commitments?
- **Financial Stability**: Can they consistently make contributions?
- **Communication**: Are they responsive and clear?
- **References**: Can others vouch for them?
- **Motivation**: Why do they want to join?

### Red Flags to Watch

Be cautious of potential members who:

- Are evasive about their situation
- Have unrealistic expectations
- Pressure you to skip vetting
- Can't explain how they'll make payments
- Have negative references

## Setting Expectations

Clear expectations prevent problems. At the start, ensure every member understands:

### Contribution Requirements

- Exact amount due each period
- Payment methods accepted
- Deadline for each payment
- Consequences of late payment

### Payout Process

- How payout order is determined
- When payouts occur
- What happens if someone misses a payment
- Process for emergencies

### Communication Standards

- Primary communication channel
- Expected response times
- Meeting schedule (if any)
- How decisions are made

## Managing the Group

### Regular Communication

Keep members engaged:

- Weekly or bi-weekly check-ins
- Reminders before payment deadlines
- Celebration of payouts
- Updates on group progress

### Tracking Contributions

Maintain accurate records:

- Use Axiom's dashboard for on-chain tracking
- Send confirmation for each payment
- Provide regular summaries
- Be transparent about group finances

### Handling Late Payments

Have a clear process:

1. Send reminder before deadline
2. Reach out immediately if missed
3. Understand the situation
4. Apply grace period if warranted
5. Enforce policy if needed

### Building Community

SUSU is more than money:

- Celebrate member achievements
- Create bonding opportunities
- Share financial education
- Support each other's goals

## Scaling Your Group

As you gain experience:

- Start with smaller groups (5-8 members)
- Graduate to larger groups (10-15 members)
- Consider running multiple groups
- Mentor new organizers`,
    quiz: [
      {
        id: 1,
        question: 'What is the most important factor in member selection?',
        options: ['Wealth', 'Reliability', 'Speed', 'Location'],
        correctAnswer: 1
      },
      {
        id: 2,
        question: 'What is a red flag when vetting potential members?',
        options: [
          'They ask detailed questions',
          'They have references',
          'They pressure you to skip vetting',
          'They want to start small'
        ],
        correctAnswer: 2
      },
      {
        id: 3,
        question: 'How often should you communicate with your group?',
        options: ['Only when there is a problem', 'Weekly or bi-weekly', 'Once at the start', 'Never'],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'What is the first step when a member misses a payment?',
        options: [
          'Remove them immediately',
          'Send a reminder and reach out',
          'Take legal action',
          'Ignore it'
        ],
        correctAnswer: 1
      },
      {
        id: 5,
        question: 'What size group should new organizers start with?',
        options: ['25+ members', '15-20 members', '5-8 members', '50+ members'],
        correctAnswer: 2
      }
    ],
    passingScore: 80
  },
  {
    id: 'conflict-resolution',
    title: 'Conflict Resolution',
    description: 'Handle disputes, missed payments, and difficult situations professionally.',
    duration: 30,
    content: `# Conflict Resolution

## Understanding Conflicts

Conflicts are natural in any group setting. As an organizer, your ability to resolve conflicts fairly determines your group's success.

### Common SUSU Conflicts

1. **Payment Disputes**: Late payments, partial payments, or non-payment
2. **Payout Order**: Disagreements about who receives when
3. **Communication Issues**: Miscommunication or lack of response
4. **Expectation Mismatches**: Different understandings of rules
5. **Personal Conflicts**: Members who don't get along

## Prevention Strategies

The best conflict is one that never happens.

### Clear Documentation

- Written rules everyone signs
- Recorded agreements on-chain
- Regular written updates
- Decision documentation

### Proactive Communication

- Address small issues before they grow
- Check in with struggling members
- Create space for concerns
- Be available and responsive

### Fair Policies

- Apply rules consistently
- No favoritism
- Transparent decision-making
- Clear escalation paths

## Resolution Framework

When conflicts arise, follow this framework:

### Step 1: Listen

- Hear all parties without judgment
- Ask clarifying questions
- Acknowledge feelings
- Don't rush to solutions

### Step 2: Understand

- Identify the root cause
- Consider all perspectives
- Review relevant rules/agreements
- Gather facts objectively

### Step 3: Mediate

- Bring parties together (if appropriate)
- Facilitate calm discussion
- Focus on interests, not positions
- Look for common ground

### Step 4: Resolve

- Propose fair solutions
- Get agreement from all parties
- Document the resolution
- Follow up to ensure compliance

### Step 5: Learn

- What caused this conflict?
- Could it have been prevented?
- Should policies change?
- How can we do better?

## Handling Payment Issues

Payment problems are the most common conflict.

### Grace Period Policy

Recommended approach:
- 3-day grace period with reminder
- 7-day extension with written plan
- After 7 days: escalation to security deposit
- After 14 days: removal consideration

### Using Security Deposits

If your group uses AXM security deposits:
- Deposits cover missed payments first
- Member must replenish deposit
- Protects group from defaults
- Creates accountability

### When to Remove a Member

Remove a member if they:
- Consistently miss payments without communication
- Refuse to follow agreed rules
- Are hostile to other members
- Have exhausted all remedies

## Difficult Conversations

### Staying Professional

- Use "I" statements, not accusations
- Focus on behavior, not character
- Stay calm even if they don't
- Stick to facts

### De-escalation Techniques

- Take a break if needed
- Move to private conversation
- Acknowledge their perspective
- Find small agreements first

### Documenting Everything

- Keep written records
- Save all communications
- Note dates and times
- Have witnesses when possible

## Escalation Paths

When you can't resolve it alone:
1. Consult Axiom support resources
2. Involve a neutral third party
3. Use community mediation
4. Consider group vote on resolution`,
    quiz: [
      {
        id: 1,
        question: 'What is the first step in conflict resolution?',
        options: ['Make a decision', 'Listen to all parties', 'Remove the problem person', 'Ignore it'],
        correctAnswer: 1
      },
      {
        id: 2,
        question: 'How can you prevent conflicts?',
        options: [
          'Never have rules',
          'Clear documentation and proactive communication',
          'Only accept friends',
          'Remove all difficult members'
        ],
        correctAnswer: 1
      },
      {
        id: 3,
        question: 'What is a recommended grace period for late payments?',
        options: ['No grace period', '3-7 days', '30 days', '6 months'],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'What should you focus on during difficult conversations?',
        options: ['Character attacks', 'Behavior and facts', 'Past mistakes', 'Winning'],
        correctAnswer: 1
      },
      {
        id: 5,
        question: 'What is the purpose of security deposits?',
        options: [
          'To profit the organizer',
          'To cover missed payments and create accountability',
          'To remove members',
          'To earn interest'
        ],
        correctAnswer: 1
      }
    ],
    passingScore: 80
  },
  {
    id: 'financial-literacy',
    title: 'Financial Literacy for Organizers',
    description: 'Understand the financial aspects of running successful savings groups.',
    duration: 25,
    content: `# Financial Literacy for Organizers

## Group Economics

Understanding the economics of your SUSU makes you a better organizer.

### The SUSU Math

For a group with N members and contribution amount C:
- Monthly pot = N × C
- Total cycle = N × (N × C) = N² × C paid, N × C received per member
- Net effect: Everyone contributes and receives the same total amount

### Example: 10-Member, $200 Monthly

- Monthly pot: $2,000
- Total cycle length: 10 months
- Each member contributes: $2,000 total
- Each member receives: $2,000 once

### Time Value of Money

The order of payout matters:
- Early recipients get money sooner (access value)
- Later recipients effectively save with the group (discipline value)
- Neither is "better" - it depends on member needs

## Community vs Capital Mode

### Community Mode Thresholds

- Contributions up to $1,000
- Total pot under $10,000
- Focus: Building trust and habits
- Best for: New groups, first-time participants

### Capital Mode Thresholds

- Contributions $1,000+
- OR total pot $10,000+
- Focus: Larger wealth building
- Best for: Experienced groups, graduation pathway

### Choosing the Right Mode

Consider your members:
- Financial capacity
- Experience level
- Goals and timeline
- Risk tolerance

## Financial Best Practices

### Group Treasury Management

- Use smart contract escrow
- Never hold funds personally
- Transparent tracking always
- Regular reporting to members

### Setting Contribution Amounts

Find the sweet spot:
- Affordable for all members
- Meaningful enough to matter
- Consistent with group goals
- Sustainable over full cycle

### Managing Late Payments

Financial impact of defaults:
- Missing $200 in 10-person group = 10% shortfall
- Security deposits should cover at least 1.5x contribution
- Build buffer into timeline

## Helping Members Succeed

### Pre-Payout Planning

Help members plan for their payout:
- What will they use it for?
- Is it aligned with their goals?
- Do they have a spending plan?
- How will they continue contributing after receiving?

### Financial Education Resources

Share with your group:
- Budgeting basics
- Emergency fund importance
- Debt reduction strategies
- Investment fundamentals

### Goal Setting

Encourage members to set goals:
- What do they want to achieve?
- How does SUSU help them?
- What's their next step after?
- How can the group support them?

## Graduation Economics

### When to Consider Graduation

Your group may be ready for Capital Mode when:
- All members have completed at least one cycle
- Trust is established
- Members want larger opportunities
- Financial capacity has grown

### The Graduation Path

Community Mode → Capital Mode → Investment Pools

Each step brings:
- Larger contribution amounts
- Bigger pot sizes
- Access to Axiom investments
- Enhanced governance rights`,
    quiz: [
      {
        id: 1,
        question: 'In a 10-member SUSU, if each member contributes $200/month, what is the total pot?',
        options: ['$200', '$2,000', '$20,000', '$2'],
        correctAnswer: 1
      },
      {
        id: 2,
        question: 'What is the contribution threshold for Capital Mode?',
        options: ['$100', '$500', '$1,000+', '$10,000'],
        correctAnswer: 2
      },
      {
        id: 3,
        question: 'How should group funds be held?',
        options: [
          'In the organizer personal account',
          'In smart contract escrow',
          'In cash',
          'Split among members'
        ],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'What should security deposits cover?',
        options: ['50% of contribution', 'At least 1.5x contribution', '10% of contribution', 'Nothing'],
        correctAnswer: 1
      },
      {
        id: 5,
        question: 'What determines the "right" contribution amount?',
        options: [
          'The highest amount possible',
          'Affordable, meaningful, and sustainable for all members',
          'Whatever the organizer decides',
          'The minimum allowed'
        ],
        correctAnswer: 1
      }
    ],
    passingScore: 80
  },
  {
    id: 'graduation-management',
    title: 'Graduation Management',
    description: 'Lead your group through graduation to Capital Mode and investment opportunities.',
    duration: 30,
    content: `# Graduation Management

## Understanding Graduation

Graduation is the pathway from community savings to larger investment opportunities within the Axiom ecosystem.

### The Graduation Pathway

1. **Community Mode**: Build trust, learn SUSU mechanics
2. **Capital Mode**: Larger contributions, bigger goals
3. **Investment Pools**: Access real estate, DePIN, and other opportunities

### Why Graduate?

Benefits of graduation:
- Access to larger capital pools
- Real investment opportunities
- Enhanced governance voting power
- Recognition as experienced group
- Pathway to wealth building

## Graduation Requirements

### Basic Requirements

For your group to be graduation-ready:
- Minimum 5 active members
- All members have connected wallets
- All members have signed commitments
- At least 2 completed rotations
- Positive reputation scores

### Capital Mode Thresholds

To enter Capital Mode, you need ONE of:
- Average contribution $1,000+
- Total pot size $10,000+

### Advanced Requirements (Master Level)

For investment pool access:
- Completed graduation from Capital Mode
- All members KYC verified
- Group age 6+ months
- Clean payment history

## Preparing Your Group

### Member Readiness Assessment

Evaluate each member:
- Can they afford larger contributions?
- Are they committed long-term?
- Do they understand the opportunities?
- Are their wallets and credentials set up?

### Financial Preparation

Help members prepare:
- Review current contribution capacity
- Discuss target contribution levels
- Plan for the transition period
- Set realistic timelines

### Education and Alignment

Ensure everyone understands:
- What graduation means
- What opportunities await
- What's expected of them
- How decisions will be made

## The Graduation Process

### Step 1: Assess Readiness

Use the Graduation Dashboard:
- Check all requirements
- Review member status
- Identify gaps to address
- Set target graduation date

### Step 2: Member Buy-In

Get unanimous agreement:
- Hold group discussion
- Address concerns
- Vote on graduation
- Document decision

### Step 3: Meet Requirements

Close any gaps:
- Connect all wallets
- Complete all commitments
- Verify credentials
- Reach contribution thresholds

### Step 4: Execute Graduation

When ready:
- Click "Graduate to Capital Mode" button
- Transaction records on-chain
- Group status updates
- New opportunities unlock

### Step 5: Post-Graduation

Maintain momentum:
- Celebrate the achievement
- Set new group goals
- Explore investment options
- Continue regular operations

## Managing Capital Mode Groups

### Higher Stakes, Higher Standards

Capital Mode brings:
- Larger amounts at risk
- More sophisticated members
- Greater expectations
- Enhanced oversight

### Best Practices

- More frequent communication
- Stricter payment policies
- Detailed documentation
- Professional approach

### Investment Decisions

When opportunities arise:
- Present options to group
- Facilitate informed discussion
- Vote on participation
- Execute group decision

## Troubleshooting Graduation

### Common Obstacles

1. **Members not ready financially**: Slow down, focus on building capacity
2. **Wallets not connected**: Provide tech support, step-by-step guides
3. **Missing commitments**: Reach out individually, understand concerns
4. **Reputation issues**: Address past problems, rebuild trust

### When to Delay

It's okay to wait if:
- Members aren't genuinely ready
- Trust issues remain unresolved
- External circumstances are challenging
- The group needs more time to mature`,
    quiz: [
      {
        id: 1,
        question: 'What is the graduation pathway?',
        options: [
          'Capital Mode → Community Mode → Pools',
          'Community Mode → Capital Mode → Investment Pools',
          'Investment Pools → Capital Mode → Community',
          'Any order'
        ],
        correctAnswer: 1
      },
      {
        id: 2,
        question: 'What is one threshold for entering Capital Mode?',
        options: ['$100 contribution', '$10,000+ pot size', '2 members', '1 month age'],
        correctAnswer: 1
      },
      {
        id: 3,
        question: 'What is required before clicking the graduation button?',
        options: [
          'Organizer decision only',
          'Member buy-in and meeting all requirements',
          'Payment to Axiom',
          'Government approval'
        ],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'What should you do if some members are not ready financially?',
        options: [
          'Force them to keep up',
          'Remove them immediately',
          'Slow down and focus on building capacity',
          'Proceed without them'
        ],
        correctAnswer: 2
      },
      {
        id: 5,
        question: 'How should investment decisions be made in Capital Mode?',
        options: [
          'Organizer decides alone',
          'First member to respond decides',
          'Group discussion and vote',
          'Randomly'
        ],
        correctAnswer: 2
      }
    ],
    passingScore: 80
  },
  {
    id: 'advanced-strategies',
    title: 'Advanced Organizer Strategies',
    description: 'Master-level techniques for running multiple groups and maximizing impact.',
    duration: 35,
    content: `# Advanced Organizer Strategies

## Scaling Your Impact

As a Master Organizer, you can multiply your impact by running multiple groups and mentoring others.

### Running Multiple Groups

Start your second group when:
- First group is running smoothly
- You have time capacity
- You have a new member pipeline
- Systems are documented

### Group Portfolio Management

Organize your groups:
- Different contribution levels
- Different member profiles
- Staggered cycle timing
- Specialized purposes

### Time Management

Efficiency strategies:
- Batch similar tasks
- Use templates for communication
- Schedule regular check-in times
- Automate where possible

## Mentoring New Organizers

### Identifying Potential Organizers

Look for members who:
- Show leadership naturally
- Are reliable and trustworthy
- Ask good questions
- Help other members
- Express interest in organizing

### The Mentorship Process

1. **Invite**: Ask if they're interested
2. **Train**: Guide through certification
3. **Shadow**: Have them observe your group
4. **Co-lead**: Let them assist with your group
5. **Launch**: Support their first group
6. **Grow**: Continue mentorship relationship

### Building Your Network

Create a network of organizers:
- Regular organizer meetups
- Shared resources and templates
- Mutual support system
- Knowledge exchange

## Advanced Group Structures

### Specialty Groups

Create groups for specific purposes:
- Home purchase fund
- Business startup capital
- Education savings
- Emergency fund building

### Tiered Contributions

Progressive contribution structure:
- Entry level: $100-250
- Intermediate: $250-500
- Advanced: $500-1,000
- Capital: $1,000+

### Cross-Group Opportunities

Connect your groups:
- Referrals between groups
- Joint educational sessions
- Graduation celebrations
- Investment pool partnerships

## Leveraging Axiom Features

### Policy Guard Integration

Maximize security features:
- Require identity verification
- Implement security deposits
- Use reputation tracking
- Enforce commitment signatures

### Governance Participation

Lead your members in governance:
- Explain governance opportunities
- Facilitate group voting discussions
- Represent group interests
- Propose community improvements

### Staking and Rewards

Help members maximize benefits:
- AXM staking education
- Tier progression strategies
- Reward optimization
- Compounding benefits

## Building Sustainable Income

### Organizer Incentives

As a Master Organizer, you can earn:
- Referral rewards for new organizers
- Tips from grateful members (optional)
- Recognition and reputation
- Enhanced platform privileges

### Creating Value

Your value comes from:
- Successful group outcomes
- Member satisfaction
- Community building
- Mentorship impact

### Long-Term Vision

Think beyond single groups:
- Build a community movement
- Create lasting wealth impact
- Develop next-generation leaders
- Shape Axiom's future

## Handling Complex Situations

### Group Mergers

When to combine groups:
- Both groups are small and stable
- Members want larger opportunities
- Organizers agree on approach
- Cultures are compatible

### Group Splits

When to divide:
- Group has grown too large
- Subgroups have different goals
- Conflict requires separation
- Scaling into specialized groups

### Succession Planning

Prepare for your absence:
- Train co-organizers
- Document all processes
- Create transition plans
- Build redundancy

## Continuous Improvement

### Tracking Your Performance

Metrics to monitor:
- Completion rates
- Member satisfaction
- On-time payments
- Graduation success

### Learning from Experience

After each cycle:
- What went well?
- What could improve?
- What did members say?
- What will you change?

### Staying Current

Keep learning:
- Axiom updates and features
- Community best practices
- Financial education
- Leadership development`,
    quiz: [
      {
        id: 1,
        question: 'When should you start a second group?',
        options: [
          'Immediately after starting the first',
          'When first group is running smoothly and you have capacity',
          'Never',
          'When first group fails'
        ],
        correctAnswer: 1
      },
      {
        id: 2,
        question: 'What quality should you look for in potential organizer mentees?',
        options: ['Wealth', 'Shows leadership naturally and is reliable', 'Speed', 'Age'],
        correctAnswer: 1
      },
      {
        id: 3,
        question: 'What is a benefit of specialty groups?',
        options: [
          'More confusion',
          'Focused purpose aligns members',
          'Less participation',
          'More conflicts'
        ],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'What should you do after each cycle?',
        options: [
          'Forget about it',
          'Review what went well and what could improve',
          'Stop organizing',
          'Ignore member feedback'
        ],
        correctAnswer: 1
      },
      {
        id: 5,
        question: 'Why is succession planning important?',
        options: [
          'It is not important',
          'To prepare for your absence and ensure continuity',
          'To make more money',
          'To remove members'
        ],
        correctAnswer: 1
      }
    ],
    passingScore: 80
  }
];

export function getCertificationLevel(completedModules: string[]): CertificationLevel | null {
  const sortedLevels = [...CERTIFICATION_LEVELS].reverse();
  for (const level of sortedLevels) {
    const hasAll = level.requiredModules.every(m => completedModules.includes(m));
    if (hasAll) return level;
  }
  return null;
}

export function getNextCertification(completedModules: string[]): CertificationLevel | null {
  for (const level of CERTIFICATION_LEVELS) {
    const hasAll = level.requiredModules.every(m => completedModules.includes(m));
    if (!hasAll) return level;
  }
  return null;
}

export function getModuleProgress(completedModules: string[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = TRAINING_MODULES.length;
  const completed = completedModules.length;
  const percentage = Math.round((completed / total) * 100);
  return { completed, total, percentage };
}
