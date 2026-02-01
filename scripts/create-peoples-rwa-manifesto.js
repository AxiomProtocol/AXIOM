import { google } from 'googleapis';

let connectionSettings = null;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-docs',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Docs not connected');
  }
  return accessToken;
}

async function getGoogleDocsClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.docs({ version: 'v1', auth: oauth2Client });
}

async function createManifestoDocument() {
  const docs = await getGoogleDocsClient();
  
  const createResponse = await docs.documents.create({
    requestBody: {
      title: "The People's RWA Manifesto - Axiom Protocol vs Institutional Crypto"
    }
  });
  
  const documentId = createResponse.data.documentId;
  console.log('Created document:', documentId);
  
  const content = `THE PEOPLE'S RWA MANIFESTO
Axiom Protocol: The Sovereign Alternative to Institutional Crypto

A Comprehensive Analysis of Community-First Tokenization vs Corporate-Controlled Digital Assets

Version 1.0 | December 2025

================================================================================
TABLE OF CONTENTS
================================================================================

1. Executive Summary
2. The Great Crypto Reversal: How Rebellion Became Regulation
3. The Institutional Takeover: XRP, HBAR, and Corporate Crypto
4. The Axiom Difference: A Return to First Principles
5. Constitutional Protection: The PMA Trust Advantage
6. Tokenizing Main Street vs Wall Street
7. The Sovereign Membership Economy Model
8. Head-to-Head Comparison: Axiom vs Institutional Platforms
9. The Case for Community Wealth Building
10. Marketing Framework and Messaging Guide
11. Call to Action: Join the Movement

================================================================================
1. EXECUTIVE SUMMARY
================================================================================

THE CORE THESIS

Cryptocurrency was born from a simple idea: financial sovereignty for ordinary people. The 2008 financial crisis exposed how banks and governments could destroy wealth with impunity. Bitcoin emerged as the answer, a system where no central authority could print money, freeze accounts, or bail out bad actors at the public's expense.

Fifteen years later, the revolution has been co-opted.

XRP partners with central banks. HBAR is governed by Google, IBM, and Boeing. BlackRock manages Bitcoin ETFs. Governments launch Central Bank Digital Currencies. The institutions crypto was designed to bypass now control its infrastructure.

Axiom Protocol represents a different path, the original path. Through our Private Membership Association Trust structure, constitutional protections, and community-first tokenization, we are building what crypto was always meant to be: wealth and power in the hands of the people who create it.

This manifesto explains why institutional crypto betrays crypto's founding principles, how Axiom Protocol preserves them, and why the choice between these two visions will define the next era of digital finance.

KEY DISTINCTIONS

INSTITUTIONAL CRYPTO (XRP, HBAR, etc.)
- Governed by corporate councils and banking partners
- Designed to serve institutional capital flows
- Regulatory compliance as primary objective
- Tokenizes Wall Street assets for Wall Street players
- Centralized control with decentralized marketing
- Users are customers, not owners

AXIOM PROTOCOL
- Governed by member DAO with constitutional protections
- Designed to build community wealth
- Privacy and sovereignty as primary objectives
- Tokenizes Main Street assets for ordinary people
- Truly decentralized ownership and governance
- Members are owners, not customers

THE BOTTOM LINE

While institutional crypto asks "How can we make blockchain safe for banks?", Axiom asks "How can we make finance work for communities?"

This is not just a technical difference. It is a philosophical divide that determines who benefits from the next generation of financial infrastructure.

================================================================================
2. THE GREAT CRYPTO REVERSAL: HOW REBELLION BECAME REGULATION
================================================================================

THE ORIGINAL VISION (2009-2015)

When Satoshi Nakamoto published the Bitcoin whitepaper in 2008, the message was clear: "A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution."

The key phrase: WITHOUT going through a financial institution.

This was revolutionary. For the first time in history, people could transfer value globally without:
- Bank approval
- Government oversight
- Intermediary fees
- Identity verification
- Account freezes or seizures

Early adopters understood this. Bitcoin was not just a new payment method. It was a protest against a financial system that had just crashed the global economy and received trillions in bailouts while ordinary people lost their homes.

THE GOVERNMENT RESPONSE (2013-2020)

Governments initially responded with hostility:

2013: China bans financial institutions from Bitcoin transactions
2014: Russia declares Bitcoin illegal
2017: China bans cryptocurrency exchanges
2018: India proposes 10-year prison sentences for crypto holders
2019: US Treasury threatens regulations that would effectively ban self-custody

The message was consistent: cryptocurrency threatens our control over money, and we will stop it.

But they could not stop it. Despite every ban, restriction, and threat, adoption grew. By 2020, institutional investors were accumulating Bitcoin. The revolution was too big to suppress.

THE PIVOT: IF YOU CANNOT BEAT THEM, CO-OPT THEM (2020-PRESENT)

Unable to ban cryptocurrency, governments and institutions pivoted to a new strategy: embrace and extend.

2020: PayPal enables crypto purchases
2021: El Salvador adopts Bitcoin as legal tender (with IMF strings attached)
2022: BlackRock launches Bitcoin private trust
2023: Multiple spot Bitcoin ETF applications
2024: SEC approves spot Bitcoin ETFs
2025: Central Bank Digital Currencies proliferate globally

The institutions crypto was designed to bypass now manage much of its infrastructure:
- Coinbase (public company, SEC regulated) handles billions in transactions
- BlackRock controls billions in Bitcoin through ETFs
- Banks offer "crypto custody" (you give them your keys)
- Regulated exchanges require full identity verification

THE RESULT: CRYPTO WITH EXTRA STEPS

What was achieved?

For users: You can now buy Bitcoin through your bank. But they hold your keys, report your transactions, and can freeze your account on government request.

For institutions: They capture fees on every transaction, gain surveillance capabilities they never had with cash, and maintain control over who can participate in the financial system.

For the original vision: It is being systematically dismantled.

This is not adoption. This is absorption. The rebellion did not win. It was assimilated.

================================================================================
3. THE INSTITUTIONAL TAKEOVER: XRP, HBAR, AND CORPORATE CRYPTO
================================================================================

RIPPLE (XRP): THE BANKER'S CRYPTOCURRENCY

Ripple was never meant to replace banks. It was designed to make banks more efficient.

RIPPLE'S STATED MISSION:
"Enable the world to move money like information moves today" - by partnering with existing financial institutions.

RIPPLE'S GOVERNANCE:
- Ripple Labs (private company) controls the XRP Ledger's development
- Founders retained 80 billion XRP (80% of total supply)
- "Decentralization" means validators run by banks and financial institutions
- Major partners: Santander, American Express, Standard Chartered, Bank of America

WHAT RIPPLE TOKENIZES:
- Cross-border bank settlements
- Institutional remittances
- Corporate treasury operations
- Central Bank Digital Currency pilots

WHO BENEFITS:
- Banks reduce settlement times from days to seconds
- Ripple Labs profits from XRP sales and partnerships
- Institutional investors speculate on XRP price

WHO DOES NOT BENEFIT:
- Ordinary people still pay remittance fees
- Financial surveillance increases
- Banking access remains gatekept
- Wealth concentration continues

THE REALITY:
XRP does not replace the banking system. It upgrades the banking system's backend while preserving all existing power structures.

HEDERA (HBAR): THE CORPORATE COUNCIL COIN

Hedera represents the most explicit form of corporate crypto: governance by Fortune 500 committee.

HEDERA'S GOVERNING COUNCIL (39 MEMBERS):
Google, IBM, Boeing, Deutsche Telekom, LG Electronics, Nomura Holdings, Standard Bank, Tata Communications, Ubisoft, Wipro, and more.

Note: Not a single community organization. Not a single member-elected representative. Not a single ordinary person.

HEDERA'S GOVERNANCE MODEL:
- Council members pay $1 million+ for a seat
- Each member gets equal voting power
- Members serve 3-year terms
- Council controls all network decisions

WHAT HEDERA TOKENIZES:
- Enterprise supply chain tracking
- Corporate credential verification
- Institutional NFT markets
- Central Bank Digital Currency infrastructure

THE PITCH:
"Enterprise-grade" and "regulatory compliant" - coded language for "banks and governments approve of this."

THE REALITY:
Hedera is not a decentralized network. It is a consortium blockchain governed by the same corporations that control traditional finance. The "decentralization" is merely distributing control among oligarchs rather than a single entity.

THE PATTERN: REGULATORY CAPTURE

Both XRP and HBAR represent what political scientists call "regulatory capture" - when industries meant to be regulated instead control their regulators.

In crypto terms: The networks meant to bypass institutions are now controlled by institutions.

This is not a bug. It is the design.

================================================================================
4. THE AXIOM DIFFERENCE: A RETURN TO FIRST PRINCIPLES
================================================================================

AXIOM'S FOUNDING PRINCIPLES

Axiom Protocol was built on a simple question: What if we applied crypto's original vision to real-world assets that actually matter to ordinary people?

Not tokenized bonds for hedge funds. Not faster settlement for banks. Not enterprise supply chain tracking.

Instead:
- Homes for families trying to build wealth
- Savings circles for communities without bank access
- Infrastructure owned by the people who use it
- Social platforms that pay creators, not shareholders

AXIOM'S GOVERNANCE: MEMBERS, NOT CORPORATIONS

Unlike XRP (Ripple Labs) or HBAR (corporate council), Axiom is governed by its members through:

PRIVATE MEMBERSHIP ASSOCIATION TRUST
- Constitutional protections for member privacy
- Private contractual relationships outside public commerce
- No corporate board of directors
- No venture capital with special voting rights

DAO GOVERNANCE LAYER
- One token, one vote on proposals
- 7-day discussion periods for transparency
- Member-submitted proposals
- On-chain execution of decisions

THREE-ROLE TRUST STRUCTURE
- Grantor(s): Original trust settlers
- Board of Trustees (5-9): Fiduciary managers elected by members
- Protector Council (3): Independent oversight ensuring trustee compliance

COMPARE THIS TO:
- XRP: Ripple Labs controls development, founders hold majority supply
- HBAR: 39 corporations pay for council seats, no member representation

AXIOM'S TOKENIZATION: MAIN STREET ASSETS

While institutional platforms tokenize Wall Street products for Wall Street players, Axiom tokenizes Main Street assets for ordinary people:

KEYGROW: TOKENIZED RENT-TO-OWN
- 20% of rent goes toward equity
- ERC-1155 fractional property shares (100,000 per property)
- $500 Option Consideration staked at 8% APR
- Transparent on-chain equity tracking
- Path to homeownership, not perpetual renting

SUSU HUB: COMMUNITY SAVINGS CIRCLES
- Traditional rotating savings (ROSCA) on blockchain
- 2-50 members per pool
- Complete transparency on contributions and payouts
- No bank intermediaries or fees
- Cultural wealth-building tradition meets smart contracts

DEPIN NODES: MEMBER-OWNED INFRASTRUCTURE
- Decentralized physical infrastructure
- Node operators earn rewards
- Community owns the network
- No corporate data center dependency

LUMINA: CREATOR-OWNED SOCIAL PLATFORM
- Content creators earn AXM tokens
- No algorithmic suppression for monetization
- Community moderation, not corporate censorship
- Value flows to creators, not shareholders

THE FUNDAMENTAL DIFFERENCE:
Institutional crypto asks: "How do we tokenize assets for investors?"
Axiom asks: "How do we tokenize pathways to ownership for communities?"

================================================================================
5. CONSTITUTIONAL PROTECTION: THE PMA TRUST ADVANTAGE
================================================================================

WHY STRUCTURE MATTERS

Most crypto projects are structured as:
- Corporations (Delaware C-corps, Cayman entities)
- Foundations (Swiss, Singapore)
- DAOs with no legal wrapper

These structures offer no protection from regulatory overreach because they operate within public commerce.

Axiom chose a different path: the Private Membership Association Trust.

WHAT IS A PMA TRUST?

A Private Membership Association (PMA) is a private organization operating outside of public commerce under constitutional protections. When combined with a Trust structure, it creates a powerful legal framework for community-owned assets.

THE CONSTITUTIONAL FOUNDATION

The Axiom PMA Trust operates under six constitutional amendments:

FIRST AMENDMENT
"Congress shall make no law... abridging... the right of the people peaceably to assemble."

The Supreme Court has consistently upheld freedom of association, including NAACP v. Alabama (1958) and Roberts v. U.S. Jaycees (1984). Private associations have the right to form and operate without government interference.

Application: Axiom members have the constitutional right to associate privately and conduct their affairs outside public commerce.

FOURTH AMENDMENT
"The right of the people to be secure in their persons, houses, papers, and effects, against unreasonable searches and seizures."

Private association records are protected from warrantless government intrusion.

Application: Member transactions and communications within the PMA enjoy privacy protections not available in public crypto platforms.

FIFTH AMENDMENT
"No person shall be... deprived of life, liberty, or property, without due process of law."

Includes the fundamental right to contract and conduct private business affairs.

Application: Member agreements are private contracts with due process protections.

NINTH AMENDMENT
"The enumeration in the Constitution, of certain rights, shall not be construed to deny or disparage others retained by the people."

Rights not explicitly listed are still retained by the people.

Application: The right to form private economic associations is a retained right.

TENTH AMENDMENT
"The powers not delegated to the United States by the Constitution... are reserved to the States respectively, or to the people."

Powers not granted to federal government belong to the people.

Application: The power to create private membership economies is reserved to the people.

FOURTEENTH AMENDMENT
"No State shall... deprive any person of life, liberty, or property, without due process of law; nor deny to any person within its jurisdiction the equal protection of the laws."

State-level due process and equal protection.

Application: State regulations cannot arbitrarily target private associations.

WHAT THIS MEANS PRACTICALLY

For members:
- Transactions occur within private contractual relationships
- Member information protected from bulk surveillance
- Due process required before any enforcement action
- Constitutional standing to challenge overreach

For the protocol:
- Operations outside public commerce jurisdiction
- Reduced regulatory surface area
- Genuine legal basis for privacy (not just "we don't collect data")
- Precedent from 100+ years of PMA case law

COMPARE TO INSTITUTIONAL PLATFORMS:
- XRP: Ripple Labs sued by SEC, settled for structure changes
- HBAR: Operates as public enterprise network, full regulatory exposure
- Exchanges: KYC/AML requirements, transaction reporting, account freezes

The PMA Trust is not a loophole. It is the application of constitutional principles that have protected private associations for over a century.

================================================================================
6. TOKENIZING MAIN STREET VS WALL STREET
================================================================================

THE INSTITUTIONAL RWA AGENDA

Real World Asset (RWA) tokenization is the current focus of institutional crypto. The pitch: "Bring trillions in traditional assets on-chain."

What they're tokenizing:
- Treasury bonds and corporate debt
- Real estate investment trusts (REITs)
- Private equity funds
- Commodities and precious metals
- Art and collectibles (for wealthy collectors)

Who benefits:
- Asset managers charging tokenization fees
- Institutional investors gaining 24/7 liquidity
- Accredited investors (net worth $1M+ or income $200K+)
- Banks offering tokenized product custody

Who does NOT benefit:
- Regular people who cannot meet accreditation requirements
- Communities seeking wealth-building pathways
- First-time homebuyers priced out of markets
- Anyone without existing capital to invest

THE INSTITUTIONAL RWA PROBLEM

1. ACCREDITATION BARRIERS
Most tokenized securities still require "accredited investor" status, meaning:
- Net worth of $1 million (excluding primary residence), OR
- Annual income of $200,000 ($300,000 with spouse) for past two years

This excludes approximately 90% of Americans.

2. MINIMUM INVESTMENT REQUIREMENTS
Even "fractionalized" institutional RWAs typically require:
- $10,000 to $100,000 minimums
- KYC/AML verification
- Custody through approved intermediaries

3. VALUE EXTRACTION
Institutional tokenization adds layers of fees:
- Tokenization platform fees (1-3%)
- Custody fees (0.25-1% annually)
- Trading fees (0.1-0.5% per transaction)
- Management fees (1-2% annually)

Value flows from asset holders to intermediaries, not the other way around.

4. NO PATHWAY TO OWNERSHIP
Institutional RWAs let you invest IN assets. They do not help you OWN assets.

Buying shares of a tokenized REIT does not get you closer to owning a home. It makes you a passive investor in someone else's real estate empire.

AXIOM'S MAIN STREET APPROACH

Axiom tokenizes differently. Our goal is not to create new investment products for the wealthy. It is to create pathways to ownership for everyone.

KEYGROW: FROM RENTER TO OWNER

The Problem: 36% of Americans rent. Median rent is $1,400/month. After 10 years of renting, a tenant has built zero equity while paying $168,000 to a landlord.

Institutional Solution: Invest in REITs (if you're accredited and have capital).

Axiom Solution: KeyGrow turns rent payments into equity ownership.

How it works:
- Tenant pays monthly rent
- 20% of rent purchases property shares (ERC-1155)
- Each property has 100,000 tokenized shares
- Tenant tracks equity growth on-chain
- After accumulating sufficient equity, tenant can purchase property

Example:
- Rent: $1,500/month
- Equity portion: $300/month (20%)
- After 5 years: $18,000 in property equity
- Plus: $500 Option Consideration staked at 8% APR = ~$734 additional value

This is not investing in real estate. This is BECOMING a real estate owner through the rent you already pay.

SUSU HUB: COMMUNITY-POWERED SAVINGS

The Problem: 22% of Americans are unbanked or underbanked. Traditional savings products offer 0.01-0.5% interest while charging fees that erode balances.

Institutional Solution: Tokenized money market funds (minimum investment required, accreditation often required).

Axiom Solution: SUSU rotating savings circles.

How it works:
- 2-50 members join a pool
- Each member contributes fixed amount per cycle
- Each cycle, one member receives the entire pool
- Rotation continues until all members have received
- Smart contracts ensure transparency and execution

Example:
- 12 members contribute $500/month
- Each month, one member receives $6,000
- After 12 months, everyone has received once
- Zero interest charges, zero bank fees, zero intermediaries

This is not a new financial product. It is a centuries-old community practice made transparent through blockchain.

THE PHILOSOPHICAL DIFFERENCE

Institutional RWA: "How can blockchain make existing finance more efficient?"
Axiom RWA: "How can blockchain create finance that serves people who existing finance ignores?"

================================================================================
7. THE SOVEREIGN MEMBERSHIP ECONOMY MODEL
================================================================================

BEYOND DECENTRALIZATION: SOVEREIGNTY

"Decentralized" has become a marketing term. Projects claim decentralization while:
- Founders hold majority token supply
- Development is controlled by single companies
- Governance proposals require insider approval
- Validator sets are permissioned

Axiom uses a different framework: SOVEREIGNTY.

Sovereignty means:
- Members control their own assets (self-custody)
- Members control protocol governance (DAO voting)
- Members control their data (privacy by design)
- Members control their participation (voluntary association)

THE SOVEREIGN MEMBERSHIP ECONOMY

Traditional Economy:
You are a consumer. You buy products and services. Value flows to corporations and shareholders. You have no ownership stake in the systems you use.

Platform Economy:
You are a user. You create value (content, data, network effects). Platforms capture that value. You have no ownership stake and can be deplatformed anytime.

Sovereign Membership Economy:
You are a member-owner. You participate in governance. Value flows back to members. You cannot be arbitrarily removed (due process required).

AXIOM'S SOVEREIGN MEMBERSHIP BENEFITS

1. OWNERSHIP THROUGH PARTICIPATION

Every interaction builds ownership:
- Rent payments become property equity (KeyGrow)
- Savings contributions earn SUSU distributions
- Node operation earns infrastructure rewards (DePIN)
- Content creation earns token rewards (Lumina)
- Governance participation influences protocol direction

2. CONSTITUTIONAL PRIVACY

Unlike public commerce platforms:
- No warrantless data sharing
- No bulk transaction surveillance
- Private contractual relationships
- PMA shield against overreach

3. MEMBER-CONTROLLED TREASURY

Protocol fees flow to member-controlled treasury:
- No venture capital extraction
- No shareholder dividends to outsiders
- Community votes on allocation
- Transparent on-chain accounting

4. PORTABLE IDENTITY AND REPUTATION

Your membership is yours:
- Self-sovereign identity
- On-chain reputation history
- Portable across ecosystem services
- Not dependent on any single platform

5. DUE PROCESS PROTECTIONS

Unlike platforms that can ban arbitrarily:
- Written notice of any allegations
- Opportunity to respond
- Hearing before disciplinary committee
- Appeal rights to Protector Council

THE ECONOMIC LOOP

Traditional model: Users --> Platform --> Shareholders --> Users (trickle down)

Axiom model: Members --> Protocol --> Treasury --> Members (direct circulation)

Value created by members returns to members. The protocol is infrastructure for member wealth-building, not a value extraction mechanism.

================================================================================
8. HEAD-TO-HEAD COMPARISON: AXIOM VS INSTITUTIONAL PLATFORMS
================================================================================

GOVERNANCE COMPARISON

Category: Who Controls the Network?

XRP (Ripple):
- Ripple Labs controls development
- Founders retained 80B XRP (80% of supply)
- "Validators" are banks and institutions
- No member voting on protocol changes

HBAR (Hedera):
- 39-member corporate council
- $1M+ for a council seat
- Google, IBM, Boeing make decisions
- Zero community representation

AXIOM:
- Member DAO with one-token-one-vote
- 5-9 Trustees elected by members
- 3-member Protector Council for oversight
- All members can submit proposals

Winner: Axiom (genuine member control)

PRIVACY COMPARISON

Category: How is User Data Handled?

XRP:
- Full KYC/AML on all partner exchanges
- Transaction graph publicly visible
- Ripple partners with regulatory bodies
- No privacy protections

HBAR:
- Enterprise compliance by design
- Full transparency for regulatory approval
- Council includes regulated entities
- Privacy is antithetical to model

AXIOM:
- PMA Trust constitutional protections
- Private contractual relationships
- No bulk surveillance participation
- Due process required for any data access

Winner: Axiom (constitutional privacy framework)

ACCESSIBILITY COMPARISON

Category: Who Can Participate?

XRP:
- Anyone can buy XRP tokens
- Actual services require institutional relationships
- Retail users are speculators, not participants
- No pathway from user to owner

HBAR:
- Anyone can buy HBAR tokens
- Enterprise services require contracts
- Retail users are speculators, not participants
- $1M+ required for governance participation

AXIOM:
- Standard Membership: 100 AXM
- Founding Membership: 1,000 AXM
- All members get governance rights
- Pathway from renter to owner (KeyGrow)

Winner: Axiom (accessible with real participation rights)

WEALTH BUILDING COMPARISON

Category: How Do Ordinary Users Build Wealth?

XRP:
- Buy tokens, hope price goes up
- No productive use for retail holders
- Value accrues to Ripple Labs and partners
- Speculation, not wealth building

HBAR:
- Buy tokens, hope price goes up
- No productive use for retail holders
- Value accrues to council members
- Speculation, not wealth building

AXIOM:
- Rent-to-own equity (KeyGrow)
- Community savings returns (SUSU)
- Infrastructure rewards (DePIN)
- Creator payments (Lumina)
- Staking rewards (8% APR)
- Governance participation

Winner: Axiom (multiple productive wealth-building pathways)

REGULATORY APPROACH COMPARISON

Category: Relationship with Regulators

XRP:
- Active partnership with regulators
- Fought SEC lawsuit then settled
- Seeking regulatory approval
- Will comply with any requirements

HBAR:
- "Regulatory compliant by design"
- Council includes regulated entities
- Seeking government adoption
- Built for institutional comfort

AXIOM:
- PMA Trust outside public commerce
- Constitutional protection framework
- Private contractual relationships
- Operates in private domain

Winner: Axiom (constitutional sovereignty vs regulatory submission)

SUMMARY SCORECARD

Governance: Axiom
Privacy: Axiom
Accessibility: Axiom
Wealth Building: Axiom
Regulatory Sovereignty: Axiom

Overall: Axiom wins on every metric that matters for ordinary people.

================================================================================
9. THE CASE FOR COMMUNITY WEALTH BUILDING
================================================================================

THE WEALTH GAP REALITY

Current statistics:
- Top 1% owns more wealth than bottom 90% combined
- Median American has $5,300 in savings
- 64% of Americans live paycheck to paycheck
- Homeownership rate declining for under-35 demographic
- Wealth gap between white and Black families: 6:1 ratio

Traditional finance has not solved these problems. It has accelerated them.

Institutional crypto will not solve these problems either. It is designed to serve institutional capital, not community wealth building.

WHY INSTITUTIONAL CRYPTO FAILS ORDINARY PEOPLE

1. ACCESS BARRIERS
Tokenized securities require accreditation. Most people do not qualify.

2. CAPITAL REQUIREMENTS
Minimum investments exclude those without existing wealth.

3. VALUE EXTRACTION
Fees flow to intermediaries, not participants.

4. NO OWNERSHIP PATHWAY
Investing in assets is not the same as owning assets.

5. SPECULATION OVER PRODUCTION
Buying tokens and hoping for price appreciation is not wealth building.

THE COMMUNITY WEALTH BUILDING MODEL

Axiom's approach creates wealth through participation, not speculation:

KEYGROW: EQUITY THROUGH HABITATION
You already pay rent. KeyGrow turns that expense into equity ownership. After years of participation, you own property, not just shares in someone else's property portfolio.

SUSU: SAVINGS THROUGH SOLIDARITY
Communities have used rotating savings for centuries. SUSU brings this on-chain, letting communities build wealth collectively without bank intermediaries extracting fees.

DEPIN: INCOME THROUGH INFRASTRUCTURE
Instead of corporations owning data centers, members own nodes. Infrastructure rewards flow to operators, not shareholders.

LUMINA: VALUE THROUGH CREATION
Creators generate value. On traditional platforms, that value flows to shareholders. On Lumina, it flows to creators.

THE MULTIPLIER EFFECT

When wealth stays in communities, it multiplies:
- Local spending supports local businesses
- Homeownership stabilizes neighborhoods
- Savings enable entrepreneurship
- Infrastructure ownership generates ongoing income

When wealth is extracted to institutions, it disappears:
- Rent payments enrich distant landlords
- Bank fees flow to shareholder dividends
- Platform value goes to VC exits
- Infrastructure profits fund corporate expansion

Axiom keeps value circulating within the membership economy.

================================================================================
10. MARKETING FRAMEWORK AND MESSAGING GUIDE
================================================================================

CORE POSITIONING

Primary Message:
"Axiom Protocol: The People's Alternative to Institutional Crypto"

Supporting Message:
"While Wall Street tokenizes their assets, we're tokenizing yours."

Brand Promise:
"Sovereignty, privacy, and community wealth building through constitutional protection."

TARGET AUDIENCES

AUDIENCE 1: CRYPTO-NATIVE SKEPTICS
- Early adopters disillusioned by institutional takeover
- Value original cypherpunk ethos
- Privacy-focused
- Distrust venture-backed projects

Messaging: "Remember why you got into crypto? We do too. Axiom is building what Bitcoin promised: financial sovereignty for the people."

AUDIENCE 2: HOUSING-SEEKERS
- Renters frustrated by rising costs
- First-time homebuyer hopefuls
- Those priced out of traditional markets
- Value tangible asset ownership

Messaging: "Stop paying your landlord's mortgage. KeyGrow turns your rent into ownership, one payment at a time."

AUDIENCE 3: COMMUNITY BUILDERS
- Cultural groups with savings circle traditions
- Community organizers
- Those underserved by traditional banking
- Value collective action

Messaging: "Your community has always known how to build wealth together. SUSU brings that tradition on-chain with complete transparency."

AUDIENCE 4: CREATOR ECONOMY
- Content creators
- Artists and musicians
- Those frustrated by platform extraction
- Value fair compensation

Messaging: "On other platforms, you create value. They capture it. On Lumina, creators own their success."

KEY TALKING POINTS

CONSTITUTIONAL PROTECTION
"Axiom operates as a Private Membership Association Trust, protected by the First, Fourth, Fifth, Ninth, Tenth, and Fourteenth Amendments. We're not asking for regulatory permission. We're exercising constitutional rights."

GOVERNANCE CONTRAST
"XRP is controlled by Ripple Labs. HBAR is governed by Google, IBM, and Boeing. Axiom is governed by its members. Period."

WEALTH BUILDING
"Institutional crypto creates new investment products for the wealthy. Axiom creates pathways to ownership for everyone."

OWNERSHIP
"On institutional platforms, you're a user. On Axiom, you're an owner. Every rent payment, every savings contribution, every piece of content builds your stake in the ecosystem."

CONTENT SERIES IDEAS

BLOG/ARTICLE SERIES: "CRYPTO THEN VS NOW"
1. "The Original Promise: Why Bitcoin Was Revolutionary"
2. "The Institutional Takeover: How Banks Captured Crypto"
3. "The PMA Alternative: Constitutional Protection in the Digital Age"
4. "Main Street vs Wall Street: Two Visions of Tokenization"
5. "The Sovereign Membership Economy: A New Model"

VIDEO SERIES: "WHO REALLY CONTROLS YOUR CRYPTO?"
1. "Inside Ripple Labs: The Corporation Behind XRP"
2. "Hedera's Billion-Dollar Council: Corporate Governance Exposed"
3. "BlackRock's Bitcoin: What ETF Custody Really Means"
4. "The Axiom Difference: Member-Owned, Member-Governed"

SOCIAL MEDIA THEMES

Weekly Theme Rotation:
- Monday: Constitutional Protection content
- Tuesday: KeyGrow homeownership stories
- Wednesday: SUSU community features
- Thursday: Governance and voting highlights
- Friday: Creator economy and Lumina
- Saturday: DePIN and infrastructure
- Sunday: Community spotlight

HASHTAG STRATEGY

Primary: #AxiomProtocol #PeoplesRWA #SovereignMembership
Secondary: #CryptoForThePeople #MainStreetTokenization #ConstitutionalCrypto
Contrast: #NotYourBanksBlockchain #DecentralizedForReal #MemberOwned

================================================================================
11. CALL TO ACTION: JOIN THE MOVEMENT
================================================================================

THE CHOICE IS CLEAR

You have two options:

OPTION A: INSTITUTIONAL CRYPTO
- Buy tokens controlled by corporations
- Hope prices go up
- Watch wealth flow to shareholders
- Accept surveillance and compliance
- Remain a user, never an owner

OPTION B: AXIOM PROTOCOL
- Join a member-owned economy
- Build wealth through participation
- Keep value circulating in community
- Exercise constitutional privacy rights
- Become an owner, not just a user

THE FOUNDING MEMBER OPPORTUNITY

Right now, Axiom is accepting Founding Members.

For 1,000 AXM, you receive:
- Enhanced governance rights
- 2x voting multiplier
- Early access to all features
- Founding Member NFT badge
- Priority support
- Voice in shaping the protocol's future

This window closes after 12 months.

HOW TO JOIN

1. Visit axiomprotocol.io/pma
2. Review the Declaration of Trust, Bylaws, and Membership Agreement
3. Complete the membership application
4. Receive your Membership Tokens
5. Begin participating in the Sovereign Membership Economy

THE FUTURE WE'RE BUILDING

Imagine a future where:
- Renters become homeowners through tokenized equity
- Communities build wealth through transparent savings circles
- Creators own the value they create
- Infrastructure is owned by the people who use it
- Privacy is a right, not a luxury
- Governance is truly by the people

This is not speculation. This is construction. Every member who joins, every rent payment that becomes equity, every SUSU circle that launches, every node that comes online builds this future.

The institutions had their chance. They chose extraction over inclusion, surveillance over privacy, control over sovereignty.

Now it's our turn.

Join Axiom Protocol. Become a founding member of the Sovereign Membership Economy.

Because crypto was always meant to be for the people.

Let's build it that way.

================================================================================
DOCUMENT RESOURCES
================================================================================

Website: axiomprotocol.io
PMA Information: axiomprotocol.io/pma
Membership Application: axiomprotocol.io/pma/join
Legal Documents: axiomprotocol.io/pma/declaration

GitHub: github.com/AxiomProtocol/AXIOM

Contract Verification: 24 verified contracts on Arbitrum One

================================================================================
END OF MANIFESTO
================================================================================

Document Version: 1.0
Created: December 2025
Author: Axiom Protocol
Classification: Public Marketing Material
`;

  const requests = [
    {
      insertText: {
        location: { index: 1 },
        text: content
      }
    }
  ];

  await docs.documents.batchUpdate({
    documentId,
    requestBody: { requests }
  });

  console.log('\nManifesto created successfully!');
  console.log('Document URL: https://docs.google.com/document/d/' + documentId + '/edit');
  
  return documentId;
}

createManifestoDocument().catch(console.error);
