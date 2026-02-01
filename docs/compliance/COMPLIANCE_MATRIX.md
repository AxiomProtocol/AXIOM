# Axiom Smart City - Compliance Classification Matrix

**Generated:** December 2025  
**Purpose:** Classifies all platform features by risk level and compliance requirements

---

## 1. Risk Classification Overview

| Level | Definition | Review Frequency | Disclosure Requirements |
|-------|------------|-----------------|------------------------|
| **CRITICAL** | Financial core, token distribution | Continuous | Mandatory, per-transaction |
| **HIGH** | Financial services, real estate, trading | Weekly | Mandatory, per-feature |
| **MEDIUM** | Community features, infrastructure | Monthly | Recommended |
| **LOW** | Informational, educational | Quarterly | Optional |

---

## 2. Feature Classification

### CRITICAL Risk Features

| Feature | Contracts | Compliance Requirements |
|---------|-----------|------------------------|
| **Token Generation Event (TGE)** | CrossChainAndLaunchModule | Securities compliance, geographic restrictions, accredited investor verification, vesting disclosures |
| **Treasury Management** | AxiomTreasuryAndRevenueHub | Multi-sig custody, fund movement audits, transparency reports |

### HIGH Risk Features

| Feature | Contracts | Compliance Requirements |
|---------|-----------|------------------------|
| **AXM Token** | AxiomV2 | Anti-whale limits, fee structure, token economics |
| **KeyGrow Rent-to-Own** | LeaseAndRentEngine, CapitalPoolsAndFunds | Real estate disclosures, option terms, tenant rights, equity mechanics |
| **DEX Exchange** | AxiomExchangeHub | Trading risks, slippage warnings, impermanent loss |
| **National Bank** | AxiomTreasuryAndRevenueHub | KYC/AML, financial regulations, FATF guidelines |
| **Identity System** | AxiomIdentityComplianceHub, CitizenCredentialRegistry | Privacy policy, data protection, GDPR |

### MEDIUM Risk Features

| Feature | Contracts | Compliance Requirements |
|---------|-----------|------------------------|
| **SUSU Savings** | AxiomSusuHub | Pool terms, payout schedule, late penalties |
| **DePIN Nodes** | DePINNodeSuite, DePINNodeSales | Lease terms, reward structure, uptime requirements |
| **Governance** | AxiomV2 (voting) | Voting power, delegation terms, proposal process |
| **IoT/Utilities** | IoTOracleNetwork, UtilityAndMeteringHub | Data privacy, metering accuracy |

### LOW Risk Features

| Feature | Contracts | Compliance Requirements |
|---------|-----------|------------------------|
| **Academy** | AxiomAcademyHub | Content licensing |
| **PMA Trust** | N/A | Membership agreement |
| **Impact Dashboard** | N/A | Public metrics accuracy |
| **Social/Community** | CommunitySocialHub | Community guidelines |
| **Gamification** | GamificationHub | Reward terms |

---

## 3. Required Disclosures by Feature

### KeyGrow (Real Estate)
| Location | Disclosure |
|----------|------------|
| **Enrollment** | "KeyGrow is a rent-to-own program. The $500 option consideration is staked at 8% APR and grows toward your down payment. 20% of each rent payment converts to property equity tokens." |
| **Property View** | "Property valuations are estimates and may change. Past performance does not guarantee future results." |

### DEX (Trading)
| Location | Disclosure |
|----------|------------|
| **Swap** | "Trading involves risk. Prices can be volatile. You may lose some or all of your investment." |
| **Add Liquidity** | "Liquidity provision involves impermanent loss risk. You may receive less value than deposited." |

### SUSU (Savings)
| Location | Disclosure |
|----------|------------|
| **Pool Join** | "SUSU pools are rotating savings groups. Members contribute each cycle and receive the pooled funds on a scheduled basis. Late payments may result in penalties or ejection." |

### TGE (Token Sale)
| Location | Disclosure |
|----------|------------|
| **Token Purchase** | "Token sales may be restricted in certain jurisdictions. By participating, you confirm you are not a resident of a restricted region and meet all eligibility requirements." |

### DePIN (Nodes)
| Location | Disclosure |
|----------|------------|
| **Node Purchase** | "DePIN node rewards are based on network performance and are not guaranteed. Node operators must meet uptime requirements." |

---

## 4. Global Disclosures

These disclosures should appear on all relevant pages:

| ID | Content | Display Location |
|----|---------|-----------------|
| **risk-general** | "Cryptocurrency and blockchain investments involve significant risk. You may lose some or all of your investment." | All financial actions |
| **not-advice** | "Nothing on this platform constitutes financial, legal, or investment advice. Consult a professional before making decisions." | Footer |
| **kyc-required** | "Certain features require identity verification (KYC). You may be asked to provide documentation." | High-value actions |

---

## 5. Geographic Restrictions

### Restricted Regions for Token Sales
- United States (US)
- China (CN)
- North Korea (KP)
- Iran (IR)
- Cuba (CU)
- Syria (SY)

### KYC Required Regions
All jurisdictions for transactions over $10,000 equivalent

---

## 6. Compliance Review Schedule

| Frequency | Items to Review |
|-----------|-----------------|
| **Daily** | Transaction monitoring, unusual activity alerts |
| **Weekly** | HIGH risk feature metrics, complaint tickets |
| **Monthly** | MEDIUM risk feature audits, disclosure updates |
| **Quarterly** | Full compliance review, policy updates |
| **Annually** | External audit, regulatory filing updates |

---

## 7. Acknowledgement Requirements

Features requiring user acknowledgement before use:

| Feature | Acknowledgement Required | Storage |
|---------|-------------------------|---------|
| KeyGrow Enrollment | Yes - Terms & Disclosures | `compliance_acknowledgements` table |
| TGE Participation | Yes - Securities & Restrictions | `compliance_acknowledgements` table |
| DEX First Trade | Yes - Trading Risks | `compliance_acknowledgements` table |
| SUSU Pool Join | Yes - Pool Terms | `compliance_acknowledgements` table |
| PMA Membership | Yes - Membership Agreement | `pma_applications` table |

---

## 8. Data Retention Policy

| Data Type | Retention Period | Purpose |
|-----------|-----------------|---------|
| KYC Documents | 7 years | Regulatory compliance |
| Transaction Records | 10 years | Audit trail |
| Complaint Records | 5 years | Dispute resolution |
| Acknowledgements | Indefinite | Proof of disclosure |
| User Preferences | Account lifetime | Service personalization |

---

## 9. Incident Response

### Compliance Incident Levels

| Level | Definition | Response Time | Notification |
|-------|------------|--------------|--------------|
| **P1 - Critical** | Security breach, fund loss | Immediate | All stakeholders |
| **P2 - High** | Regulatory inquiry, major complaint | 4 hours | Legal, Admin |
| **P3 - Medium** | User complaint, minor issue | 24 hours | Support team |
| **P4 - Low** | Documentation update needed | 1 week | Compliance team |

---

*Last updated: December 2025*
