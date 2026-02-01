# Axiom Protocol Repository Inventory

**Scan Date:** December 22, 2025  
**Repository:** Axiom Smart City Platform  
**Objective:** Document existing infrastructure for SUSU Dual-Mode System implementation

---

## 1. Frontend Framework and Routing Structure

### Framework
- **Next.js** with custom Express backend
- **React 18** for UI components
- **Tailwind CSS** for styling
- **Framer Motion** for animations

### Routing Structure
| Route | Purpose | File |
|-------|---------|------|
| `/` | Landing page | `pages/index.js` |
| `/susu` | SUSU pools management | `pages/susu.js` |
| `/susu-admin` | SUSU admin dashboard | `pages/susu-admin.js` |
| `/dex` | DEX exchange | `pages/dex.js` |
| `/bank` | National Bank portal | `pages/bank.js` |
| `/governance` | Governance system | `pages/governance.js` |
| `/keygrow` | Rent-to-own program | (in pages/) |
| `/academy` | Educational platform | `pages/academy.js` |
| `/impact` | Platform metrics | (in pages/) |
| `/pma` | Private Membership Association | (in pages/) |
| `/transparency-reports` | Transparency data | `pages/transparency-reports.js` |
| `/admin/*` | Admin dashboards | `pages/admin/` |

### Navigation Configuration
- Centralized in `lib/navigation.js`
- Exports: `NAV_ITEMS`, `FOOTER_ECOSYSTEM`, `FOOTER_RESOURCES`, `FOOTER_COMPANY`
- Both homepage and Layout import from this config

---

## 2. Backend Services/APIs and Auth Model

### Backend Framework
- **Express.js** server running on port 5000
- **TypeScript** for type safety
- Server entry: `server/routes.ts`

### Authentication Models

#### 1. JWT Authentication (Primary)
- File: `server/auth.ts`
- Token expiry: 7 days
- Middleware: `authenticateToken`, `optionalAuth`, `requireAdmin`
- Password hashing: bcrypt with 12 salt rounds

#### 2. SIWE (Sign-In with Ethereum)
- Endpoints: `/api/auth/siwe/nonce`, `/api/auth/siwe/verify`, `/api/auth/siwe/session`, `/api/auth/siwe/logout`
- EIP-4361 compliant wallet authentication

#### 3. Admin Authentication
- JWT-based for `/admin/*` routes
- `withAdminAuth` middleware
- Endpoints: `/api/admin/auth/login`, `/api/admin/auth/session`, `/api/admin/auth/logout`

### API Structure
| Category | Base Path | Files |
|----------|-----------|-------|
| Authentication | `/api/auth/` | `pages/api/auth/siwe/*.ts` |
| Admin | `/api/admin/` | `pages/api/admin/*.ts` |
| SUSU | `/api/susu/` | `pages/api/susu/*.ts` |
| Compliance | `/api/compliance/` | `pages/api/compliance/*.ts` |
| DEX | `/api/dex/` | `pages/api/dex/*.ts` |
| Governance | `/api/governance/` | `pages/api/governance/*.ts` |
| KeyGrow | `/api/keygrow/` | `pages/api/keygrow/*.ts` |
| DePIN | `/api/depin/` | `pages/api/depin/*.ts` |
| Academy | `/api/academy/` | `pages/api/academy/*.ts` |
| Impact | `/api/impact/` | `pages/api/impact/*.ts` |

---

## 3. Database and ORM Details

### Database
- **PostgreSQL** (Neon-backed)
- Connection via `DATABASE_URL` environment variable
- File: `server/db.ts`

### ORM
- **Drizzle ORM** with PostgreSQL adapter
- Schema file: `shared/schema.ts` (3000+ lines)
- Migration tool: `drizzle-kit`
- Config: `drizzle.config.ts`

### Key Schema Modules

#### Core User System
- `users` - Core user accounts with roles and wallet addresses
- `userSessions` - Multi-device session tracking
- `userWallets` - Wallet connections
- `userTransactions` - Transaction history
- `userOnboarding` - Onboarding progress
- `userGoals` - Financial goals

#### SUSU-Specific Tables (Already Exist)
- `susuInterestHubs` - Regional interest hubs
- `susuPurposeCategories` - Purpose category definitions
- `susuPurposeGroups` - Off-chain purpose groups
- `susuHubMembers` - Hub membership tracking
- `susuGroupMembers` - Group membership tracking
- `susuInvitations` - Invitation system
- `susuAnalyticsEvents` - Funnel tracking events
- `susuFeatureFlags` - Feature flag configuration

#### Related Schemas
- KeyGrow: `shared/keygrowSchema.ts` (dedicated module)
- Main schema: `shared/schema.ts`
- Contracts: `shared/contracts.ts`

---

## 4. Smart Contract Infrastructure

### Source Files
- Location: `contracts/`
- 20 full Solidity source files + 4 interface-only files
- Compiler: Solidity 0.8.x

### Deployment
- Network: Arbitrum One (Chain ID: 42161)
- Deployer: `0xDFf9e47eb007bF02e47477d577De9ffA99791528`
- Admin/Treasury: `0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d`
- Deployment info: `contracts/deployment-info.json`

### Contract Configuration
- Centralized config: `shared/contracts.ts`
- ABI artifacts: `artifacts/contracts/`

### Key Contract Addresses
| Contract | Address |
|----------|---------|
| AxiomV2 (AXM) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| AxiomSusuHub | `0x6C69D730327930B49A7997B7b5fb0865F30c95A5` |
| Treasury | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` |
| Staking | `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885` |

---

## 5. Existing SUSU and Group Features

### AxiomSusuHub Contract (Deployed)
- Full ROSCA/SUSU functionality
- Pool creation with 2-50 members
- Cycle-based contributions (1-90 days)
- Sequential or randomized payout order
- Protocol fee routing to treasury
- Grace periods and penalties

### SUSU Frontend (`pages/susu.js`)
- Discover tab: Browse pools and groups
- My Pools tab: User's pool participation
- Create tab: Create new pools
- Pool details modal
- Wallet integration (MetaMask)

### SUSU API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api/susu/pools` | List on-chain pools |
| `/api/susu/pool/[id]` | Pool details |
| `/api/susu/user/[address]` | User's pools |
| `/api/susu/create-pool` | Create pool |
| `/api/susu/hubs` | Interest hubs |
| `/api/susu/groups` | Purpose groups |
| `/api/susu/categories` | Purpose categories |
| `/api/susu/discover` | Group discovery |
| `/api/susu/groups/[id]/graduate` | Graduate to on-chain |
| `/api/susu/admin/stats` | Admin statistics |
| `/api/susu/admin/feature-flags` | Feature flag management |

### Regional Interest Groups (Off-Chain)
- Three-tier system: Hubs → Purpose Groups → On-chain Pools
- Regional discovery with filters
- Purpose categories (12 preset: Emergency Fund, Home Down Payment, Business Startup, etc.)
- Graduation system to move groups on-chain

---

## 6. Existing Feature Flags and Configuration

### Feature Flag System
- Table: `susuFeatureFlags` in `shared/schema.ts`
- API: `/api/susu/admin/feature-flags`
- Managed via admin dashboard

### Environment Variables Pattern
- Validation: `lib/envValidation.ts`
- Standard functions for checking env vars
- Graceful fallback for production stability

### Available Secrets
| Secret | Purpose |
|--------|---------|
| `ATTOM_API_KEY` | Property data for KeyGrow |
| `RENTCAST_API_KEY` | Rental estimates |
| `DEPLOYER_PK` | Contract deployment |
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET` | Token signing |

---

## 7. Logging/Analytics and File Upload

### Logging
- Console logging in server routes
- Error logs: `/api/admin/error-logs`
- Client error logging: `/api/admin/log-client-error`
- DePIN event listener logs: `server/services/depinEventListener.ts`

### Analytics
- `susuAnalyticsEvents` table for funnel tracking
- Event types: hub_join, group_join, group_create, graduation
- Platform metrics: `platform_metrics` table

### File Upload
- Object storage integration (configured)
- Google Cloud Storage integration (configured)
- PDF generation: `pdfkit` library
- Document generation: `docx` library

---

## 8. UI Components to Reuse

### Core Components
| Component | File | Purpose |
|-----------|------|---------|
| Layout | `components/Layout.js` | Page wrapper with nav/footer |
| WalletContext | `components/WalletConnect/WalletContext.js` | Wallet state management |
| DisclosureBanner | `components/DisclosureBanner.tsx` | Compliance disclosures |
| AcknowledgementModal | `components/AcknowledgementModal.tsx` | User acknowledgements |
| ErrorBoundary | `components/ErrorBoundary.tsx` | Error handling |

### Governance Components
- Location: `components/Governance/`
- Proposal display
- Voting interfaces
- Delegation management

### Data Visualization
- `ProofOfReserves.js` - Reserve displays
- `ReservesHistoryChart.js` - Historical charts
- `TokenomicsPieChart.js` - Token distribution
- `TradingChart.js` / `AdvancedTradingChart.js` - Price charts
- `RoadmapTimeline.js` - Timeline display

### Utility Components
- `ExportButtons.js` - Data export
- `DownloadPDF.js` - PDF downloads
- `FAQAccordion.js` - FAQ display
- `GrowthMetric.js` - Metric display

---

## 9. Compliance Infrastructure (Existing)

### Compliance API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api/compliance/claims` | Claims registry |
| `/api/compliance/disclosures` | Disclosure management |
| `/api/compliance/acknowledge` | Acknowledgement tracking |
| `/api/compliance/complaints` | Complaint submission |
| `/api/compliance/stats` | Compliance statistics |
| `/api/admin/compliance/complaints` | Admin complaint management |

### Compliance Components
- `DisclosureBanner.tsx` - Display disclosures
- `AcknowledgementModal.tsx` - Collect acknowledgements

---

## 10. Third-Party Integrations

### Blockchain
- **Ethers.js** / **viem** - Web3 interactions
- **MetaMask SDK** - Wallet connection
- **Hardhat** - Contract development
- **OpenZeppelin** - Contract libraries

### External Services
- **Stripe** - Payment processing
- **SendGrid** - Email service
- **Alchemy** - Blockchain RPC
- **ATTOM Data** - Property data
- **RentCast** - Rental estimates
- **Walk Score** - Location scores (API key required)

### Storage
- **Google Cloud Storage** - File storage
- **Storacha** - IPFS/Web3 storage
- **Replit Object Storage** - Platform storage

---

## Summary: SUSU Implementation Readiness

### Already Implemented
- ✅ AxiomSusuHub smart contract (complete ROSCA)
- ✅ SUSU frontend page with pool management
- ✅ Regional Interest Hub system (off-chain)
- ✅ Purpose Groups with graduation flow
- ✅ Feature flag infrastructure
- ✅ Analytics event tracking
- ✅ Compliance disclosure/acknowledgement components

### Gaps to Fill for Dual-Mode SUSU
- ❌ Charter Engine (governance documents)
- ❌ Capital Mode threshold detection
- ❌ Enhanced dispute resolution
- ❌ Trust Center UI
- ❌ Mission Cards / Progress Loops
- ❌ Reputation profiles
- ❌ Template library

### Database Tables Needed
See PHASE 3-5 requirements for new tables:
- `susu_charters`
- `susu_charter_acceptances`
- `compliance_claims`
- `compliance_evidence`
- `compliance_disclosures`
- `trust_badges`
- `susu_templates`
- `susu_reliability_profiles`
- `susu_mission_cards`
