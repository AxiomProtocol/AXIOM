export interface Lesson {
  id: number;
  title: string;
  duration: number;
  content: string;
  keyTakeaways?: string[];
}

export interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  durationMinutes: number;
  lessons: Lesson[];
  requiredTier: string;
  isFeatured: boolean;
}

export const COURSES_DATA: Course[] = [
  {
    id: 1,
    slug: 'smart-city-101',
    title: 'Smart City 101',
    description: 'Understand the fundamentals of smart city technology, infrastructure, and how blockchain enables transparent governance.',
    category: 'Smart City',
    difficulty: 'beginner',
    durationMinutes: 45,
    requiredTier: 'free',
    isFeatured: true,
    lessons: [
      {
        id: 1,
        title: 'What is a Smart City?',
        duration: 8,
        content: `A smart city uses digital technology and data to improve the quality of life for its residents. Unlike traditional cities that rely on manual processes and outdated infrastructure, smart cities leverage sensors, connectivity, and intelligent systems to make everything work better.

## The Core Components

Smart cities are built on several key pillars:

- **Connected Infrastructure**: Roads, utilities, and buildings that communicate with each other
- **Data-Driven Decisions**: Using real-time information to optimize city services
- **Citizen Engagement**: Digital platforms that give residents a voice in governance
- **Sustainable Systems**: Technology that reduces waste and environmental impact

## Real-World Examples

Cities around the world are already implementing smart city technology:

1. Singapore uses sensors to monitor everything from traffic to air quality
2. Barcelona has smart street lights that dim when no one is around
3. Seoul offers city services through a single mobile app
4. Dubai aims to conduct all government transactions digitally

## Why Blockchain Matters

Traditional smart cities have a problem: who controls all that data? Blockchain technology provides a solution by creating transparent, tamper-proof records that no single entity controls. This means residents can trust that their city is operating fairly and efficiently.

> "A truly smart city isn't just about technology—it's about using technology to empower citizens."`,
        keyTakeaways: [
          'Smart cities use technology to improve quality of life',
          'Key components include connectivity, data, engagement, and sustainability',
          'Blockchain adds transparency and trust to smart city systems',
          'Citizens benefit from better services and more participation'
        ]
      },
      {
        id: 2,
        title: 'The Technology Behind Smart Cities',
        duration: 10,
        content: `Understanding smart city technology doesn't require an engineering degree. Let's break down the key technologies in simple terms.

## Internet of Things (IoT)

IoT refers to everyday objects connected to the internet. In a smart city, this includes:

- Traffic lights that detect how many cars are waiting
- Trash cans that signal when they need emptying
- Parking meters that show available spots in an app
- Water pipes that detect leaks before they become floods

## Data Analytics

All those connected devices generate enormous amounts of data. Smart cities use analytics to:

1. Predict when roads need maintenance
2. Optimize public transit schedules
3. Identify crime patterns before they escalate
4. Manage energy use across the grid

## Artificial Intelligence

AI takes data analytics further by learning patterns and making decisions:

- Traffic systems that adapt in real-time to reduce congestion
- Chatbots that answer citizen questions 24/7
- Predictive models for emergency response
- Automated systems for permit processing

## Blockchain and Distributed Ledgers

Blockchain provides the trust layer that makes smart cities work:

- **Transparent voting**: Everyone can verify election results
- **Immutable records**: Property deeds and permits can't be altered
- **Smart contracts**: Agreements execute automatically
- **Token economies**: Citizens earn rewards for participation`,
        keyTakeaways: [
          'IoT connects everyday objects to create a sensing network',
          'Data analytics turns raw information into actionable insights',
          'AI enables systems to learn and adapt automatically',
          'Blockchain provides transparency and eliminates the need for trusted intermediaries'
        ]
      },
      {
        id: 3,
        title: 'Governance in the Digital Age',
        duration: 8,
        content: `Traditional city governance is slow, opaque, and often frustrating. Smart city governance flips this model by making everything transparent and participatory.

## The Old Way vs. The New Way

Traditional governance:
- Decisions made behind closed doors
- Months-long approval processes
- Paper-based records that get lost
- Limited citizen input (maybe a town hall meeting)

Smart city governance:
- Every decision recorded on a public blockchain
- Automated approval through smart contracts
- Permanent, searchable digital records
- Continuous citizen participation through digital platforms

## Decentralized Autonomous Organizations (DAOs)

A DAO is a new form of organization where:

1. Rules are encoded in smart contracts
2. Token holders vote on decisions
3. Treasury is managed transparently
4. No single person has ultimate control

## How Citizens Participate

In a blockchain-based smart city, citizens can:

- Vote on budget allocations with their governance tokens
- Propose improvements and rally support
- Track exactly how tax dollars are spent
- Earn rewards for community contributions

## Transparency Creates Trust

When every transaction, vote, and decision is recorded on an immutable blockchain, corruption becomes nearly impossible. This transparency builds trust between citizens and their government.

> "The best government is one where citizens can verify everything themselves."`,
        keyTakeaways: [
          'Smart city governance is transparent and participatory',
          'DAOs provide a new model for community decision-making',
          'Citizens can actively participate through voting and proposals',
          'Blockchain transparency builds trust and reduces corruption'
        ]
      },
      {
        id: 4,
        title: 'Sustainable Infrastructure',
        duration: 7,
        content: `Smart cities aren't just about convenience—they're about building a sustainable future. Technology enables cities to dramatically reduce their environmental impact.

## Energy Management

Smart grids optimize electricity distribution:

- Solar panels on buildings feed excess power back to the grid
- AI predicts demand and adjusts supply
- Electric vehicle charging happens during off-peak hours
- Buildings automatically adjust heating and cooling

## Water Conservation

Every drop counts in a smart city:

1. Sensors detect leaks in underground pipes
2. Smart irrigation waters parks only when needed
3. Recycled water is tracked and reused safely
4. Real-time monitoring prevents contamination

## Waste Reduction

Smart waste management minimizes landfill use:

- Smart bins signal when full, optimizing collection routes
- Recycling is tracked and rewarded
- Composting programs process organic waste locally
- Circular economy principles reduce consumption

## Carbon Tracking

Blockchain enables precise carbon accounting:

- Every building's emissions are recorded
- Carbon credits are tokenized and traded
- Residents can offset their footprint
- Sustainability achievements are verifiable

## The Financial Benefits

Sustainability isn't just good for the planet—it saves money:

- Reduced energy costs through efficiency
- Lower maintenance through predictive systems
- Healthier residents mean lower healthcare costs
- Attractive to businesses and new residents`,
        keyTakeaways: [
          'Smart grids optimize energy use and enable renewable integration',
          'Water and waste systems become dramatically more efficient',
          'Blockchain enables transparent carbon tracking and trading',
          'Sustainability improvements create financial benefits'
        ]
      },
      {
        id: 5,
        title: 'The Axiom Vision',
        duration: 7,
        content: `Axiom represents the next evolution of smart city development: a fully on-chain sovereign city economy built from the ground up.

## What Makes Axiom Different

Unlike retrofitting technology onto existing cities, Axiom is designed digital-first:

- **Native blockchain integration**: Every transaction, from paying utilities to voting, happens on-chain
- **Token-based economy**: The AXM token powers all city services
- **Community ownership**: Residents are stakeholders, not just inhabitants
- **DePIN infrastructure**: Physical infrastructure managed by decentralized networks

## The Axiom Ecosystem

Axiom includes everything needed for a complete city economy:

1. **National Bank of Axiom**: Full-service digital banking
2. **KeyGrow**: Rent-to-own housing that builds real equity
3. **SUSU**: Community savings circles powered by smart contracts
4. **DePIN Nodes**: Decentralized infrastructure anyone can participate in
5. **Governance**: Token-weighted voting on all major decisions

## From Concept to Reality

Axiom isn't just a whitepaper—it's a real project with:

- 24 deployed smart contracts on Arbitrum
- Working applications you can use today
- A growing community of participants
- A clear roadmap to physical development

## Your Role in Axiom

Whether you become a token holder, node operator, or future resident, you have a stake in Axiom's success. The more the community grows, the more value everyone shares.

> "Axiom is building the city of tomorrow, today."`,
        keyTakeaways: [
          'Axiom is designed as a native blockchain city, not a retrofit',
          'The ecosystem includes banking, housing, savings, and infrastructure',
          'Real smart contracts are already deployed and functional',
          'Community members are stakeholders in the city\'s success'
        ]
      },
      {
        id: 6,
        title: 'Getting Started with Axiom',
        duration: 5,
        content: `Ready to participate in the future of smart cities? Here's how to get started with Axiom today.

## Step 1: Connect Your Wallet

To interact with Axiom, you'll need a Web3 wallet:

1. Install MetaMask or another compatible wallet
2. Add the Arbitrum One network
3. Connect to axiomprotocol.io
4. Your wallet is now your identity

## Step 2: Explore the Ecosystem

Take time to understand what Axiom offers:

- Browse the KeyGrow properties
- Learn about SUSU savings circles
- Check out the DePIN node marketplace
- Review governance proposals

## Step 3: Start Small

You don't need to invest thousands to participate:

- Join a SUSU pool with a small contribution
- Use the Equity Calculator to plan your path
- Vote on governance proposals (even with small holdings)
- Complete Academy courses to earn certificates

## Step 4: Engage with the Community

Axiom is community-driven:

- Join the Discord for discussions
- Follow updates on social media
- Attend virtual town halls
- Share your ideas for improvement

## Step 5: Grow Your Participation

As you learn more, deepen your involvement:

- Consider running a DePIN node
- Explore KeyGrow for homeownership
- Participate in governance more actively
- Invite others to join

## Resources

- Whitepaper: Full technical documentation
- Academy: Continue your learning journey
- Support: Get help when you need it
- Community: Connect with other participants`,
        keyTakeaways: [
          'Getting started requires only a Web3 wallet',
          'Explore the ecosystem before committing resources',
          'Start with small, low-risk participation',
          'Community engagement is key to the Axiom experience'
        ]
      }
    ]
  },
  {
    id: 2,
    slug: 'keygrow-rent-to-own',
    title: 'KeyGrow: Path to Homeownership',
    description: 'Learn how rent-to-own works, how equity builds with each payment, and strategies to accelerate your path to ownership.',
    category: 'Real Estate',
    difficulty: 'beginner',
    durationMinutes: 60,
    requiredTier: 'free',
    isFeatured: true,
    lessons: [
      {
        id: 1,
        title: 'The Homeownership Challenge',
        duration: 8,
        content: `For millions of people, buying a home feels impossible. Let's understand why traditional homeownership is so difficult and how rent-to-own offers a different path.

## The Traditional Barriers

Most people face significant obstacles to buying a home:

- **Down payment**: 10-20% of the home price (that's $25,000-$50,000 on a $250,000 home)
- **Credit requirements**: Banks want scores of 620-740+
- **Income documentation**: Self-employed and gig workers struggle
- **Closing costs**: Additional 2-5% of the purchase price
- **Competition**: Cash buyers and investors outbid regular buyers

## The Renting Trap

When you rent, you're building someone else's wealth:

1. Average rent: $1,500/month
2. Annual rent payments: $18,000
3. After 5 years: $90,000 paid
4. Your equity: $0

Every rent check makes your landlord richer while you stay in the same position.

## The Gap Between Renting and Buying

Traditional paths assume you can either:
- Save while renting (difficult when rent takes 30-50% of income)
- Get help from family (not available to everyone)
- Wait for prices to drop (they usually don't)

## What is Rent-to-Own?

Rent-to-own is a hybrid approach:

- You rent a property with the option to buy it later
- A portion of your rent goes toward your future purchase
- You lock in a purchase price upfront
- Time to improve credit and save for down payment

> "Rent-to-own turns your monthly housing payment into an investment in your future."`,
        keyTakeaways: [
          'Traditional homeownership requires large upfront capital most people don\'t have',
          'Renting builds zero equity despite significant monthly payments',
          'Rent-to-own bridges the gap between renting and buying',
          'You can work toward ownership while living in your future home'
        ]
      },
      {
        id: 2,
        title: 'How KeyGrow Works',
        duration: 10,
        content: `KeyGrow is Axiom's innovative rent-to-own program that uses blockchain technology to make homeownership accessible and transparent.

## The KeyGrow Model

Here's how KeyGrow works step by step:

1. **Browse properties**: Find homes in your budget and preferred area
2. **Apply to enroll**: Submit your application for a specific property
3. **Pay option fee**: A $500 refundable fee reserves your option to buy
4. **Move in and pay rent**: Your monthly rent is split into components
5. **Build equity**: 20% of each rent payment becomes your equity
6. **Exercise option**: Buy the home when you're ready (within the term)

## The Equity Building Formula

Every rent payment is divided:

- **20% - Your Equity**: Goes directly toward your purchase
- **10% - Maintenance Reserve**: For repairs and upkeep
- **5% - Vacancy Protection**: Insurance against gaps
- **65% - Property Owner**: Fair return for the investor

Example with $1,500 rent:
- Your monthly equity: $300
- Annual equity: $3,600
- 5-year equity: $18,000

## Blockchain Transparency

Everything is recorded on-chain:

- Equity tokenized as ERC-1155 shares
- 100,000 shares per property
- Your share count visible in your wallet
- Immutable record of all payments

## The Option Fee (AXM Staking)

Your $500 option fee isn't just sitting idle:

1. Converted to AXM tokens
2. Staked at 8% APR
3. Rewards accumulate toward your down payment
4. Fully credited at closing

## Flexibility Built In

Life happens, and KeyGrow accounts for that:

- Grace periods for temporary hardship
- Option to extend your term
- Transfer option to another property
- Exit with accumulated equity if needed`,
        keyTakeaways: [
          'KeyGrow splits rent into equity, maintenance, protection, and owner portions',
          '20% of every rent payment builds toward your home purchase',
          'Blockchain provides transparent, immutable records of your equity',
          'The option fee earns staking rewards while protecting your right to buy'
        ]
      },
      {
        id: 3,
        title: 'Calculating Your Path to Ownership',
        duration: 8,
        content: `Let's run through the math so you understand exactly how KeyGrow gets you to homeownership.

## Sample Scenario

Let's use realistic numbers:
- Property Price: $250,000
- Monthly Rent: $1,500
- Term: 5 years (60 months)
- Down Payment Goal: 10% ($25,000)

## Equity Accumulation

With 20% equity from rent:

- Monthly equity: $1,500 × 20% = $300
- Annual equity: $300 × 12 = $3,600
- 5-year equity: $3,600 × 5 = $18,000

## Option Fee Growth

Your $500 option fee staked at 8% APR:

- Year 1: $500 → $540
- Year 2: $540 → $583
- Year 3: $583 → $630
- Year 4: $630 → $680
- Year 5: $680 → $735

That's $235 in free money from staking!

## Total at Year 5

- Rent equity: $18,000
- Option fee + rewards: $735
- **Total toward purchase: $18,735**

## Closing the Gap

You need $25,000 for 10% down. You have $18,735.

Gap: $6,265

Options to cover the gap:
1. Save $104/month additionally
2. Extend term by 1.5 years
3. Negotiate seller credit
4. Use first-time buyer programs

## The Comparison

Without KeyGrow (traditional renting):
- 5 years of rent: $90,000 paid
- Equity built: $0
- Path to ownership: None

With KeyGrow:
- 5 years of rent: $90,000 paid
- Equity built: $18,735
- Path to ownership: Clear`,
        keyTakeaways: [
          'You can build nearly $19,000 in equity over 5 years with KeyGrow',
          'Option fee staking adds extra value at no cost to you',
          'The math works for properties in the $50,000-$375,000 range',
          'Traditional renting would leave you with zero equity over the same period'
        ]
      },
      {
        id: 4,
        title: 'Choosing the Right Property',
        duration: 8,
        content: `Not every property is a good fit for rent-to-own. Here's how to evaluate KeyGrow opportunities.

## Affordability Analysis

The first filter is whether you can afford it:

- Monthly rent should be 25-30% of gross income
- Example: $60,000 income = $1,250-$1,500 max rent
- Don't stretch beyond what's comfortable
- Remember: you're committing for years

## Location Considerations

Think about your life over the next 5+ years:

1. **Job access**: Can you commute from here?
2. **Schools**: Important if you have or want kids
3. **Growth potential**: Is the area improving?
4. **Amenities**: Grocery, healthcare, recreation nearby?
5. **Safety**: Research crime statistics

## Property Condition

Evaluate the physical property:

- Age and construction quality
- Major systems (roof, HVAC, plumbing)
- Recent renovations or needed repairs
- Lot size and outdoor space
- Storage and layout for your needs

## Financial Metrics

KeyGrow provides helpful analytics:

- **Price-to-Rent Ratio**: Lower is better for buyers
- **Affordability Index**: Your income vs. area costs
- **Cap Rate**: Property's investment quality
- **Time-to-Ownership**: Months until you can buy

## Red Flags to Avoid

Watch out for these warning signs:

- Prices significantly above comparable sales
- Properties in declining areas
- Major deferred maintenance
- Unclear ownership or title issues
- Terms that seem too good to be true

## Using Walk Score

Location quality at a glance:

- Walk Score: 70+ is good for walkability
- Transit Score: Access to public transportation
- Bike Score: Cycling infrastructure

> "The best KeyGrow property is one you'd be happy to own for 10+ years."`,
        keyTakeaways: [
          'Affordability should drive your property selection',
          'Consider your life circumstances over the full term',
          'Evaluate both the property condition and location quality',
          'Use KeyGrow\'s financial metrics to compare options'
        ]
      },
      {
        id: 5,
        title: 'The Enrollment Process',
        duration: 8,
        content: `Ready to enroll in KeyGrow? Here's exactly what to expect through the process.

## Step 1: Create Your Profile

Before browsing properties:

1. Connect your wallet to Axiom
2. Complete your profile information
3. Verify your identity (KYC requirements)
4. Link your bank account for payments

## Step 2: Get Pre-Qualified

Understand your budget:

- Input your income information
- Review debt obligations
- See your maximum monthly rent
- Understand term options

## Step 3: Browse Properties

Search the KeyGrow marketplace:

- Filter by location, price, and features
- Review property details and photos
- Check financial metrics
- Save favorites for comparison

## Step 4: Submit Application

For a specific property:

1. Click "Apply for KeyGrow"
2. Confirm your information
3. Answer property-specific questions
4. Submit for review

## Step 5: Pay Option Fee

If approved:

- $500 option fee required
- Pay in USDC, ETH, or fiat
- Automatically converted to AXM
- Staked for 8% APR rewards
- Fully refundable if you don't proceed

## Step 6: Sign Agreements

Review and sign:

- Option Agreement (your right to purchase)
- Lease Agreement (rental terms)
- KeyGrow Terms (equity program)
- All stored on IPFS and blockchain

## Step 7: Move In

Welcome home:

- Receive keys and access
- Set up utility accounts
- Begin monthly rent payments
- Track equity in your dashboard

## Timeline

Typical enrollment takes 2-4 weeks:
- Application review: 3-5 days
- Document preparation: 5-7 days
- Signing and payment: 2-3 days
- Move-in coordination: 3-5 days`,
        keyTakeaways: [
          'Enrollment requires identity verification and financial pre-qualification',
          'The $500 option fee is staked and earns rewards',
          'All agreements are stored immutably on blockchain',
          'The full process typically takes 2-4 weeks'
        ]
      },
      {
        id: 6,
        title: 'Building and Tracking Equity',
        duration: 8,
        content: `Once enrolled, you'll want to monitor your progress toward homeownership. Here's how to track and maximize your equity.

## Your KeyGrow Dashboard

Access real-time information:

- Current equity balance
- Tokenized shares owned
- Payment history
- Option fee staking rewards
- Time remaining on term

## Tokenized Equity Shares

Your equity is represented as ERC-1155 tokens:

- 100,000 shares per property
- Your share count = equity percentage
- Example: 5,000 shares = 5% equity
- Visible in your wallet and dashboard

## Monthly Statements

Each month you'll see:

1. Rent payment received
2. Equity portion credited
3. New share tokens issued
4. Updated total equity
5. Progress toward goal

## Accelerating Your Equity

Build equity faster with these strategies:

- **Extra payments**: Apply additional amounts to equity
- **Referral bonuses**: Earn credits for bringing others
- **Staking rewards**: Keep option fee staked longer
- **Improvement credits**: Some upgrades may count

## Tax Considerations

Consult a tax professional, but generally:

- Rent payments may not be deductible
- Staking rewards are taxable income
- Capital gains on tokens possible
- First-time buyer credits may apply at purchase

## When You're Ready to Buy

Exercising your option:

1. Notify Axiom of intent to purchase
2. Secure traditional mortgage financing
3. Equity applied to down payment
4. Complete standard home closing
5. Congratulations—you're a homeowner!

> "Every rent payment is a step closer to holding your own keys."`,
        keyTakeaways: [
          'Track your equity through the KeyGrow dashboard and your wallet',
          'Equity is tokenized as ERC-1155 shares for transparency',
          'You can accelerate equity through extra payments and referrals',
          'When ready, exercise your option and complete a normal home purchase'
        ]
      },
      {
        id: 7,
        title: 'Common Questions and Concerns',
        duration: 5,
        content: `Let's address the most common questions about KeyGrow.

## What if I lose my job?

KeyGrow includes protections:

- Grace periods for temporary hardship
- Option to pause and resume
- Equity preserved even if you exit
- No penalty for circumstances beyond control

## What if property values drop?

Your purchase price is locked:

- You can still buy at agreed price
- You can walk away (keeping accumulated equity)
- Market risk is on the seller, not you

## What if values increase?

You benefit:

- Buy at locked price below market
- Instant equity on purchase
- Your patience rewarded

## Can I make changes to the property?

With approval:

- Cosmetic changes usually allowed
- Structural changes require owner consent
- Some improvements may add to equity
- Document everything

## What happens to my equity if I leave?

Your equity is yours:

- Tokenized shares remain in your wallet
- May be redeemable for cash value
- Potential transfer to another property
- Specific terms in your agreement

## Is this too good to be true?

KeyGrow works because:

- Owners get reliable income and future sale
- Axiom earns modest fees
- Blockchain reduces overhead
- Aligned incentives create value for all

## What about traditional rent-to-own?

Traditional programs have issues:

- Often scams that forfeit payments
- No transparency in equity tracking
- Sellers can back out
- Poor legal protections

KeyGrow solves these with blockchain transparency and smart contracts.`,
        keyTakeaways: [
          'KeyGrow includes protections for financial hardship',
          'Locked purchase prices protect you from market changes',
          'Your tokenized equity belongs to you even if you exit',
          'Blockchain technology solves problems in traditional rent-to-own'
        ]
      },
      {
        id: 8,
        title: 'Your Next Steps',
        duration: 5,
        content: `You now understand how KeyGrow can help you achieve homeownership. Here's how to move forward.

## Immediate Actions

Do these today:

1. **Use the Equity Calculator**: See your personalized numbers at /tools/equity-calculator
2. **Browse properties**: Explore what's available in your area
3. **Connect your wallet**: Set up your Axiom profile
4. **Join the community**: Connect with other KeyGrow participants

## Prepare Your Finances

Before enrolling:

- Review your credit report
- Calculate your comfortable rent range
- Build a small emergency fund
- Reduce high-interest debt if possible

## Research Properties

Take your time to:

- Explore multiple options
- Visit neighborhoods (virtually or in person)
- Check crime stats and school ratings
- Talk to current residents if possible

## Ask Questions

Reach out for clarity:

- Use the support chat on the platform
- Ask in community Discord
- Schedule a call with KeyGrow team
- Review the FAQ section

## Spread the Word

Help others discover KeyGrow:

- Share your journey on social media
- Refer friends and family
- Join the conversation about housing solutions
- Become an advocate for accessible homeownership

## Your Future Home Awaits

Remember: every month you delay is another month of rent going to someone else's equity.

KeyGrow gives you a real, transparent path to owning your home. The technology is ready. The properties are available. The only missing piece is you.

> "The best time to start building equity was yesterday. The second best time is today."`,
        keyTakeaways: [
          'Use the Equity Calculator to see your personalized projections',
          'Prepare your finances while researching properties',
          'Connect with the community for support and guidance',
          'Every month you wait is equity you\'re not building'
        ]
      }
    ]
  },
  {
    id: 3,
    slug: 'financial-literacy',
    title: 'Financial Literacy Fundamentals',
    description: 'Master budgeting, saving, credit management, and wealth building strategies for long-term financial health.',
    category: 'Finance',
    difficulty: 'beginner',
    durationMinutes: 90,
    requiredTier: 'free',
    isFeatured: true,
    lessons: [
      {
        id: 1,
        title: 'Understanding Your Money',
        duration: 8,
        content: `Financial literacy starts with understanding how money flows through your life. Let's build that foundation.

## Income: Money In

Your income is everything you earn:

- **Gross income**: Before taxes and deductions
- **Net income**: What actually hits your bank account
- **Passive income**: Money earned without active work
- **Side income**: Extra earnings from gigs or projects

Know the difference between gross and net—it's your net income that pays bills.

## Expenses: Money Out

Track where your money goes:

- **Fixed expenses**: Same every month (rent, car payment)
- **Variable expenses**: Change monthly (groceries, utilities)
- **Discretionary**: Nice to have (dining out, entertainment)
- **Periodic**: Occasional (car repair, gifts)

## The Simple Equation

Your financial health comes down to:

Income - Expenses = Surplus (or Deficit)

If expenses exceed income, you're going into debt. If income exceeds expenses, you can save and invest.

## Cash Flow Awareness

Most people don't know where their money goes. For one month:

1. Track every dollar spent
2. Categorize each expense
3. Identify surprises
4. Find opportunities to cut

## The Psychology of Money

Money is emotional. Understand your patterns:

- Do you spend when stressed?
- Do you avoid looking at accounts?
- Do you buy to impress others?
- Do you feel guilty about spending?

Awareness is the first step to change.

> "You can't manage what you don't measure."`,
        keyTakeaways: [
          'Know the difference between gross and net income',
          'Categorize expenses as fixed, variable, discretionary, and periodic',
          'Track spending for at least one month to understand patterns',
          'Money is emotional—understand your psychology around it'
        ]
      },
      {
        id: 2,
        title: 'Creating a Budget That Works',
        duration: 8,
        content: `A budget isn't a restriction—it's a plan for your money. Let's create one you'll actually follow.

## The 50/30/20 Framework

A simple starting point:

- **50% Needs**: Housing, food, transportation, utilities
- **30% Wants**: Entertainment, dining, hobbies
- **20% Savings/Debt**: Emergency fund, retirement, debt payoff

Adjust these percentages to fit your situation.

## Zero-Based Budgeting

Every dollar gets a job:

1. List all income for the month
2. Assign every dollar to a category
3. Income minus all assignments = $0
4. Adjust until it balances

This ensures intentional spending.

## The Envelope Method

Physical or digital "envelopes":

- Groceries: $400
- Gas: $150
- Fun money: $200
- When envelope is empty, stop spending in that category

Works great for variable expenses.

## Building Your Budget

Step-by-step:

1. Calculate monthly net income
2. List all fixed expenses
3. Estimate variable expenses
4. Include savings as an "expense"
5. Allocate discretionary spending
6. Review and adjust monthly

## Common Budgeting Mistakes

Avoid these pitfalls:

- Being too restrictive (you'll quit)
- Forgetting periodic expenses
- Not including fun money
- Failing to adjust when life changes
- Giving up after one bad month

## Digital Tools

Consider using:

- Spreadsheets (full control)
- Budgeting apps (automatic tracking)
- Bank categorization features
- Axiom's upcoming financial tools`,
        keyTakeaways: [
          'The 50/30/20 framework is a good starting point',
          'Zero-based budgeting gives every dollar a purpose',
          'Include fun money so the budget feels sustainable',
          'Review and adjust your budget monthly'
        ]
      },
      {
        id: 3,
        title: 'Emergency Fund Essentials',
        duration: 7,
        content: `An emergency fund is your financial safety net. Without one, any unexpected expense becomes a crisis.

## Why You Need It

Emergencies happen:

- Job loss or reduced hours
- Medical expenses
- Car breakdown
- Home repairs
- Family emergencies

Without savings, these become credit card debt.

## How Much to Save

Build in stages:

1. **Starter fund**: $1,000 (covers minor emergencies)
2. **Basic fund**: 1 month of expenses
3. **Solid fund**: 3 months of expenses
4. **Secure fund**: 6 months of expenses

Your target depends on job stability and risk tolerance.

## Where to Keep It

Your emergency fund needs to be:

- **Accessible**: Can access within 1-2 days
- **Safe**: Not at risk of loss
- **Separate**: Not mixed with regular spending

Good options:
- High-yield savings account
- Money market account
- Stable value crypto (USDC) for quick access

## Building Your Fund

Start small and build:

1. Set up automatic transfers
2. Start with $25-50 per paycheck
3. Add tax refunds and bonuses
4. Sell unused items
5. Celebrate milestones

## When to Use It

Emergency fund is for true emergencies:

- Unexpected necessary expenses
- Income replacement during job loss
- Medical bills

NOT for:
- Planned expenses
- Sales or deals
- Vacations
- Impulse purchases

## Replenishing After Use

If you use your emergency fund:

1. Stop extra debt payments temporarily
2. Redirect all extra money to rebuilding
3. Return to normal once restored
4. Consider increasing the target`,
        keyTakeaways: [
          'Start with a $1,000 starter fund, then build to 3-6 months of expenses',
          'Keep emergency funds accessible but separate from daily spending',
          'Use automatic transfers to build consistently',
          'Only use for true emergencies, and replenish immediately after'
        ]
      },
      {
        id: 4,
        title: 'Understanding and Building Credit',
        duration: 8,
        content: `Your credit score impacts everything from loan rates to rental applications. Let's understand and improve it.

## What is a Credit Score?

A number (300-850) representing your creditworthiness:

- **Excellent**: 750+
- **Good**: 700-749
- **Fair**: 650-699
- **Poor**: Below 650

Higher scores = better loan terms and more opportunities.

## The Five Factors

Your score is calculated from:

1. **Payment History (35%)**: Do you pay on time?
2. **Credit Utilization (30%)**: How much of available credit used?
3. **Length of History (15%)**: How long have accounts been open?
4. **Credit Mix (10%)**: Different types of credit
5. **New Credit (10%)**: Recent applications

## Improving Your Score

Actionable strategies:

- **Never miss a payment**: Set up autopay minimums
- **Keep utilization under 30%**: Use less than 30% of available credit
- **Don't close old accounts**: Length of history matters
- **Limit new applications**: Each hard inquiry impacts score
- **Dispute errors**: Check reports for mistakes

## Building Credit from Scratch

If you have no credit history:

1. Become an authorized user on parent's card
2. Get a secured credit card
3. Try a credit-builder loan
4. Report rent payments (some services offer this)
5. Keep accounts active with small purchases

## Monitoring Your Credit

Check regularly:

- Free annual reports from AnnualCreditReport.com
- Free score monitoring from many banks/cards
- Credit Karma or similar services
- Review for errors and fraud

## The Long Game

Credit building takes time:

- No quick fixes that are legitimate
- Consistent good behavior compounds
- Negative marks fade over time (7 years)
- Start now—future you will thank you`,
        keyTakeaways: [
          'Payment history and utilization are the biggest factors (65%)',
          'Keep credit utilization under 30% of available credit',
          'Build credit with secured cards and authorized user status',
          'Check your credit reports regularly for errors and fraud'
        ]
      },
      {
        id: 5,
        title: 'Debt Management Strategies',
        duration: 8,
        content: `Not all debt is equal. Learn to manage debt strategically for financial freedom.

## Good Debt vs. Bad Debt

Some debt can be useful:

**Potentially Good Debt:**
- Mortgage (builds equity, often tax-deductible)
- Student loans (increases earning potential)
- Business loans (generates income)

**Usually Bad Debt:**
- Credit card debt (high interest, no asset)
- Payday loans (predatory rates)
- Car loans (depreciating asset)

## Understanding Interest

Interest is the cost of borrowing:

- **APR**: Annual Percentage Rate
- **Compound interest**: Interest on interest

$5,000 credit card balance at 20% APR:
- Minimum payments only: 15 years to pay off, $7,500 in interest
- $200/month: 2.5 years, $1,000 in interest

## The Avalanche Method

Pay off highest interest first:

1. List all debts with interest rates
2. Pay minimums on all
3. Put extra money toward highest rate
4. When paid off, attack next highest
5. Mathematically optimal approach

## The Snowball Method

Pay off smallest balance first:

1. List all debts by balance
2. Pay minimums on all
3. Put extra money toward smallest
4. When paid off, attack next smallest
5. Psychological wins keep you motivated

## Negotiating with Creditors

You have more power than you think:

- Request interest rate reduction
- Ask about hardship programs
- Negotiate settlements on old debt
- Get payment plans in writing

## Avoiding New Debt

Break the cycle:

- Build emergency fund first
- Use debit or cash for discretionary spending
- Wait 24 hours before purchases over $100
- Unsubscribe from marketing emails`,
        keyTakeaways: [
          'Distinguish between potentially good debt and usually bad debt',
          'Choose avalanche (math optimal) or snowball (psychology optimal) method',
          'High-interest debt should be priority one',
          'Negotiate with creditors—they often have options they don\'t advertise'
        ]
      },
      {
        id: 6,
        title: 'Introduction to Investing',
        duration: 8,
        content: `Investing is how wealth is built over time. Let's cover the fundamentals.

## Why Invest?

Money loses value to inflation:

- $1,000 today might buy only $800 worth of goods in 10 years
- Savings accounts often don't keep up with inflation
- Investing helps your money grow faster than inflation

## The Power of Compound Growth

Money grows exponentially:

$10,000 invested at 7% annual return:
- Year 5: $14,025
- Year 10: $19,671
- Year 20: $38,697
- Year 30: $76,122

Time is your biggest advantage.

## Types of Investments

Common investment vehicles:

- **Stocks**: Ownership in companies (higher risk/reward)
- **Bonds**: Loans to governments/companies (lower risk/reward)
- **Real Estate**: Property ownership (tangible asset)
- **Mutual Funds**: Pooled investments (diversification)
- **ETFs**: Exchange-traded funds (low-cost diversification)
- **Crypto**: Digital assets (high risk/reward)

## Risk and Reward

Higher potential returns = higher risk:

- Bank savings: Low return, very low risk
- Bonds: Moderate return, low risk
- Stocks: Higher return, higher risk
- Crypto: Highest potential return, highest risk

Diversification reduces overall risk.

## Getting Started

Steps to begin investing:

1. Pay off high-interest debt first
2. Build emergency fund
3. Contribute to employer 401(k) match
4. Open an IRA or brokerage account
5. Start with low-cost index funds
6. Automate contributions

## Common Mistakes

Avoid these pitfalls:

- Timing the market (impossible consistently)
- Panic selling during downturns
- Putting all eggs in one basket
- Ignoring fees
- Not starting because amount seems small`,
        keyTakeaways: [
          'Investing fights inflation and builds wealth over time',
          'Compound growth makes time your biggest advantage',
          'Diversification reduces risk',
          'Start with low-cost index funds and automate contributions'
        ]
      },
      {
        id: 7,
        title: 'Retirement Planning Basics',
        duration: 7,
        content: `Retirement may seem far away, but starting early makes all the difference.

## Why Start Now?

The math is compelling:

**Starting at age 25** ($200/month at 7%):
- By age 65: $524,000

**Starting at age 35** ($200/month at 7%):
- By age 65: $243,000

10 years of delay costs over $280,000!

## Retirement Account Types

Tax-advantaged accounts:

**401(k)** - Employer sponsored:
- Pre-tax contributions
- Employer match = free money
- 2024 limit: $23,000

**Traditional IRA**:
- Tax-deductible contributions
- Pay taxes in retirement
- 2024 limit: $7,000

**Roth IRA**:
- After-tax contributions
- Tax-free growth and withdrawal
- Income limits apply

## The Employer Match

Free money you shouldn't miss:

If employer matches 50% up to 6%:
- You contribute 6% ($3,600 on $60,000 salary)
- Employer adds $1,800
- That's 50% immediate return!

Always contribute enough to get the full match.

## How Much Do You Need?

Common rules of thumb:

- 25x annual expenses for retirement
- Save 15% of income throughout career
- Aim for 70-80% of pre-retirement income

Use retirement calculators for your specific situation.

## Social Security

Don't count on it fully:

- Benefits may be reduced for younger generations
- Average benefit: ~$1,800/month
- Supplement, not replacement, for savings
- Know your estimated benefit (ssa.gov)

## Action Steps

Start today:

1. Find out if employer offers 401(k)
2. Contribute at least enough for full match
3. Open an IRA if no employer plan
4. Set up automatic increases annually`,
        keyTakeaways: [
          'Starting 10 years earlier can double your retirement savings',
          'Never leave employer match money on the table',
          'Aim to save 15% of income for retirement',
          'Roth accounts provide tax-free growth and withdrawal'
        ]
      },
      {
        id: 8,
        title: 'Protecting Your Wealth',
        duration: 7,
        content: `Building wealth is only half the equation. Protecting it is equally important.

## Insurance Essentials

Protect against catastrophic loss:

**Health Insurance**:
- Medical bills are #1 cause of bankruptcy
- Even healthy young people need coverage
- Understand deductibles and out-of-pocket max

**Auto Insurance**:
- Liability protects you from lawsuits
- Consider umbrella policy for extra protection
- Shop around annually for better rates

**Renter's/Home Insurance**:
- Covers possessions and liability
- Surprisingly affordable
- Document valuables with photos

**Life Insurance** (if dependents):
- Term life is most cost-effective
- Coverage = 10x income is common rule
- Review as family situation changes

## Estate Planning Basics

Everyone needs these:

1. **Will**: Directs asset distribution
2. **Power of Attorney**: Someone manages affairs if incapacitated
3. **Healthcare Directive**: Medical wishes if unable to communicate
4. **Beneficiary designations**: Keep updated on accounts

## Identity Protection

Guard your information:

- Monitor credit reports
- Use strong, unique passwords
- Enable two-factor authentication
- Be cautious with personal info online
- Consider credit freeze if not actively seeking credit

## Avoiding Scams

Common warning signs:

- Urgency ("Act now!")
- Too good to be true returns
- Requests for unusual payment (gift cards, wire)
- Unsolicited contact about money
- Pressure to keep secret

When in doubt, pause and research.

## Building a Financial Team

As wealth grows, consider:

- Fee-only financial advisor
- Tax professional (CPA)
- Estate planning attorney
- Insurance broker

> "It's not about how much you make, it's about how much you keep."`,
        keyTakeaways: [
          'Insurance protects against catastrophic financial loss',
          'Everyone needs a will, power of attorney, and healthcare directive',
          'Monitor credit and practice good digital security',
          'Recognize common scam tactics and take time to verify'
        ]
      }
    ]
  },
  {
    id: 4,
    slug: 'depin-explained',
    title: 'DePIN: Decentralized Infrastructure',
    description: 'Discover how DePIN (Decentralized Physical Infrastructure Networks) works and how to participate in the network.',
    category: 'Blockchain',
    difficulty: 'intermediate',
    durationMinutes: 75,
    requiredTier: 'free',
    isFeatured: false,
    lessons: [
      {
        id: 1,
        title: 'What is DePIN?',
        duration: 8,
        content: `DePIN stands for Decentralized Physical Infrastructure Networks. It's one of the most exciting developments in blockchain technology.

## The Problem with Traditional Infrastructure

Traditional infrastructure is centralized:

- Large corporations control networks
- High barriers to entry
- Single points of failure
- Profits flow to shareholders, not users
- Limited by corporate priorities

Examples: Telecom networks, cloud computing, GPS systems, power grids.

## The DePIN Solution

DePIN flips the model:

- Networks owned and operated by participants
- Token incentives reward contribution
- No single point of failure
- Value flows to contributors
- Community-driven expansion

## How DePIN Works

The basic model:

1. Protocol defines what infrastructure is needed
2. Participants provide hardware/resources
3. Smart contracts verify contributions
4. Tokens reward valid contributions
5. Network value increases with participants
6. Token value reflects network utility

## Real DePIN Examples

Projects already operating:

- **Helium**: Decentralized wireless network
- **Filecoin**: Distributed file storage
- **Render**: GPU computing power
- **Hivemapper**: Community-built maps
- **Axiom DePIN**: Smart city infrastructure

## Why DePIN Matters

Benefits for everyone:

**For participants**:
- Earn from resources you already have
- Low barrier to entry
- Passive income potential

**For users**:
- Lower costs than centralized alternatives
- Greater resilience and uptime
- Privacy and data control

**For society**:
- More equitable wealth distribution
- Faster infrastructure deployment
- Innovation not limited by corporations`,
        keyTakeaways: [
          'DePIN uses tokens to incentivize building physical infrastructure',
          'Participants contribute resources and earn rewards',
          'Networks are more resilient without central points of failure',
          'Value flows to contributors rather than corporate shareholders'
        ]
      },
      {
        id: 2,
        title: 'The Token Economics of DePIN',
        duration: 8,
        content: `Understanding token economics is key to successful DePIN participation.

## The Flywheel Effect

DePIN creates a virtuous cycle:

1. Token rewards attract participants
2. More participants = better network
3. Better network attracts users
4. User demand increases token value
5. Higher value attracts more participants
6. Repeat

## Supply Side Economics

Participants provide resources:

- Hardware (nodes, sensors, storage)
- Bandwidth
- Location/coverage
- Maintenance and uptime

Rewards are typically proportional to contribution quality and quantity.

## Demand Side Economics

Users pay for services:

- Direct payment for usage
- Subscription models
- Data access fees
- Enterprise contracts

This demand is what ultimately backs token value.

## Token Distribution Models

How tokens are allocated:

- **Mining/Emissions**: Ongoing rewards for contribution
- **Staking**: Locking tokens for network security
- **Burn mechanisms**: Reducing supply as usage grows
- **Treasury**: Funding development and growth

## Evaluating DePIN Opportunities

Key metrics to consider:

1. **Unit economics**: Is providing service profitable?
2. **Network effect**: Does more participation improve value?
3. **Demand sources**: Who pays for the service?
4. **Competition**: Centralized alternatives?
5. **Team and development**: Active progress?

## Risks to Consider

DePIN isn't risk-free:

- Token price volatility
- Hardware costs and depreciation
- Protocol changes affecting rewards
- Regulatory uncertainty
- Network adoption risk`,
        keyTakeaways: [
          'DePIN creates a flywheel where participation drives value',
          'Both supply (providers) and demand (users) matter for success',
          'Evaluate unit economics before investing in hardware',
          'Token volatility is a significant risk factor'
        ]
      },
      {
        id: 3,
        title: 'Axiom DePIN Nodes',
        duration: 10,
        content: `Axiom's DePIN network powers smart city infrastructure. Here's how you can participate.

## Types of Axiom Nodes

Different nodes serve different purposes:

**Gateway Nodes**:
- Connect IoT devices to the network
- Process and relay sensor data
- Suitable for home or business deployment
- Entry-level hardware requirements

**Validator Nodes**:
- Verify data integrity
- Participate in consensus
- Higher staking requirements
- More significant rewards

**Storage Nodes**:
- Distributed data storage
- Historical records and analytics
- Storage capacity determines rewards
- Redundancy across network

## Node Tiers and Rewards

Axiom uses tiered rewards:

| Tier | Stake Required | Monthly Reward Est. |
|------|---------------|-------------------|
| Bronze | 1,000 AXM | 50-100 AXM |
| Silver | 5,000 AXM | 300-500 AXM |
| Gold | 25,000 AXM | 1,800-2,500 AXM |
| Platinum | 100,000 AXM | 8,000-12,000 AXM |

Actual rewards depend on network activity and uptime.

## Getting Started

Steps to run an Axiom node:

1. Purchase or lease node hardware
2. Acquire required AXM stake
3. Install node software
4. Configure network settings
5. Register node on-chain
6. Maintain uptime for rewards

## Hardware Requirements

Minimum specifications:

- Raspberry Pi 4 or equivalent (Gateway)
- 8GB RAM, 256GB storage
- Stable internet connection
- Backup power recommended
- Static IP or dynamic DNS

## Node Leasing Option

Don't want to run hardware?

Axiom offers node leasing:
- Rent node capacity from operators
- Lower barrier to entry
- No technical maintenance
- Share in node rewards
- Great for testing before buying

## Community and Support

Resources available:

- Node operator Discord channel
- Technical documentation
- Weekly operator calls
- Troubleshooting support
- Network monitoring dashboard`,
        keyTakeaways: [
          'Axiom offers multiple node types for different participation levels',
          'Tiered staking determines reward potential',
          'Node leasing allows participation without hardware ownership',
          'Active community support helps new operators succeed'
        ]
      },
      {
        id: 4,
        title: 'Setting Up Your First Node',
        duration: 10,
        content: `Ready to run a node? This lesson walks through the setup process.

## Hardware Preparation

Before you begin:

1. Acquire compatible hardware
2. Download node software image
3. Flash to SD card or SSD
4. Gather network information
5. Prepare your AXM stake

## Network Configuration

Ensure proper connectivity:

- Static IP or reliable DDNS
- Port forwarding (check documentation for required ports)
- Firewall exceptions
- Bandwidth allocation
- Uptime monitoring setup

## Software Installation

Step-by-step:

\`\`\`
1. Boot device with Axiom node image
2. Complete initial configuration wizard
3. Connect wallet for staking
4. Stake required AXM amount
5. Generate node credentials
6. Start node services
\`\`\`

## Registration and Staking

On-chain registration:

1. Connect wallet to axiomprotocol.io
2. Navigate to Node Operator portal
3. Register node with generated credentials
4. Stake AXM to activate node
5. Confirm transaction on-chain
6. Node appears in network registry

## Monitoring and Maintenance

Keep your node healthy:

**Daily checks**:
- Verify node is online
- Check pending rewards
- Monitor resource usage

**Weekly tasks**:
- Review performance metrics
- Update software if available
- Check network announcements

**Monthly review**:
- Claim accumulated rewards
- Assess profitability
- Consider tier upgrades

## Troubleshooting Common Issues

If problems arise:

- **Node offline**: Check power, network, and process
- **Low rewards**: Verify uptime and stake tier
- **Connection errors**: Review firewall and ports
- **Software issues**: Consult documentation and Discord

> "A well-maintained node is a profitable node."`,
        keyTakeaways: [
          'Proper hardware and network preparation prevents issues',
          'Registration requires on-chain staking transaction',
          'Regular monitoring ensures maximum uptime and rewards',
          'Community resources help resolve common problems'
        ]
      },
      {
        id: 5,
        title: 'Maximizing Node Profitability',
        duration: 8,
        content: `Running a node is an investment. Here's how to optimize your returns.

## Understanding Your Costs

Calculate total cost of ownership:

**Upfront costs**:
- Hardware purchase
- Initial AXM stake
- Setup time and effort

**Ongoing costs**:
- Electricity
- Internet bandwidth
- Maintenance and replacement
- Opportunity cost of staked tokens

## Revenue Optimization

Maximize your earnings:

**Uptime is everything**:
- Target 99%+ availability
- Use UPS for power backup
- Redundant internet if possible
- Monitor with alerts

**Stake optimization**:
- Higher tiers = better reward rates
- Consider upgrading when profitable
- Compound rewards into stake

**Location matters**:
- Coverage gaps pay premiums
- Early to new regions earns more
- Urban vs. rural considerations

## ROI Calculation

Monthly profit formula:

\`\`\`
Monthly Reward (AXM)
× AXM Price ($)
- Monthly Electricity
- Monthly Internet Allocation
- Hardware Depreciation (purchase / 36 months)
= Net Monthly Profit
\`\`\`

## Tax Considerations

Consult a professional, but be aware:

- Token rewards are often taxable income
- Hardware may be depreciable expense
- Business structure options
- Record keeping requirements

## Scaling Your Operation

Growth strategies:

1. Reinvest rewards into additional nodes
2. Upgrade to higher tiers
3. Diversify across node types
4. Geographic expansion
5. Offer hosting services to others

## Exit Strategy

Plan for various scenarios:

- Selling hardware on secondary market
- Unstaking and selling tokens
- Transferring operation to buyer
- Gradual wind-down approach`,
        keyTakeaways: [
          'Calculate all costs to understand true profitability',
          'Uptime is the biggest factor in maximizing rewards',
          'Consider tax implications of token rewards',
          'Reinvest earnings strategically to scale operation'
        ]
      }
    ]
  },
  {
    id: 5,
    slug: 'susu-community-savings',
    title: 'SUSU: Community Savings Circles',
    description: 'Learn the traditional rotating savings method modernized with blockchain for trust, transparency, and efficiency.',
    category: 'Community',
    difficulty: 'beginner',
    durationMinutes: 30,
    requiredTier: 'free',
    isFeatured: false,
    lessons: [
      {
        id: 1,
        title: 'The History of SUSU',
        duration: 8,
        content: `SUSU (also known as ROSCA - Rotating Savings and Credit Association) is one of humanity's oldest financial systems.

## Origins and Global Presence

SUSU has many names worldwide:

- **SUSU**: Caribbean, West Africa
- **Tanda**: Mexico, Latin America
- **Chit Fund**: India
- **Hui**: China
- **Gam'iya**: Egypt, Middle East
- **Stokvel**: South Africa

The concept spans continents and centuries.

## How Traditional SUSU Works

The basic structure:

1. Group of 10-20 trusted people form a circle
2. Each contributes fixed amount regularly (weekly/monthly)
3. Pooled funds go to one member each cycle
4. Rotation continues until everyone receives once
5. Process can repeat indefinitely

Example: 10 people × $100/month = $1,000 payout each month to one person.

## Why SUSU Developed

Traditional banking doesn't serve everyone:

- No minimum balance requirements
- No credit checks
- No interest charges
- Social accountability replaces collateral
- Community builds wealth together

## The Trust Problem

Traditional SUSU has vulnerabilities:

- What if someone collects early and disappears?
- What if the organizer takes the money?
- How do you verify contributions?
- What if someone can't pay?

These risks have limited SUSU's growth.

## Blockchain as the Solution

Smart contracts solve trust issues:

- Contributions are transparent and verifiable
- Payouts are automatic and guaranteed
- No single person controls the funds
- Rules are enforced by code
- Participation history is public

> "SUSU proves that communities can create their own financial systems. Blockchain makes them trustless and global."`,
        keyTakeaways: [
          'SUSU is a centuries-old savings method found in cultures worldwide',
          'Groups pool money and take turns receiving the full pot',
          'Traditional SUSU requires high trust between members',
          'Blockchain eliminates trust issues through transparent smart contracts'
        ]
      },
      {
        id: 2,
        title: 'How Axiom SUSU Works',
        duration: 8,
        content: `Axiom SUSU brings this ancient practice on-chain with smart contract security.

## The Smart Contract Structure

AxiomSusuHub manages everything:

- Pool creation and parameters
- Member enrollment
- Contribution collection
- Payout distribution
- Penalty enforcement

All rules are code—no human intervention needed.

## Creating a Pool

Pool organizers set parameters:

- **Contribution amount**: Fixed amount per cycle
- **Cycle duration**: Weekly, bi-weekly, or monthly
- **Member count**: 2-50 participants
- **Token**: AXM or approved ERC20
- **Payout order**: Sequential or random
- **Grace period**: Days allowed for late payment

## Joining a Pool

Members participate by:

1. Finding available pools
2. Reviewing terms and members
3. Committing to join (may require initial deposit)
4. Making regular contributions
5. Receiving payout when their turn arrives

## The Payout Mechanism

When it's your turn:

- Smart contract automatically distributes
- No request or approval needed
- Full pool amount minus protocol fee
- Directly to your wallet
- Transaction recorded on-chain

## Protocol Fees

Axiom charges small fee:

- 1-2% of each payout
- Funds Axiom treasury
- Supports platform development
- Lower than traditional middlemen

## Handling Defaults

If someone misses a payment:

- Grace period allows catch-up
- Missed payments can be covered by deposit
- Repeated defaults lead to removal
- Other members are protected`,
        keyTakeaways: [
          'AxiomSusuHub smart contract manages all pool operations',
          'Organizers set contribution amount, cycle duration, and member count',
          'Payouts are automatic when your turn arrives',
          'Protocol fees are minimal (1-2%) and fund platform development'
        ]
      },
      {
        id: 3,
        title: 'Participating in SUSU Pools',
        duration: 7,
        content: `Ready to join a SUSU pool? Here's what you need to know.

## Finding the Right Pool

Browse available pools considering:

- Contribution amount within your budget
- Cycle duration that matches your cash flow
- Member count (smaller = faster payout)
- Token preference (AXM or stablecoin)
- Grace period for flexibility

## Before You Join

Ask yourself:

1. Can I commit to every contribution for the full cycle?
2. Do I have emergency funds if unexpected expenses arise?
3. Am I comfortable with the payout timeline?
4. Do I understand the terms and penalties?

## The Commitment

When you join, you're committing to:

- Make every scheduled contribution
- Accept your assigned payout position
- Follow pool rules
- Stay for the entire cycle

Breaking commitment affects your reputation and may lose deposits.

## Managing Cash Flow

Plan your finances around SUSU:

- Set aside contribution amount from each paycheck
- Use calendar reminders
- Automate if possible
- Don't rely on SUSU payout for immediate expenses

## Receiving Your Payout

When your turn arrives:

- Payout deposited automatically
- Use wisely for intended purpose
- Common uses: Debt payoff, down payment, business investment, emergency fund
- Avoid spending on consumables

## After the Cycle

When cycle completes:

- You can join another cycle
- Consider organizing your own pool
- Build reputation for better pools
- Invite trusted friends and family

> "SUSU works because everyone wins—you just win at different times."`,
        keyTakeaways: [
          'Choose pools with contribution amounts you can reliably commit to',
          'Plan cash flow to ensure you never miss a contribution',
          'Use your payout wisely for long-term financial goals',
          'Build reputation by completing cycles reliably'
        ]
      },
      {
        id: 4,
        title: 'Starting Your Own Pool',
        duration: 7,
        content: `Want to organize a SUSU pool? Here's how to create a successful one.

## Planning Your Pool

Consider these factors:

**Size**: 
- Smaller (5-10): Faster payouts, easier to fill
- Larger (15-20): Bigger payouts, more coordination

**Contribution**:
- Match to your community's capacity
- $50-$500 monthly is common range
- Higher amounts = more serious commitment

**Duration**:
- Weekly: Fast-moving, requires active management
- Monthly: Most common, aligns with pay cycles
- Bi-weekly: Balance of speed and manageability

## Setting Up the Contract

Creating pool on Axiom:

1. Connect wallet to Axiom SUSU
2. Click "Create Pool"
3. Set contribution amount
4. Choose cycle duration
5. Set member count
6. Select payout order (sequential/random)
7. Define grace period
8. Deploy pool contract

## Recruiting Members

Build your circle:

- Start with people you know
- Explain SUSU concept to newcomers
- Be transparent about terms
- Screen for reliability
- Maintain waitlist for future cycles

## Pool Management

Your responsibilities:

- Answer member questions
- Send reminders before due dates
- Monitor for issues
- Mediate any disputes
- Communicate transparently

## Building Pool Reputation

Good pools attract good members:

- Complete cycles successfully
- Handle issues fairly
- Maintain high completion rate
- Grow organically through referrals

## Common Challenges

Be prepared for:

- Members who want to drop out
- Late payments during grace period
- Questions about payout order
- Requests for exceptions

Have policies ready before issues arise.`,
        keyTakeaways: [
          'Plan pool size and contribution amounts based on your community',
          'Monthly cycles align well with most people\'s pay schedules',
          'Start with people you know and trust',
          'Clear policies prevent disputes before they happen'
        ]
      }
    ]
  },
  {
    id: 6,
    slug: 'governance-dao-participation',
    title: 'DAO Governance Participation',
    description: 'Understand how to participate in community governance, vote on proposals, and shape the future of Axiom.',
    category: 'Governance',
    difficulty: 'intermediate',
    durationMinutes: 45,
    requiredTier: 'basic',
    isFeatured: false,
    lessons: [
      {
        id: 1,
        title: 'Understanding DAOs',
        duration: 8,
        content: `DAOs (Decentralized Autonomous Organizations) represent a new way for communities to govern themselves.

## What is a DAO?

A DAO is an organization where:

- Rules are encoded in smart contracts
- Decisions are made by token holders
- Treasury is managed transparently
- No single person has unilateral control
- Code enforces the will of the community

## How DAOs Differ from Traditional Organizations

| Aspect | Traditional | DAO |
|--------|-------------|-----|
| Leadership | CEO/Board | Token holders |
| Rules | Bylaws/contracts | Smart contracts |
| Decisions | Top-down | Bottom-up voting |
| Treasury | Banks/accountants | On-chain, transparent |
| Membership | Employment/shares | Token ownership |

## Types of DAOs

DAOs serve different purposes:

- **Protocol DAOs**: Govern DeFi protocols
- **Investment DAOs**: Pool funds for investments
- **Grant DAOs**: Distribute funds to projects
- **Social DAOs**: Community membership
- **Collector DAOs**: Acquire NFTs/assets
- **Media DAOs**: Collaborative content creation

Axiom is a hybrid—governing a smart city economy.

## The Axiom Governance Structure

Axiom's DAO includes:

1. **AXM token holders**: Voting rights proportional to holdings
2. **Council members**: Elected representatives
3. **Working groups**: Specialized committees
4. **Proposal system**: Formal change process
5. **Treasury vault**: Community-controlled funds

## Why Participation Matters

Your voice counts:

- Shape the direction of the project
- Protect your investment
- Contribute expertise
- Build community
- Earn governance rewards`,
        keyTakeaways: [
          'DAOs are organizations governed by code and token holders',
          'Decisions are made through transparent voting processes',
          'Axiom\'s DAO governs the entire smart city ecosystem',
          'Participation gives you direct influence over the project\'s future'
        ]
      },
      {
        id: 2,
        title: 'The Proposal Lifecycle',
        duration: 8,
        content: `Understanding how proposals work is essential for effective governance participation.

## Proposal Types

Axiom has different proposal categories:

**Treasury Proposals**:
- Request funds for projects
- Budget allocations
- Grant distributions

**Parameter Changes**:
- Fee adjustments
- Staking requirements
- Protocol parameters

**Constitutional**:
- Governance rule changes
- Council elections
- Fundamental amendments

## The Proposal Journey

Every proposal follows stages:

### 1. Discussion (3-7 days)
- Idea posted in forum
- Community feedback
- Refinement based on input
- Temperature check (informal poll)

### 2. Formal Proposal
- Author submits on-chain proposal
- Required AXM deposit
- Proposal enters queue
- Details finalized

### 3. Voting Period (5-7 days)
- Token holders cast votes
- Voting power = AXM held
- Can vote Yes, No, or Abstain
- May change vote until period ends

### 4. Timelock (2 days)
- Passed proposals wait in timelock
- Allows review before execution
- Security measure against attacks

### 5. Execution
- Smart contract executes proposal
- Treasury sends funds
- Parameters change
- Results are immutable

## Proposal Requirements

To submit a proposal:

- Minimum AXM holding required
- Deposit (refunded if proposal passes quorum)
- Clear specification of changes
- Forum discussion first (for significant proposals)`,
        keyTakeaways: [
          'Proposals go through discussion, voting, timelock, and execution phases',
          'Different proposal types have different requirements',
          'Forum discussion before formal proposals builds consensus',
          'Timelock provides security review period before execution'
        ]
      },
      {
        id: 3,
        title: 'How to Vote Effectively',
        duration: 8,
        content: `Voting is your primary governance power. Here's how to use it wisely.

## Connecting and Voting

Technical steps:

1. Connect wallet to governance portal
2. Ensure AXM is in voting wallet (not staked elsewhere)
3. Navigate to active proposals
4. Read proposal details
5. Cast your vote
6. Confirm transaction

## Evaluating Proposals

Questions to ask:

- Does this benefit the community or special interests?
- What are the risks and downsides?
- Is the budget reasonable?
- Who submitted it and what's their track record?
- What does community sentiment look like?

## Research Before Voting

Do your homework:

- Read the full proposal, not just title
- Check forum discussion
- Look at author's history
- Consider opposition arguments
- Understand implementation details

## Voting Power and Delegation

You have options:

**Direct voting**: Use your AXM to vote yourself
**Delegation**: Assign voting power to a trusted delegate

When to delegate:
- You don't have time to follow governance closely
- You trust someone's judgment
- You want your voice counted even when busy

## Gas Costs

Voting requires gas:

- Check gas prices before voting
- Batch votes if possible
- Consider proposal importance vs. gas cost
- Some DAOs offer gasless voting (Axiom working on this)

## Voting Ethics

Be a responsible voter:

- Vote based on community benefit, not personal gain
- Consider long-term consequences
- Don't sell your vote
- Engage thoughtfully in discussions`,
        keyTakeaways: [
          'Read full proposals and forum discussions before voting',
          'Consider delegating if you can\'t follow governance closely',
          'Evaluate proposals based on community benefit, not personal gain',
          'Gas costs are a factor—consider importance vs. cost'
        ]
      },
      {
        id: 4,
        title: 'Creating Successful Proposals',
        duration: 8,
        content: `Want to propose a change? Here's how to create proposals that pass.

## Start with Discussion

Before formal proposal:

1. Post idea in governance forum
2. Explain the problem you're solving
3. Outline your proposed solution
4. Request feedback openly
5. Be willing to modify based on input

## Writing a Strong Proposal

Essential elements:

**Title**: Clear and specific
**Summary**: One paragraph overview
**Problem Statement**: What issue this addresses
**Proposed Solution**: Detailed description
**Implementation**: Technical specifications
**Budget** (if applicable): Itemized costs
**Timeline**: When and how it will be done
**Risks**: Potential downsides and mitigations

## Building Consensus

Before formal vote:

- Engage with critics constructively
- Incorporate valid feedback
- Build coalition of supporters
- Address concerns directly
- Consider compromise when reasonable

## Avoiding Common Mistakes

Proposals fail when they:

- Ask for too much too fast
- Lack clear implementation details
- Ignore community feedback
- Benefit author more than community
- Don't address legitimate concerns
- Have unrealistic timelines or budgets

## After Submission

Stay engaged:

- Respond to questions during voting
- Clarify misunderstandings
- Provide updates
- Be gracious whether you win or lose

## If Your Proposal Fails

Learn and improve:

- Understand why it didn't pass
- Gather feedback from voters
- Revise and resubmit if appropriate
- Sometimes timing matters—try again later`,
        keyTakeaways: [
          'Start with forum discussion to build consensus before formal proposal',
          'Include problem, solution, implementation, budget, and timeline',
          'Engage constructively with critics and incorporate feedback',
          'Learn from failed proposals to improve future submissions'
        ]
      },
      {
        id: 5,
        title: 'Advanced Governance Strategies',
        duration: 8,
        content: `Take your governance participation to the next level.

## Building Influence

Become a respected voice:

- Participate consistently over time
- Provide thoughtful analysis
- Help newcomers understand proposals
- Build reputation for fairness
- Share expertise in your areas

## Delegation and Delegates

Understanding delegation:

**As a delegator**:
- Research delegate voting history
- Choose delegates aligned with your values
- Monitor their votes
- Revoke delegation if needed

**As a delegate**:
- Communicate your voting philosophy
- Explain your votes transparently
- Engage with those who delegate to you
- Take responsibility seriously

## Governance Mining

Some protocols reward participation:

- Voting on proposals
- Forum participation
- Delegate activity
- Proposal creation

Check if Axiom offers governance incentives.

## Working Groups

Specialized participation:

- Treasury committee
- Technical committee
- Grants committee
- Community committee

Join working groups matching your expertise.

## Meta-Governance

The governance of governance:

- Voting system improvements
- Quorum requirements
- Voting period lengths
- Proposal thresholds

These foundational changes require careful consideration.

## Protecting Against Attacks

Be vigilant:

- Watch for vote buying
- Identify last-minute proposal manipulation
- Flag suspicious proposals
- Support security measures
- Report concerning behavior

> "Good governance is an ongoing commitment, not a one-time vote."`,
        keyTakeaways: [
          'Build influence through consistent, thoughtful participation',
          'Delegation allows scaling of voice while maintaining accountability',
          'Working groups offer specialized ways to contribute',
          'Stay vigilant against governance attacks and manipulation'
        ]
      },
      {
        id: 6,
        title: 'The Future of Governance',
        duration: 5,
        content: `Governance is evolving. Here's where it's headed.

## Current Limitations

DAOs face challenges:

- Low voter turnout
- Plutocracy (whale dominance)
- Voter fatigue
- Gas costs
- Complexity barriers

## Emerging Solutions

Innovation is addressing these:

**Quadratic voting**: Diminishing power for large holders
**Conviction voting**: Time-weighted preferences
**Optimistic governance**: Default approval with veto period
**Futarchy**: Prediction markets guide decisions
**Soulbound tokens**: Non-transferable reputation

## Axiom's Governance Roadmap

Planned improvements:

- Gasless voting
- Improved delegation tools
- Council representation
- Specialized voting tracks
- Integration with city services

## Your Ongoing Role

Governance never stops:

- Stay informed about proposals
- Participate in discussions
- Vote on important matters
- Hold delegates accountable
- Propose improvements

## The Bigger Picture

Axiom governance matters beyond token holders:

- Blueprint for smart city democracy
- Model for digital nation governance
- Proof that decentralization works
- Your participation shapes the future

> "We're not just governing a protocol—we're pioneering new forms of collective decision-making."`,
        keyTakeaways: [
          'Current governance has limitations like low turnout and whale dominance',
          'New voting mechanisms like quadratic voting address these issues',
          'Axiom is continuously improving its governance systems',
          'Your participation helps build models for future digital governance'
        ]
      }
    ]
  }
];
