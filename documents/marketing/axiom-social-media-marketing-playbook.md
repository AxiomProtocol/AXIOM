# Axiom Protocol — Social Media & Marketing Playbook

**Prepared:** April 2026
**Methodology:** Content Machine (platform mechanics) · Design Thinker (audience + adoption forces) · Deep Research (factual codebase scan of all live pages)
**Source:** All product claims verified directly from live page code and configuration. No placeholder data.

---

## 1. Brand Voice

### Tone Principles
- **Institutional, not corporate.** Write like a founder who understands both Wall Street and Main Street.
- **Specific, not vague.** Use exact figures from the system ("14% annual rate, 1,400 bps" — not "attractive yields").
- **Sovereign, not dependent.** The frame is always self-custody, on-chain verification, independence from legacy gatekeepers.
- **Factual, not promotional.** Every claim is verifiable on-chain or via the public solvency console.

### Voice Spectrum
| Register | When to Use | Example |
|---|---|---|
| Institutional | Lending Fund, Syndication, Capital Program, AXAU | "Every loan is secured by a recorded first-lien position. Maximum LTV: 70%." |
| Community | Wealth Practice, Community Credit, Savings | "Your group builds together. Your payout is guaranteed by the pool." |
| Technical | DEX, AXUSD, Earn Vault, Payment Rails | "ERC-3643 identity credential required. On-chain mint gate enforced." |
| Urgent / Access | AXAU Early Access, Capital Program launches | "Limited. Accredited only. Apply today." |

### Banned Openers (Content Machine Rule)
Never begin any post with: "I'm excited to share," "Hey everyone," "As a founder," "In today's fast-paced world," "We are proud to announce."

---

## 2. Audience Personas (Design Thinker — JTBD Framework)

### Persona A — The Aspiring Wealth Builder
**Who:** Black and brown professional, 28–45, household income $75K–$200K, has income but limited access to institutional investment vehicles. Likely already does informal savings groups or ROSCAs.

**Job To Be Done:** "Help me build generational wealth the way institutions do — but designed for people like me."

**Push Forces (driving them to switch):**
- Legacy financial institutions offer savings accounts at near-zero rates
- Traditional real estate is out of reach without connections or $50K minimums
- Crypto feels risky and unstructured; DeFi is confusing

**Pull Forces (drawn toward Axiom):**
- Community-native savings model (Wealth Practice) feels familiar
- AXUSD stablecoin removes crypto volatility
- FDIC-insured Nexus Card bridges digital and physical finance
- On-chain transparency: they can verify the system themselves

**Anxiety Forces (blocking adoption):**
- "Is my money safe in a smart contract?"
- "What if the protocol is a scam?"
- "I don't understand wallets or gas fees"

**Habit Forces (keeping them away):**
- Already using Chase, Wells Fargo, CashApp for savings
- Informal savings groups managed via text message work "well enough"

**Key Insight:** Adoption happens when the community model (Wealth Practice) reduces anxiety. Lead with familiarity, follow with on-chain proof.

---

### Persona B — The Accredited Real Estate Allocator
**Who:** Accredited investor, 38–60, net worth $1M+, allocates into private real estate deals. Familiar with Reg D, K-1s, bridge loans, DSCR.

**Job To Be Done:** "Find yield on real property debt with institutional-grade underwriting, documented on-chain."

**Push Forces:**
- Traditional bridge loan funds charge high management fees with opaque reporting
- Cap rates compressed; hard money at 12–16% with no transparency

**Pull Forces:**
- 14% annual rate (1,400 bps), maximum 70% LTV, first-lien secured
- Hash-chained on-chain audit trail independently verifiable
- AXUSD settlement removes FX/bank wire friction
- SEC Reg D 506(c) — familiar compliance framework

**Anxiety Forces:**
- "What is AXUSD — is it stable?"
- "Is on-chain settlement legally enforceable?"
- "What happens at default?"

**Habit Forces:**
- Already working with established HML or private credit funds
- Relationship-driven deal flow is the existing norm

**Key Insight:** Lead with 70% LTV + first-lien + 14% rate. The on-chain audit trail is the differentiator, not the hook.

---

### Persona C — The Web3-Native Allocator
**Who:** DeFi-native, 25–40, holds ETH/BTC/stablecoins, allocates into DeFi protocols, understands ERC-4626 vaults, Euler, liquidity pools.

**Job To Be Done:** "Find real-world yield backed by hard assets, not algorithmic emissions."

**Push Forces:**
- Yield farms collapse; algorithmic stablecoins have failed
- Pure DeFi feels divorced from real-world value creation

**Pull Forces:**
- AXAU is structured around PAXG (Paxos Gold), coverage ratio enforced on-chain (≥105% before every mint)
- ERC-4626 Earn AXUSD vault on Euler
- ERC-3643 compliance — institutional-grade identity layer
- Arbitrum One — low gas, battle-tested

**Anxiety Forces:**
- "Is the oracle trustworthy? What if it fails?"
- "Is the team doxxed? What's the governance model?"

**Habit Forces:**
- Already earning yield on Aave/Compound/Euler with established protocols

**Key Insight:** Lead with the hard asset proof (PAXG reserve, on-chain coverage enforcement). The ERC-3643 identity layer is a trust signal, not a friction point.

---

## 3. How Might We Statements (Design Thinker)

| Audience | HMW Statement |
|---|---|
| Persona A | HMW help community members start building wealth with $50/month while feeling as secure as a bank account? |
| Persona B | HMW give accredited real estate allocators institutional-grade bridge loan exposure with on-chain transparency they can verify themselves? |
| Persona C | HMW give DeFi-native allocators hard-asset-backed yield that survives the next market cycle? |

---

## 4. Product Catalog — All Verified Facts

All claims below come directly from live page source code and configuration. No approximations or placeholders.

### 4.1 AXAU — Reserve Instrument
- **Type:** ERC-721 (reserve unit), Arbitrum One. Status: LIVE.
- **Reserve backing:** Structured around PAXG (Paxos Gold) on Arbitrum One.
- **GoldVault contract:** `0xaCc9…CF8` — holds all gold reserves.
- **Coverage enforcement:** NAVEngine reads Chainlink XAU/USD oracle. Coverage ratio (Reserve USD ÷ Supply USD) must be ≥105% before every mint. Cannot over-issue by design.
- **Identity gate:** ERC-3643 on-chain identity credential required. Unregistered wallets are rejected on-chain.
- **Mint paths:**
  - Path A: PAXG → AXAU. One transaction. Instant.
  - Path B: Assisted (fiat → USDC → AXUSD → AXAU via the on-ramp).
- **Early Access:** Application page live at `/axau-early-access`. Global — US, Canada, UK, Australia, Germany, France, Netherlands, Switzerland, Singapore, UAE, Nigeria, Ghana, Kenya, South Africa, Jamaica, Trinidad, Barbados, Bahamas, Bermuda, Brazil, Mexico, Japan, South Korea, India, and others.

### 4.2 AXUSD — Settlement Rail (ERC-3643)
- **Type:** ERC-3643 stablecoin, Arbitrum One.
- **KYC:** Automated KYC via ERC-3643 identity layer. Transfers are identity-gated.
- **Peg:** 1 AXUSD = 1 USD. ERC-7726 oracle infrastructure.
- **Interoperability:** Used as settlement currency across Lending Fund, Earn vault, Capital Program, Syndication, On/Off Ramp.

### 4.3 Earn AXUSD — Yield Vault
- **Type:** ERC-4626 yield vault, Euler Earn, Arbitrum One.
- **Contract:** `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B`
- **Status:** Bootstrap / Pre-Live. Recognized by Euler Earn factory perspective. Not yet operating as a live yield product. Deposits currently inactive. Displayed for wallet connection and balance tracking only.
- **Pre-launch conditions:** Oracle adapter registration with Euler governance, canonical EVK vault deployment, strategy migration, ownership transfer to Axiom Risk Council Safe.

### 4.4 Lending Fund — Layer 03
- **Description:** Purpose-built bridge capital for real asset acquisition.
- **Rate:** 14% annual (1,400 bps). Variable — not guaranteed.
- **LTV:** Maximum 70% loan-to-value.
- **Collateral:** Every loan secured by recorded first-lien position on real property.
- **Settlement:** Denominated and settled in AXUSD on Arbitrum One.
- **Audit trail:** Hash-chained on-chain audit trail independently verifiable.
- **Compliance:** SEC Reg D 506(c). Accredited participants only.
- **Layer:** Layer 03 of the Axiom financial operating system.

### 4.5 Capital Program
- **Program size:** $1M dual-asset program.
- **Purpose:** Community-driven real estate participation at scale.
- **Settlement:** ACH/wire (off-chain) or AXUSD on Arbitrum One (on-chain).
- **On-chain records:** AXIOMCreditMarket and FixFlip/DSCR vaults provide immutable accounting of LP positions and distributions.
- **Off-chain docs:** Subscription agreements, capital call notices, K-1s per SEC Reg D 506(c).
- **Compliance:** SEC Reg D 506(c). Accredited investors only.

### 4.6 Syndication — Private Capital Formation
- **Offering types:** Reg D 506(b) and 506(c).
- **On-chain LP accounting:** AXIOMCreditMarket v7, FixFlip/DSCR vaults.
- **Settlement:** ACH/wire off-chain or AXUSD on-chain.
- **Documentation:** K-1s maintained per Reg D requirements.
- **Restriction:** Verified accredited investors only. Projected returns are forward-looking estimates — not guarantees.

### 4.7 The Wealth Practice
- **Model:** Community group wealth building inspired by traditional SUSU/ROSCA savings circle model. Three-stage trust pipeline.
- **Structure:** Regional Hubs → Groups → Members. Active hubs include Atlanta, Houston, and Charlotte regions.
- **Parameters:** Each group has configurable contribution amount, contribution frequency, max members, min members to activate, and a trust score.
- **Distinction:** This is a community-native wealth accumulation tool — not a savings account, not a money market fund.

### 4.8 Community Entry Credit
- **Description:** Credit line for community members. AXUSD disbursed to wallet upon approval.
- **Underwriting:** No bank credit check. No collateral required. No crypto overcollateralization. Credit limit determined by GEF (Governance Eligibility Factor) tier.
- **Repayment:** 30, 60, or 90-day terms depending on purpose.
- **Process:** Connect wallet → prove ownership → state W-2 income → request credit line → instant Evaluation Agent review.
- **Interest:** Paid interest distributed to the community junior pool.

### 4.9 AXUSD Yield Savings
- **Description:** Deposit AXUSD, earn yield, withdraw anytime.
- **Rate:** Variable — not guaranteed.
- **Process:** Deposit AXUSD → yield accrues → withdraw anytime.

### 4.10 Nexus Card — Banking
- **Issuer:** First Internet Bank. Member FDIC.
- **Network:** Visa and Mastercard debit. Accepted worldwide.
- **FDIC coverage:** Up to $250,000 per depositor category.
- **Features:** Virtual card (available immediately on issuance), physical card (ATM access nationwide), instant freeze/unfreeze in-browser, instant payouts from LP distributions and fund returns, full card details revealed securely in-browser.
- **ATM:** Visa network nationwide. Fee reimbursement policy per cardholder agreement.

### 4.11 On / Off Ramp — Capital Stack Entry
- **Flow:** Fiat → USDC via Coinbase Pay → AXUSD via PSM (approve + swap on-chain via wagmi) → AXAU via purchase queue.
- **Destination options:** 3 selectable destinations.
- **Identity gate:** AXAU request is identity-gated.
- **Provider:** Coinbase Pay integration (cbpay-js widget).

### 4.12 Axiom Rail — Payment Infrastructure (Layer 00)
- **Type:** Stellar SEP-compliant anchor.
- **Settlement:** Increase FDIC-insured ACH and domestic wire.
- **Assets:** USDC, AXUSD, AXAU.
- **Functions:** Deposit, withdrawal, direct payment, DAO payroll batch disbursement, rent collection.
- **Payroll:** Batch USDC disbursements to DAO contributors, settled as USD via Increase ACH/wire.
- **Rent Collection:** Identity-verified landlord rent collection, setup + payment + dashboard, settled via Increase ACH/wire.

### 4.13 Protocol Exchange — DEX (Layer 01.5)
- **Type:** Settlement Conversion Layer on Arbitrum One.
- **Infrastructure:** Camelot concentrated liquidity pools.
- **Features:** Concentrated liquidity depth, arbitrage closure loop, reserve conversion path, peg defense threshold.
- **Assets:** AXUSD primary trading pair.

### 4.14 DePIN Network (DeNet)
- **Type:** Decentralized storage infrastructure.
- **Integration:** DeNet decentralized storage nodes.

### 4.15 Secondary Network
- **Type:** Permissioned secondary layer for Axiom-issued private market products.
- **Function:** Secondary trading for LP positions and private market instruments issued through Axiom.

---

## 5. Platform Strategy (Content Machine — 2026 Specs)

### Platform Allocation by Persona

| Platform | Primary Audience | Content Focus |
|---|---|---|
| LinkedIn | Persona B (Accredited Allocator) | Lending Fund, Capital Program, Syndication, Solvency |
| X / Twitter | Persona C (Web3 Native) | AXUSD, AXAU, Earn Vault, DEX, on-chain proofs |
| Instagram Feed | Persona A (Wealth Builder) | Wealth Practice, Nexus Card, On/Off Ramp, Community Credit |
| Instagram Stories | Persona A (Wealth Builder) | Single-concept strips, polls, AXAU Early Access CTAs |
| TikTok | Persona A (younger, 22–35) | Education: "What is AXUSD?", "How the Wealth Practice works" |
| Threads | Persona A + C crossover | Shorter takes from X threads, product updates |

---

## 6. Per-Product Content — Platform-Ready Copy

All copy below is validated against platform truncation rules. LinkedIn hook ≤110 chars (mobile). Instagram feed hook ≤125 chars. X hook ≤280 chars.

---

### 6.1 AXAU Early Access

#### LinkedIn Post (Hook ≤ 110 chars)
```
Gold-backed. Coverage-enforced on-chain. Early Access is now open.
```
**Full post (800–1,000 chars):**
```
Gold-backed. Coverage-enforced on-chain. Early Access is now open.

AXAU is the Axiom Protocol's reserve unit — not a gold ETF, not a wrapped token.

Here's what makes it different:

— Reserve is structured around PAXG (Paxos Gold) on Arbitrum One
— NAVEngine reads a live Chainlink XAU/USD oracle before every mint
— Coverage ratio must be ≥105% to proceed. The system cannot over-issue by design.
— ERC-3643 identity credential required. Every participant is verified on-chain.

Two access paths:
Path A: PAXG → AXAU. One transaction.
Path B: Fiat → USDC → AXUSD → AXAU via the guided on-ramp.

Early Access is now open to accredited participants in 25+ countries.

This is not a promise of return. It is a reserve instrument with verifiable, on-chain coverage enforcement.

Apply at axiomprotocol.app/axau-early-access

#RealAssets #OnChainFinance #GoldReserve #AlternativeInvestments #Web3
```

#### X / Twitter Thread
```
Tweet 1:
Gold-backed. On-chain coverage enforcement. Early access open.

AXAU is the Axiom Protocol's reserve unit.

Here's how the mint gate actually works 🧵

Tweet 2:
Before every AXAU mint, NAVEngine reads the Chainlink XAU/USD oracle.

Coverage ratio = Reserve USD ÷ Supply USD

Must be ≥105%.

If it falls below, the contract blocks the mint. Not a policy. Code.

Tweet 3:
The reserve is held in the GoldVault contract — structured around PAXG (Paxos Gold) on Arbitrum One.

Every reserve position is on-chain. No custodial intermediary.

Tweet 4:
Two ways to access:

Path A: PAXG → AXAU. One transaction. Instant.
Path B: Fiat → USDC → AXUSD → AXAU. Guided flow.

Identity credential (ERC-3643) required for both. Permissioned by design.

Tweet 5:
Early Access is open to participants in 25+ countries — US, UK, Nigeria, Ghana, Kenya, Singapore, UAE, Jamaica, and more.

Accredited participants. Variable exposure. Not a guaranteed return.

Apply: axiomprotocol.app/axau-early-access
```

#### Instagram Feed Caption (Hook ≤ 125 chars)
```
Gold reserve. On-chain coverage enforcement. Not a promise — a mechanism.

AXAU Early Access is now open.

What AXAU is:
→ A reserve unit structured around PAXG (Paxos Gold)
→ On Arbitrum One — coverage enforced before every mint
→ Coverage ratio ≥105% required. The system literally cannot over-issue.
→ ERC-3643 identity required — every participant is verified

Available in 25+ countries. Accredited participants.

Link in bio → axiomprotocol.app/axau-early-access

#AXAU #GoldBacked #OnChain #RealAssets #Web3Finance #BlockchainInvesting
```

#### Instagram Story (Safe zone: 14%–80% from top. Single line. No clutter.)
**Frame 1:**
```
[HEADLINE] Early Access. Now open.
[SUBLINE] AXAU — gold reserve, on-chain.
[CTA STRIP] Tap to apply →
```

---

### 6.2 Lending Fund

#### LinkedIn Post
```
14% annual. 70% max LTV. First-lien secured. Verified on-chain.
```
**Full post:**
```
14% annual. 70% max LTV. First-lien secured. Verified on-chain.

That's not a pitch. That's the Axiom Lending Fund parameters — readable on the solvency console, verifiable by anyone.

Every loan on the Axiom Lending Fund:
— Secured by a recorded first-lien position on real property
— Underwritten at a maximum 70% loan-to-value
— Denominated and settled in AXUSD on Arbitrum One
— Recorded in a hash-chained on-chain audit trail

Target return is 14% annual (1,400 bps). Variable — not guaranteed. Designed to align with SEC Reg D 506(c). Accredited participants only.

This is Layer 03 of the Axiom financial operating system. Bridge capital for real asset acquisition.

No narrative. Verify the loan ledger yourself.

axiomprotocol.app/lending-fund

#BridgeLending #PrivateCredit #RealEstate #AccreditedInvestor #OnChain #RegD
```

#### X Thread
```
Tweet 1:
Bridge lending with an on-chain audit trail.

14% annual. 70% max LTV. First-lien only.

Here's what that actually means for your capital 🧵

Tweet 2:
Every Axiom Lending Fund loan:

→ Secured by recorded first-lien position on real property
→ Maximum 70% LTV — meaningful collateral cushion
→ Denominated in AXUSD — stable settlement, no FX risk

Tweet 3:
Settlement happens on Arbitrum One.

Every loan is recorded in a hash-chained audit trail.

Any participant can verify it independently. No trust required.

Tweet 4:
Rate: 14% annual (1,400 bps)
Compliance: SEC Reg D 506(c)
Access: Accredited participants only
Target return: Variable — not guaranteed

Tweet 5:
This is Layer 03 of the Axiom financial OS.

Built for real asset acquisition. Not speculation.

Verify the ledger: axiomprotocol.app/lending-fund
```

---

### 6.3 Capital Program

#### LinkedIn Post
```
$1M. Dual-asset. Community-driven real estate. Live on-chain.
```
**Full post:**
```
$1M. Dual-asset. Community-driven real estate. Live on-chain.

The Axiom Capital Program is designed to demonstrate what community-driven real estate participation looks like at scale.

Here's how it works:

Capital comes in via ACH/wire or on-chain via AXUSD on Arbitrum One.
The Axiom operations team executes physical closings, title transfers, and asset management.
LP positions and distributions are recorded on-chain via AXIOMCreditMarket and FixFlip/DSCR vaults.
Off-chain documentation — subscription agreements, capital call notices, K-1s — maintained per Reg D 506(c).

All figures shown on the program page are live data from the program ledger. Not projected. Not estimated.

Target returns are forward-looking — not guarantees. SEC Reg D 506(c). Accredited investors only.

axiomprotocol.app/pilot

#RealEstate #PrivateEquity #CommunityWealth #RegD #OnChain #AlternativeAssets
```

---

### 6.4 Syndication

#### LinkedIn Post
```
Private real estate capital formation. LP positions recorded on-chain.
```
**Full post:**
```
Private real estate capital formation. LP positions recorded on-chain.

Axiom Syndication offers Reg D 506(b) and 506(c) exempt offerings for verified accredited investors.

What that means in practice:

→ Subscribe via ACH/wire or AXUSD on Arbitrum One
→ LP positions recorded on AXIOMCreditMarket v7 and FixFlip/DSCR vaults
→ Distributions and capital calls per subscription agreement terms
→ K-1 documentation maintained per SEC Reg D requirements
→ Physical closings, title, and asset management executed by the Axiom operations team

Projected returns on offering documents are forward-looking estimates — not guarantees.

This is institutional private real estate formation infrastructure, built open.

axiomprotocol.app/syndication

#Syndication #PrivateRealEstate #AccreditedInvestor #RegD #OnChain
```

---

### 6.5 The Wealth Practice

#### Instagram Feed Caption
```
Your circle. Your payout. Your wealth — built together.
```
**Full caption:**
```
Your circle. Your payout. Your wealth — built together.

The Wealth Practice is Axiom Protocol's community wealth model — inspired by the traditional SUSU savings circle, rebuilt on-chain with a three-stage trust pipeline.

How it works:
→ Join a regional hub (Atlanta, Houston, Charlotte, and more)
→ Join or form a group with your circle
→ Contribute on your schedule — weekly, bi-weekly, or monthly
→ The pool rotates. Your payout is governed by the group.
→ Trust scores track group health. On-chain, transparent.

This isn't a savings account. This is collective wealth infrastructure.

For the community. By the community. On-chain.

axiomprotocol.app/wealth-practice

#WealthPractice #BlackWealth #SUSU #CommunityWealth #GenerationalWealth #OnChain
```

#### X Post
```
The SUSU model is one of the oldest wealth tools in the world.

We rebuilt it on-chain.

Three-stage trust pipeline. Regional hubs. Group contribution schedules. Trust scores tracked on-chain.

This is The Wealth Practice by Axiom Protocol.

Not a savings account. Collective wealth infrastructure.

axiomprotocol.app/wealth-practice
```

#### Instagram Story — Poll Format
```
[FRAME 1 — POLL]
HEADLINE: "Do you know what a SUSU is?"
Option A: Yes — I've done one
Option B: No — tell me

[FRAME 2 — REVEAL next day]
HEADLINE: "It's the world's oldest savings circle."
SUBLINE: "We rebuilt it on-chain."
CTA: axiomprotocol.app/wealth-practice
```

---

### 6.6 Community Entry Credit

#### Instagram Feed Caption
```
No bank check. No collateral. Credit to your wallet — today.
```
**Full caption:**
```
No bank check. No collateral. Credit to your wallet — today.

Axiom Community Entry Credit is a credit line for community members — delivered in AXUSD, disbursed directly to your wallet.

How it works:
1. Connect your wallet and prove ownership
2. State your W-2 income
3. The Evaluation Agent reviews instantly
4. If approved — draw your credit line in AXUSD
5. Repay in 30, 60, or 90 days

No bank credit pull. No crypto overcollateralization. Your credit limit is determined by your Governance Eligibility Factor tier.

Interest you pay goes back to the community junior pool — not a bank.

axiomprotocol.app/community-credit

#CreditAccess #CommunityFinance #BlackWealth #AXUSD #FinancialInclusion
```

---

### 6.7 Nexus Card

#### Instagram Feed Caption
```
Your Axiom balance. A Visa card. FDIC-insured up to $250K.
```
**Full caption:**
```
Your Axiom balance. A Visa card. FDIC-insured up to $250,000.

The Axiom Nexus Card is a virtual debit card issued through First Internet Bank — Member FDIC.

What you get:
→ Visa and Mastercard debit — accepted anywhere worldwide
→ FDIC-insured up to $250,000 per depositor category
→ Virtual card available immediately on issuance
→ Full card details revealed securely in your browser — no app needed
→ ATM access nationwide on the Visa network
→ Instant payouts from LP distributions, fund returns, and group disbursements — no ACH delay
→ Freeze and unfreeze instantly from your browser

Your money. Your card. Your rules.

axiomprotocol.app/my-card

#NexusCard #FDICInsured #BankingInnovation #CommunityWealth #AxiomProtocol
```

#### X Post
```
FDIC-insured up to $250,000.

Issued by First Internet Bank.

Visa + Mastercard. Works anywhere.

This is the Axiom Nexus Card — your on-chain balance, in your wallet, at any merchant on Earth.

Instant payouts from LP distributions. No ACH delay.

Freeze it from your browser. Unfreeze it. Use it.

axiomprotocol.app/my-card
```

#### Instagram Story — 3-Frame Sequence
```
[FRAME 1 — PROBLEM] "1 of 3"
HEADLINE: "Banks take 2–5 days to settle your money."
SUBLINE: "Tap to see what's different →"

[FRAME 2 — SOLUTION] "2 of 3"
HEADLINE: "Instant payouts. FDIC-insured."
SUBLINE: "Nexus Card — issued by First Internet Bank"

[FRAME 3 — CTA] "3 of 3"
HEADLINE: "Spend anywhere Visa is accepted."
CTA STRIP: "Get your Nexus Card →"
URL: axiomprotocol.app/my-card
```

---

### 6.8 On / Off Ramp

#### Instagram Feed Caption
```
Fiat to on-chain in one guided flow. No expertise required.
```
**Full caption:**
```
Fiat to on-chain in one guided flow. No expertise required.

The Axiom On/Off Ramp takes you from dollars to the capital stack — step by step.

The path:
1. Fiat → USDC (via Coinbase Pay)
2. USDC → AXUSD (via PSM — swap executes on-chain)
3. AXUSD → AXAU (via purchase queue — identity-gated)

Choose where you want to land — three destination options.

This is the entry point to the full Axiom capital stack. No seed phrases to memorize on day one. No DEX navigation. Just a guided flow.

axiomprotocol.app/onramp

#OnRamp #Web3Onboarding #AXUSD #AXAU #CryptoForEveryone #AxiomProtocol
```

---

### 6.9 Protocol Exchange (DEX)

#### X / Twitter Post
```
AXUSD settlement conversion on Arbitrum One.

Concentrated liquidity. Arbitrage closure loop. Peg defense threshold.

This isn't a speculative trading venue — it's infrastructure.

The Axiom Protocol Exchange maintains the AXUSD peg through concentrated Camelot liquidity pools and on-chain reserve conversion.

axiomprotocol.app/dex
```

---

### 6.10 Earn AXUSD Vault

#### X / Twitter Post
```
ERC-4626 yield vault on Arbitrum One.

Deployed. Recognized by Euler Earn factory perspective.

Bootstrap / Pre-Live — not yet generating yield. Pending oracle registration with Euler governance.

When that clears — this is the AXUSD yield vault.

Watch it: axiomprotocol.app/earn/axusd
```

---

### 6.11 Axiom Rail — Payment Infrastructure

#### LinkedIn Post
```
Stellar SEP-compliant anchor. FDIC-insured settlement. Layer 00.
```
**Full post:**
```
Stellar SEP-compliant anchor. FDIC-insured settlement. Layer 00.

Axiom Rail is the foundational payment infrastructure layer of the Axiom Protocol — a Stellar SEP-compliant anchor settled via Increase FDIC-insured ACH and domestic wire.

What it powers:
→ Deposit and withdrawal for USDC, AXUSD, and AXAU
→ DAO payroll: batch USDC disbursements to contributors, settled as USD via ACH/wire
→ Rent collection: identity-verified landlord settlement via ACH/wire
→ Direct payments between participants

The on-chain digital layer settles through FDIC-insured banking rails.

This is what a sovereign digital-physical economy looks like at Layer 00.

axiomprotocol.app/axiom-payment-rails

#PaymentRails #Stellar #FintechInfrastructure #Web3Banking #AXUSD
```

---

## 7. Content Calendar — 4-Week Sprint

### Week 1 — Foundation
| Day | Platform | Product | Format | Hook Pattern |
|---|---|---|---|---|
| Mon | LinkedIn | Lending Fund | Long-form post | Specificity signal (14% / 70% LTV) |
| Tue | X/Twitter | AXAU | Thread (5 tweets) | Contrarian (not a gold ETF) |
| Wed | Instagram | Wealth Practice | Feed post | Callout (community savings) |
| Thu | Instagram Stories | Wealth Practice | Poll (2-frame) | SUSU awareness poll |
| Fri | LinkedIn | Capital Program | Long-form post | Specificity signal ($1M / on-chain) |

### Week 2 — Access
| Day | Platform | Product | Format | Hook Pattern |
|---|---|---|---|---|
| Mon | X/Twitter | AXUSD | Single tweet | Contrarian (not a DeFi stablecoin) |
| Tue | Instagram | AXAU Early Access | Feed post | Callout (accredited, 25+ countries) |
| Wed | Instagram Stories | AXAU Early Access | 3-frame sequence | Problem → Solution → CTA |
| Thu | LinkedIn | Syndication | Long-form post | Specificity signal (Reg D, on-chain LP) |
| Fri | X/Twitter | Earn Vault | Bootstrap transparency post | Permission (unpopular opinion: bootstrapped is honest) |

### Week 3 — Products
| Day | Platform | Product | Format | Hook Pattern |
|---|---|---|---|---|
| Mon | Instagram | Nexus Card | Feed post | Specificity signal (FDIC $250K) |
| Tue | Instagram Stories | Nexus Card | 3-frame sequence | Problem → Solution → CTA |
| Wed | X/Twitter | DEX | Single tweet | Technical explanation |
| Thu | LinkedIn | Axiom Rail | Long-form post | Specificity signal (Stellar + FDIC) |
| Fri | Instagram | Community Credit | Feed post | Callout (no bank check) |

### Week 4 — On-Ramp and Education
| Day | Platform | Product | Format | Hook Pattern |
|---|---|---|---|---|
| Mon | Instagram | On/Off Ramp | Feed post | Negative hook (barriers removed) |
| Tue | X/Twitter | AXAU | Thread (update on early access) | Curiosity gap |
| Wed | LinkedIn | Lending Fund | Solvency + transparency angle | Contrarian (verify it yourself) |
| Thu | Instagram Stories | On/Off Ramp | 3-frame sequence | Fiat → on-chain journey |
| Fri | All platforms | Wealth Practice | Cross-platform repurpose | SUSU educational thread → feed post → story poll |

---

## 8. Repurposing Waterfall

For each major post, follow this waterfall:

1. **LinkedIn long-form** (800–1,000 chars) → primary institutional channel
2. **X thread** (5–7 tweets, each standing alone) → extract each key claim as a tweet
3. **Instagram feed post** (hook + 3–5 points, 1080×1080 or 1080×1350) → community channel
4. **Instagram Story** (single-line strip, never resize the feed post) → re-author for 9:16, strip to one concept
5. **Threads** (shorter X thread version) → crossover persona coverage

---

## 9. Compliance and Disclosure Rules

These rules apply to every piece of content, across all platforms:

1. **No guaranteed return claims.** All rate references (14%, variable yield) must include: "Variable — not guaranteed."
2. **Accredited investor gate.** Lending Fund, Capital Program, and Syndication content must include "Accredited participants only" or "Accredited investors only."
3. **Reg D language.** Always say "designed to align with SEC Reg D 506(c)" — not "SEC-registered" or "SEC-approved."
4. **GENIUS Act.** If referencing stablecoin compliance: "designed to align with" — not "compliant with."
5. **No absolutist positioning.** Do not say "the only platform," "the sole infrastructure," or "the standard for everyone."
6. **No specific acreage without evidence.** Reference "land acquisition pipeline" or "targeted acquisition framework" — not specific acreage numbers.
7. **No asterisks or hashtags in body text.** Hashtags go only at the end of captions.
8. **AXUSD is not DeFi.** Use "on-chain financial rails" — not "DeFi stablecoin."
9. **Smart contracts are "automated control layers."** For institutional/disclosure-facing content, use approved vocabulary from `lib/glossary.ts`.

---

## 10. Key URLs

| Product | URL |
|---|---|
| AXAU Reserve | axiomprotocol.app/axau |
| AXAU Early Access | axiomprotocol.app/axau-early-access |
| AXUSD Settlement Rail | axiomprotocol.app/axusd-3643 |
| Earn AXUSD Vault | axiomprotocol.app/earn/axusd |
| Lending Fund | axiomprotocol.app/lending-fund |
| Capital Program | axiomprotocol.app/pilot |
| Syndication | axiomprotocol.app/syndication |
| Investor Portal | axiomprotocol.app/syndication/portal |
| The Wealth Practice | axiomprotocol.app/wealth-practice |
| Community Credit | axiomprotocol.app/community-credit |
| Nexus Card | axiomprotocol.app/my-card |
| On / Off Ramp | axiomprotocol.app/onramp |
| Protocol Exchange | axiomprotocol.app/dex |
| Axiom Payment Rails | axiomprotocol.app/axiom-payment-rails |
| DAO Payroll | axiomprotocol.app/dao-payroll |
| Rent Collection | axiomprotocol.app/rent-collection |
| DePIN Network | axiomprotocol.app/depin/denet |
| Secondary Network | axiomprotocol.app/secondary |
| Disclosure | axiomprotocol.app/disclosure |
| Solvency Console | axiomprotocol.app/solvency |

---

*All product claims in this document are sourced directly from live page source code. All compliance language reflects the Axiom Protocol glossary at `lib/glossary.ts`. Rates and targets are variable and not guaranteed. Reg D 506(c) — accredited participants only for applicable products.*
