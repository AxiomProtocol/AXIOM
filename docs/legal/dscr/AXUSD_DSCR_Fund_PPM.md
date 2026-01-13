# PRIVATE PLACEMENT MEMORANDUM

## AXIOM NEXUS LLC
### Series B: AXUSD DSCR Rental Lending Fund

**A Mississippi Limited Liability Company**

---

## OFFERING OF MEMBERSHIP INTERESTS

**Minimum Investment:** $25,000 (payable in AXUSD stablecoin)
**Maximum Offering:** $10,000,000
**Offering Type:** Rule 506(c) of Regulation D
**Accredited Investors Only**

---

**THE DATE OF THIS MEMORANDUM IS: [INSERT DATE]**

---

## IMPORTANT NOTICES

THE SECURITIES OFFERED HEREBY HAVE NOT BEEN REGISTERED UNDER THE SECURITIES ACT OF 1933, AS AMENDED (THE "SECURITIES ACT"), OR THE SECURITIES LAWS OF ANY STATE AND ARE BEING OFFERED AND SOLD IN RELIANCE ON EXEMPTIONS FROM THE REGISTRATION REQUIREMENTS OF THE SECURITIES ACT AND SUCH STATE LAWS.

THE SECURITIES ARE SUBJECT TO RESTRICTIONS ON TRANSFERABILITY AND RESALE AND MAY NOT BE TRANSFERRED OR RESOLD EXCEPT AS PERMITTED UNDER THE SECURITIES ACT AND APPLICABLE STATE SECURITIES LAWS, PURSUANT TO REGISTRATION OR EXEMPTION THEREFROM.

THIS OFFERING IS MADE PURSUANT TO RULE 506(c) OF REGULATION D UNDER THE SECURITIES ACT. ACCORDINGLY, THE COMPANY MAY ENGAGE IN GENERAL SOLICITATION AND ADVERTISING IN CONNECTION WITH THIS OFFERING. HOWEVER, ALL PURCHASERS MUST BE "ACCREDITED INVESTORS" AS DEFINED IN RULE 501(a) OF REGULATION D, AND THE COMPANY MUST TAKE REASONABLE STEPS TO VERIFY THAT ALL PURCHASERS ARE ACCREDITED INVESTORS.

INVESTORS SHOULD BE AWARE THAT THEY MAY BE REQUIRED TO BEAR THE FINANCIAL RISKS OF THIS INVESTMENT FOR AN INDEFINITE PERIOD OF TIME.

---

## TABLE OF CONTENTS

1. Executive Summary
2. The Company
3. Business Strategy & Investment Thesis
4. Use of Proceeds
5. Investment Terms
6. Risk Factors
7. Management
8. Conflicts of Interest
9. Tax Considerations
10. Subscription Procedures
11. Exhibits

---

## 1. EXECUTIVE SUMMARY

### The Opportunity

Axiom Nexus LLC ("Company" or "Fund") is offering Membership Interests to accredited investors to participate in a real estate lending fund focused on long-term Debt Service Coverage Ratio (DSCR) loans for rental investment properties.

### Investment Highlights

- **Asset Class:** Long-term real estate loans (30-year amortizing)
- **Target Properties:** Non-owner occupied 1-4 unit rental properties
- **Geographic Focus:** Nationwide (all 50 states)
- **Settlement Currency:** AXUSD stablecoin (1:1 USD-pegged, blockchain-based)
- **Target Annual Yield:** 10-14% to investors (net of fees)
- **Loan-to-Value:** Maximum 75% of property value
- **Loan Rates to Borrowers:** 7-9.5% APR (tier-based)

### What is a DSCR Loan?

DSCR (Debt Service Coverage Ratio) loans are underwritten based on property income rather than borrower income. The DSCR is calculated as:

```
DSCR = Monthly Rental Income / Monthly Debt Payment (PITIA)
```

A DSCR of 1.20x means the property generates 20% more income than needed to cover the mortgage payment, providing a safety buffer for investors.

### Why DSCR Lending?

Unlike traditional mortgages that require W-2s, tax returns, and employment verification, DSCR loans are qualified based on the property's ability to generate income. This creates a large underserved market of:

- Real estate investors building rental portfolios
- Self-employed entrepreneurs with strong assets
- Investors executing BRRRR (Buy, Rehab, Rent, Refinance, Repeat) strategies
- Short-term rental (Airbnb) property owners

### Why AXUSD Settlement?

All fund operations settle in AXUSD, a compliant USD-pegged stablecoin:
- **Transparency:** All transactions recorded on public blockchain
- **Speed:** Same-day settlement vs. 3-5 day bank transfers
- **Programmable:** Smart contracts automate yield distribution
- **Auditable:** Real-time verification of fund reserves
- **Self-Custody Option:** Investors can hold AXUSD in personal wallets

### Fund Structure

```
Axiom Nexus LLC (Mississippi)
├── Manager: Axiom Nexus LLC (General Partner functions)
├── Members: Accredited Investors (Limited Partner functions)
├── Custody: Smart Contract Vault (on-chain, auditable)
├── Loan Manager: DSCRLoanManager Smart Contract
└── Settlement: AXUSD Stablecoin (Arbitrum One blockchain)
```

### Smart Contract Infrastructure

The Fund operates through verified smart contracts on Arbitrum One:

| Contract | Address | Purpose |
|----------|---------|---------|
| DSCRPoolVault V2 | 0x5a09cb67518e6E28d8307D75174430939C044A7d | ERC-4626 vault for investor deposits |
| DSCRLoanManager | 0x2657F688Af2fF327987dd7A8d4CCf1E781349052 | Loan origination and management |
| DSCRRiskConfig | [Deployed] | Risk parameters and tier settings |
| DSCRLoanReceiptNFT | [Deployed] | NFT receipts for loan positions |

---

## 2. THE COMPANY

### Legal Entity

**Name:** Axiom Nexus LLC
**State of Organization:** Mississippi
**Date of Formation:** [INSERT DATE]
**Principal Office:** [INSERT ADDRESS]
**Registered Agent:** [INSERT AGENT NAME AND ADDRESS]

### Purpose

The Company was formed for the purpose of:
1. Pooling capital from accredited investors
2. Originating, funding, and servicing long-term DSCR rental property loans
3. Generating returns through interest income and origination fees
4. Providing transparent, blockchain-based settlement and reporting

### Operating Agreement

The Company operates pursuant to an Operating Agreement dated [INSERT DATE]. This Memorandum summarizes certain provisions of the Operating Agreement, but investors should review the complete Operating Agreement attached as Exhibit A.

---

## 3. BUSINESS STRATEGY & INVESTMENT THESIS

### Market Opportunity

The U.S. rental property market represents a massive lending opportunity:
- 22+ million rental properties in the US
- $4.5+ trillion residential rental market
- Traditional banks underserve non-owner-occupied properties
- Growing demand from property investors seeking long-term financing

### Loan Product Tiers

The Fund offers three DSCR loan tiers to balance risk and return:

| Tier | Max LTV | Min DSCR | Interest Rate | Target Properties |
|------|---------|----------|---------------|-------------------|
| **LOW Risk** | 65% | 1.25x | 7.0% APR | Strong cash-flowing properties |
| **STANDARD** | 70% | 1.20x | 8.0% APR | Solid rental properties |
| **YIELD** | 75% | 1.10x | 9.5% APR | Higher yield opportunities |

### Lending Criteria

The Fund will make loans meeting the following criteria:

| Parameter | Requirement |
|-----------|-------------|
| **Property Type** | Non-owner occupied 1-4 unit residential |
| **Loan Purpose** | Purchase, refinance, or cash-out (business purpose only) |
| **Loan-to-Value** | Maximum 75% of current appraised value |
| **DSCR Requirement** | Minimum 1.10x (tier-dependent) |
| **Loan Term** | 30 years (360 months) |
| **Amortization** | Fully amortizing, fixed rate |
| **Interest Rate** | 7.0% - 9.5% APR (tier-based) |
| **Origination Fee** | 1-2 points |
| **Prepayment** | 3-year step-down (3%, 2%, 1%) or no-prepay option |

### Underwriting Process

1. **Application Review:** Borrower submits property and entity documentation
2. **Property Valuation:** Third-party appraisal for current market value
3. **Rent Verification:** Lease review or market rent analysis
4. **DSCR Calculation:** Net Operating Income / Debt Service
5. **Title & Insurance:** Clear title, hazard insurance, flood insurance (if applicable)
6. **Loan Committee Approval:** Final sign-off by Manager
7. **Closing & Funding:** AXUSD disbursed within 14-21 days

### DSCR Calculation Example

```
Property Value:        $300,000
Loan Amount (70% LTV): $210,000
Monthly Rent:          $2,400

Monthly PITIA:
  Principal & Interest: $1,540 (at 8% APR, 30 years)
  Taxes:                $250
  Insurance:            $100
  Total PITIA:          $1,890

DSCR = $2,400 / $1,890 = 1.27x ✓ (Qualifies for STANDARD tier)
```

### Loan Servicing

- Monthly P&I payments collected via ACH or wire
- Payments automatically routed to investor distributions
- Annual property insurance verification
- Property tax escrow management
- Default management and foreclosure if necessary

### BRRRR Integration

The Fund offers a unique BRRRR refinance pathway:
1. Investor completes fix-and-flip project with our bridge loan
2. Property is stabilized and leased
3. Bridge loan converts to 30-year DSCR loan
4. Investor extracts equity and repeats the process

---

## 4. USE OF PROCEEDS

Funds raised will be allocated as follows:

| Use | Percentage |
|-----|------------|
| **Loan Originations** | 88% |
| **Operating Reserve** | 5% |
| **Loss Reserve** | 4% |
| **Setup & Legal Costs** | 2% |
| **Technology & Platform** | 1% |

### Loan Origination Details

- Minimum loan size: $75,000
- Maximum loan size: $1,500,000
- Target portfolio: 50-200 active loans
- Geographic diversification across all 50 states
- Tier diversification: 30% Low / 50% Standard / 20% Yield

---

## 5. INVESTMENT TERMS

### Offering Details

| Term | Details |
|------|---------|
| **Securities Offered** | Membership Interests (Units) |
| **Minimum Investment** | $25,000 (payable in AXUSD) |
| **Maximum Offering** | $10,000,000 |
| **Offering Period** | 18 months from date of this Memorandum |
| **Investor Qualifications** | Accredited Investors only (Rule 506(c)) |

### Economic Terms

| Term | Details |
|------|---------|
| **Preferred Return** | 8% annual (cumulative, non-compounding) |
| **Profit Split (above pref)** | 80% to Investors / 20% to Manager |
| **Management Fee** | 1.25% annual on committed capital |
| **Origination Fee Allocation** | 75% to Fund / 25% to Manager |

### Distribution Schedule

- **Monthly:** Interest income distributed within 10 business days of month-end
- **Quarterly:** Principal returns and profit share reconciled
- **Annual:** K-1 tax documents provided by March 15

### ERC-4626 Vault Shares

Investor positions are represented as ERC-4626 vault shares:
- Shares represent proportional ownership of the Fund's assets
- Share value increases as interest is collected
- Transparent, on-chain tracking of all positions
- Real-time NAV calculation available on-chain

### Redemption & Liquidity

- **Lock-up Period:** 12 months from investment date
- **Redemption Notice:** 90 days written notice required
- **Redemption Availability:** Quarterly, subject to available liquidity
- **Early Redemption Penalty:** 2% of redeemed amount during lock-up

### Capital Calls

The Manager may issue capital calls for:
- Committed but unfunded capital
- Emergency loss reserves
- Follow-on investments in existing loans

---

## 6. RISK FACTORS

**INVESTMENT IN THE COMPANY INVOLVES A HIGH DEGREE OF RISK. PROSPECTIVE INVESTORS SHOULD CAREFULLY CONSIDER THE FOLLOWING RISK FACTORS BEFORE MAKING AN INVESTMENT DECISION.**

### Real Estate Risks

1. **Property Value Decline:** Real estate values may decrease, affecting collateral value and recovery in default.

2. **Borrower Default:** Borrowers may fail to make payments, particularly if rental income decreases or expenses increase.

3. **Vacancy Risk:** Properties may experience vacancy, reducing the borrower's ability to make payments.

4. **Foreclosure Delays:** Foreclosure processes can be lengthy and costly, particularly for rental properties with tenants.

5. **Environmental Hazards:** Properties may have undiscovered environmental issues affecting value.

6. **Market Conditions:** Economic downturns, interest rate changes, or local market conditions may affect property values and rental rates.

### DSCR-Specific Risks

7. **Rental Income Fluctuation:** Rental rates may decline, reducing DSCR and increasing default risk.

8. **Operating Expense Increases:** Property taxes, insurance, and maintenance costs may increase, compressing DSCR.

9. **Short-Term Rental Risk:** Properties relying on STR income may be affected by regulatory changes or platform policy changes.

10. **Market Rent Assumptions:** Loans underwritten on market rent (for vacant properties) may not achieve projected rental rates.

### Lending Risks

11. **Concentration Risk:** The Fund may have significant exposure to individual borrowers, properties, or geographic areas.

12. **Interest Rate Risk:** Rising rates may reduce property values and borrower refinancing options.

13. **Fraud:** Borrowers or third parties may provide fraudulent information or documentation.

14. **Insurance Lapses:** Borrowers may fail to maintain required insurance coverage.

### Operational Risks

15. **Limited Operating History:** The Fund is newly formed with limited operating history.

16. **Reliance on Manager:** The Fund depends heavily on the Manager's expertise and availability.

17. **Conflicts of Interest:** The Manager may have conflicts between its interests and those of investors.

18. **Technology Risk:** Smart contract bugs, blockchain network issues, or cybersecurity breaches may affect operations.

### AXUSD Stablecoin Risks

19. **Peg Stability:** AXUSD may temporarily deviate from its $1.00 peg.

20. **Regulatory Risk:** Future regulations may affect AXUSD's legality or operations.

21. **Smart Contract Risk:** Bugs in AXUSD smart contracts could result in loss of funds.

22. **Blockchain Network Risk:** Arbitrum One network congestion or failures could delay transactions.

23. **Custody Risk:** Self-custody requires proper security practices by investors.

### Regulatory Risks

24. **Securities Laws:** This offering relies on exemptions that may be challenged.

25. **Lending Regulations:** Changes in state or federal lending laws may affect operations.

26. **Tax Treatment:** Tax laws may change, affecting investor returns.

### Liquidity Risks

27. **No Public Market:** There is no public market for the Membership Interests.

28. **Transfer Restrictions:** Securities cannot be freely transferred without Manager consent.

29. **Redemption Limitations:** Redemptions are subject to available liquidity and Manager discretion.

30. **Long-Term Asset Duration:** 30-year loans create duration mismatch with potential redemption requests.

---

## 7. MANAGEMENT

### Manager: Axiom Nexus LLC

**Managing Member:** [INSERT NAME]

**Background:**
[INSERT BIOGRAPHICAL INFORMATION INCLUDING:
- Education
- Professional experience
- Real estate experience
- Lending experience
- Other relevant qualifications]

### Advisory Board (if applicable)

[INSERT NAMES AND BACKGROUNDS OF ANY ADVISORS]

### Compensation

| Role | Compensation |
|------|-------------|
| **Manager** | 1.25% annual management fee |
| **Manager** | 20% of profits above 8% preferred return |
| **Manager** | 25% of origination fees |

---

## 8. CONFLICTS OF INTEREST

The Manager and its affiliates may have conflicts of interest including:

1. **Other Activities:** Manager may engage in other business activities, including other investment funds.

2. **Affiliated Transactions:** Manager may originate loans to affiliated borrowers (subject to disclosure and arm's length terms).

3. **Fee Allocation:** Manager has discretion in allocating origination fees between Fund and Manager.

4. **Time Allocation:** Manager's time is not exclusively devoted to the Fund.

5. **Competing Investments:** Manager may make investments for its own account that compete with Fund opportunities.

6. **BRRRR Referrals:** Manager operates both Fix & Flip and DSCR funds, creating referral opportunities between funds.

---

## 9. TAX CONSIDERATIONS

### Entity Classification

The Company intends to be treated as a partnership for federal income tax purposes. Each Member will receive a Schedule K-1 reporting their allocable share of Fund income, gains, losses, and deductions.

### IMPORTANT TAX NOTICE

THIS SUMMARY IS FOR GENERAL INFORMATION ONLY AND DOES NOT CONSTITUTE TAX ADVICE. PROSPECTIVE INVESTORS SHOULD CONSULT THEIR OWN TAX ADVISORS REGARDING THE TAX CONSEQUENCES OF AN INVESTMENT IN THE COMPANY.

Key considerations include:
- Phantom income (taxable income without cash distribution)
- State tax filing requirements in states where Fund operates
- UBIT concerns for tax-exempt investors
- Passive activity loss limitations
- At-risk rules

---

## 10. SUBSCRIPTION PROCEDURES

### To Subscribe

1. **Review Documents:** Read this Memorandum, Operating Agreement, and Subscription Agreement
2. **Verify Accreditation:** Complete Accredited Investor Questionnaire with documentation
3. **Execute Subscription:** Sign Subscription Agreement
4. **Transfer Funds:** Send AXUSD to designated Fund wallet address
5. **Confirmation:** Receive confirmation of acceptance and vault share allocation

### Accredited Investor Verification

Under Rule 506(c), the Company must verify that all investors are accredited. Acceptable verification methods include:

**For Income-Based Qualification ($200K/$300K):**
- Tax returns, W-2s, or 1099s for past two years
- Written confirmation from CPA, attorney, or broker-dealer

**For Net Worth-Based Qualification ($1M+):**
- Bank/brokerage statements
- Third-party appraisals of real estate
- Written confirmation from CPA, attorney, or broker-dealer

**For Investment Minimum Method (2025 SEC Guidance):**
- Minimum investment of $200,000 or more
- Written self-certification
- Representation that investment is not financed

### Minimum Investment

$25,000 in AXUSD stablecoin

### Fund Wallet Address

AXUSD deposits should be sent to the DSCRPoolVault contract:
**DSCRPoolVault V2:** 0x5a09cb67518e6E28d8307D75174430939C044A7d
**Network:** Arbitrum One
**Token Contract (AXUSD):** 0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C

---

## 11. EXHIBITS

- **Exhibit A:** Operating Agreement
- **Exhibit B:** Subscription Agreement
- **Exhibit C:** Accredited Investor Questionnaire
- **Exhibit D:** Form D Filing Information
- **Exhibit E:** AXUSD Token Information
- **Exhibit F:** Smart Contract Audit Reports
- **Exhibit G:** DSCR Calculation Methodology

---

## SIGNATURES

**AXIOM NEXUS LLC**

By: ________________________________
Name: [INSERT NAME]
Title: Managing Member
Date: ______________________________

---

*This Private Placement Memorandum is confidential and is intended solely for the use of prospective investors in Axiom Nexus LLC. Distribution to any other person is unauthorized.*
