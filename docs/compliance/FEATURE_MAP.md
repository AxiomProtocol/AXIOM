# Axiom Smart City - Feature and Dependency Map

**Generated:** December 2025  
**Purpose:** Maps all platform features to their dependencies, APIs, and compliance touchpoints

---

## 1. Core Platform Features

### 1.1 AXM Token (AxiomV2)
| Attribute | Details |
|-----------|---------|
| **Contract** | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| **Page** | `/tokenomics` |
| **APIs** | `/api/transparency/stats` |
| **Dependencies** | OpenZeppelin ERC20, AccessControl, ReentrancyGuard |
| **Compliance** | Identity Registry Integration, Dynamic Fee Routing |
| **Risk Level** | HIGH - Core token for all platform operations |

### 1.2 National Bank of Axiom
| Attribute | Details |
|-----------|---------|
| **Page** | `/bank`, `/bank/*` |
| **APIs** | Bank-related endpoints |
| **Dependencies** | AxiomV2, Treasury contracts |
| **Compliance** | KYC/AML required, Financial regulations |
| **Risk Level** | HIGH - Financial services |

### 1.3 KeyGrow (Rent-to-Own)
| Attribute | Details |
|-----------|---------|
| **Contract** | LeaseAndRentEngine (`0x00591d360416dE7b016bBedbC6AA1AE798eA873B` v2) |
| **Page** | `/keygrow`, `/keygrow/*` |
| **APIs** | `/api/keygrow/*` (properties, enrollments, deposits, equity, shares) |
| **External APIs** | ATTOM Data (property data), RentCast (rental estimates), Walk Score |
| **Dependencies** | AxiomV2, CitizenCredentialRegistry, CapitalPoolsAndFunds |
| **Compliance** | Real estate regulations, Option consideration disclosures |
| **Risk Level** | HIGH - Real estate tokenization |

### 1.4 SUSU (Rotating Savings)
| Attribute | Details |
|-----------|---------|
| **Contract** | AxiomSusuHub (`0x6C69D730327930B49A7997B7b5fb0865F30c95A5`) |
| **Page** | `/susu` |
| **APIs** | `/api/susu/*` (pools, groups, hubs, categories, discover) |
| **Dependencies** | AxiomV2, Treasury |
| **Compliance** | Group savings regulations, Protocol fees |
| **Risk Level** | MEDIUM - Community savings pools |

### 1.5 DEX Exchange
| Attribute | Details |
|-----------|---------|
| **Contract** | AxiomExchangeHub (`0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D`) |
| **Page** | `/dex`, `/dex/*` |
| **APIs** | `/api/dex/*` (stats, price-history, limit-orders, liquidity-rewards) |
| **Dependencies** | AxiomV2, OracleAndMetricsRelay |
| **Compliance** | Trading regulations, Price manipulation protections |
| **Risk Level** | HIGH - Token exchange |

### 1.6 DePIN Nodes
| Attribute | Details |
|-----------|---------|
| **Contracts** | DePINNodeSuite (`0x223dF824B320beD4A8Fd0648b242621e4d01aAEF` v2), DePINNodeSales |
| **Page** | `/axiom-nodes`, `/nodes/*` |
| **APIs** | `/api/depin/*`, `/api/nodes/*` |
| **Dependencies** | AxiomV2, IoTOracleNetwork |
| **Compliance** | Hardware ownership, Network participation terms |
| **Risk Level** | MEDIUM - Physical infrastructure |

### 1.7 Governance
| Attribute | Details |
|-----------|---------|
| **Page** | `/governance`, `/governance/*` |
| **APIs** | `/api/governance/*` (proposals, grants, stats) |
| **Dependencies** | AxiomV2 (voting power), Multi-sig |
| **Compliance** | DAO governance disclosures |
| **Risk Level** | MEDIUM - Protocol governance |

### 1.8 PMA Trust (Private Membership Association)
| Attribute | Details |
|-----------|---------|
| **Page** | `/pma`, `/pma/*` |
| **APIs** | `/api/pma/apply` |
| **Dependencies** | CitizenCredentialRegistry |
| **Compliance** | PMA legal structure, Membership agreements |
| **Risk Level** | LOW - Membership organization |

---

## 2. Supporting Features

### 2.1 Axiom Academy
| Attribute | Details |
|-----------|---------|
| **Contract** | AxiomAcademyHub (`0x30667931BEe54a58B76D387D086A975aB37206F4`) |
| **Page** | `/academy`, `/academy/*` |
| **APIs** | `/api/academy/*` |
| **Dependencies** | Stripe (payments) |
| **Compliance** | Educational content licensing |
| **Risk Level** | LOW |

### 2.2 Impact Dashboard
| Attribute | Details |
|-----------|---------|
| **Page** | `/impact` |
| **APIs** | `/api/impact/metrics` |
| **Dependencies** | Platform-wide metrics aggregation |
| **Compliance** | Public metrics reporting |
| **Risk Level** | LOW |

### 2.3 Trust & Transparency Center
| Attribute | Details |
|-----------|---------|
| **Page** | `/transparency` |
| **APIs** | `/api/transparency/stats`, `/api/compliance/*` |
| **Dependencies** | All contract addresses |
| **Compliance** | Central compliance hub |
| **Risk Level** | LOW |

### 2.4 TGE / Launchpad
| Attribute | Details |
|-----------|---------|
| **Contract** | CrossChainAndLaunchModule |
| **Page** | `/launchpad` |
| **APIs** | `/api/tge/*` |
| **Dependencies** | AxiomV2, Whitelist system |
| **Compliance** | Token sale regulations, Geographic restrictions |
| **Risk Level** | HIGH - Token distribution |

---

## 3. Infrastructure Features

### 3.1 Identity & Credentials
| Attribute | Details |
|-----------|---------|
| **Contract** | CitizenCredentialRegistry, AxiomIdentityComplianceHub |
| **APIs** | `/api/auth/siwe/*` |
| **Dependencies** | SIWE (Sign-In with Ethereum) |
| **Compliance** | KYC verification, Identity management |
| **Risk Level** | HIGH - Identity data |

### 3.2 Treasury Management
| Attribute | Details |
|-----------|---------|
| **Contract** | AxiomTreasuryAndRevenueHub |
| **Page** | `/admin/treasury` |
| **APIs** | `/api/admin/treasury/*` |
| **Dependencies** | Multi-sig (Gnosis Safe), AxiomV2 |
| **Compliance** | Fund custody, Audit trails |
| **Risk Level** | CRITICAL - Fund management |

### 3.3 IoT & Sensors
| Attribute | Details |
|-----------|---------|
| **Contract** | IoTOracleNetwork, UtilityAndMeteringHub |
| **Page** | Admin dashboards |
| **APIs** | `/api/admin/iot/*`, `/api/services/utility/*` |
| **Dependencies** | Oracle consensus |
| **Compliance** | Data privacy, Metering accuracy |
| **Risk Level** | MEDIUM |

---

## 4. Feature Dependencies Graph

```
AxiomV2 (AXM Token)
├── AxiomTreasuryAndRevenueHub
│   └── All fee distributions
├── AxiomStakingAndEmissionsHub
│   └── Staking rewards
├── AxiomExchangeHub (DEX)
│   └── Token swaps
├── DePINNodeSuite
│   └── Node staking
├── AxiomSusuHub
│   └── Savings pools
├── LeaseAndRentEngine (KeyGrow)
│   └── Option deposits, equity accrual
└── CrossChainAndLaunchModule (TGE)
    └── Token distribution

CitizenCredentialRegistry
├── AxiomIdentityComplianceHub
│   └── KYC/AML verification
├── KeyGrow enrollments
├── PMA membership
└── Whitelist management

IoTOracleNetwork
├── UtilityAndMeteringHub
│   └── Smart city utilities
├── DePINNodeSuite
│   └── Node performance data
└── CitizenReputationOracle
    └── Credit scoring
```

---

## 5. External Service Dependencies

| Service | Used By | Purpose |
|---------|---------|---------|
| **ATTOM Data** | KeyGrow | Property data, valuations |
| **RentCast** | KeyGrow | Rental market estimates |
| **Walk Score** | KeyGrow | Location walkability scores |
| **Stripe** | Academy, Payments | Payment processing |
| **SendGrid** | Notifications | Email delivery |
| **Alchemy** | Blockchain | RPC provider |
| **Gnosis Safe** | Treasury | Multi-sig custody |
| **Arbitrum** | All contracts | L2 blockchain network |

---

## 6. Compliance Touchpoints

| Feature | Compliance Requirements |
|---------|------------------------|
| **Token Sales (TGE)** | Securities compliance, Geographic restrictions, Accredited investor verification |
| **KeyGrow** | Real estate disclosures, Option consideration terms, Tenant rights |
| **DEX** | Trading risk disclosures, Price manipulation protections |
| **Banking** | KYC/AML, Financial regulations, FATF guidelines |
| **SUSU** | Group savings disclosures, Pool terms |
| **DePIN** | Hardware terms, Network participation agreements |
| **Identity** | Privacy policy, Data protection, GDPR considerations |
| **Treasury** | Fund custody disclosures, Multi-sig requirements |

---

*Last updated: December 2025*
