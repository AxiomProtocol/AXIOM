# Node Operator Program - Architecture

**Version:** 1.0  
**Created:** February 2, 2026  
**Source:** `pages/operator.tsx`, `pages/api/operator/*`, `shared/schema.ts`

---

## System Overview

The Node Operator Program is a hybrid on-chain/off-chain system that enables community members to participate in AXIOM Protocol governance through defined operator roles.

```
┌─────────────────────────────────────────────────────────────────┐
│                     AXIOM Node Operator Program                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────┐ │
│  │   Web Frontend   │───▶│   API Layer      │───▶│  Database  │ │
│  │  (Next.js/React) │    │  (Next.js API)   │    │ (PostgreSQL)│ │
│  └──────────────────┘    └──────────────────┘    └────────────┘ │
│           │                       │                      │       │
│           │                       │                      │       │
│           ▼                       ▼                      ▼       │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────┐ │
│  │  Wallet Auth     │    │  Email Service   │    │  On-Chain  │ │
│  │  (SIWE/MetaMask) │    │  (Resend)        │    │  Contracts │ │
│  └──────────────────┘    └──────────────────┘    └────────────┘ │
│                                                        │         │
│                                                        ▼         │
│                                              ┌──────────────────┐│
│                                              │  Arbitrum One    ││
│                                              │  (Chain 42161)   ││
│                                              └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Layer 1: Frontend (Off-Chain)

| Component | Location | Purpose |
|-----------|----------|---------|
| Operator Portal | `pages/operator.tsx` | Main UI for operators |
| Admin Panel | `pages/admin/operators.tsx` | Admin management |
| SiteLayout | `components/navigation.tsx` | Consistent navigation |

**Responsibilities:**
- Wallet connection (MetaMask SDK)
- SIWE authentication
- Application submission
- Status tracking
- Certificate display/print

### Layer 2: API (Off-Chain)

| Endpoint | Location | Purpose |
|----------|----------|---------|
| `/api/operator/apply` | `pages/api/operator/apply.ts` | Application submission |
| `/api/operator/status` | `pages/api/operator/status.ts` | Status lookup |
| `/api/operator/stats` | `pages/api/operator/stats.ts` | Program statistics |
| `/api/operator/submit-certification` | `pages/api/operator/submit-certification.ts` | Certification completion |
| `/api/admin/operators/*` | `pages/api/admin/operators/*` | Admin operations |

**Responsibilities:**
- Application intake and validation
- Status management
- Email notifications (via Resend)
- Admin operations (advance, reject, send email)
- Audit logging

### Layer 3: Database (Off-Chain)

| Table | Purpose |
|-------|---------|
| `node_operators` | Operator profiles and status |
| `node_onboarding` | Onboarding phase tracking |
| `operator_rewards` | Rewards/earnings ledger |
| `admin_audit_logs` | Admin action audit trail |
| `siwe_nonces` | SIWE authentication |
| `wallet_sessions` | Session management |

**Responsibilities:**
- Operator state persistence
- Onboarding progress tracking
- Rewards accounting (off-chain)
- Audit trail maintenance

### Layer 4: On-Chain (Arbitrum One)

*Status: Pending Step 2 Implementation*

| Contract | Purpose | Artifact |
|----------|---------|----------|
| NodeRegistry | Operator registration and roles | `archive/.../NodeRegistry.json` |
| NodeRewards | Rewards distribution | `archive/.../NodeRewards.json` |
| SlashingEngine | Penalty enforcement | `archive/.../SlashingEngine.json` |
| CapitalReadinessGate | Readiness verification | `archive/.../CapitalReadinessGate.json` |

**Responsibilities:**
- On-chain credential issuance
- Staking/bonding
- Rewards distribution (on-chain)
- Slashing for violations
- Readiness gate checks

---

## Scope Boundaries

### Off-Chain (Current Implementation)

| Function | Status | Location |
|----------|--------|----------|
| Application intake | Implemented | API + DB |
| Document review | Implemented | Admin Panel |
| Identity verification | Implemented | Admin workflow |
| Email notifications | Implemented | Resend integration |
| Certificate generation | Implemented | Frontend |
| Rewards display | Implemented | Frontend |
| Admin management | Implemented | Admin Panel |

### On-Chain (Step 2 Scope)

| Function | Status | Contract |
|----------|--------|----------|
| Operator registration | Pending | NodeRegistry |
| Role assignment | Pending | NodeRegistry |
| Credential issuance | Pending | NodeRegistry |
| Staking/bonding | Pending | NodeRegistry |
| Rewards distribution | Pending | NodeRewards |
| Slashing penalties | Pending | SlashingEngine |
| Readiness checks | Pending | CapitalReadinessGate |

---

## Integration Points

### Wallet Authentication (SIWE)

```
User → MetaMask → SIWE Nonce → Sign Message → Verify → Session
```

**Critical Configuration:**
- `next.config.js` must include `drizzle-orm` in `outputFileTracingIncludes`
- See `docs/DEPLOYMENT_SOP.md` for details

### Email Notifications (Resend)

```
Admin Action → API → Resend Connector → Operator Email
```

**Events triggering emails:**
- Application advancement
- Application rejection
- Custom admin messages
- Certification completion

### Blockchain RPC (Alchemy)

```
Frontend/API → Alchemy RPC → Arbitrum One
```

**Configuration:**
- Secret: `ALCHEMY_API_KEY`
- Networks: Arbitrum One (42161), Ethereum Mainnet, Testnets

---

## Security Model

### Authentication Layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Wallet | MetaMask signature | All operators |
| Session | SIWE + JWT | Authenticated actions |
| Admin | Wallet + ADMIN_WALLETS env | Admin panel |
| Rate Limiting | 30 req/min per wallet | Admin APIs |

### Access Control

| Role | Permissions |
|------|-------------|
| Visitor | View program info, connect wallet |
| Applicant | Submit application, view status |
| Operator | All applicant + certification |
| Admin | All operator + admin panel access |

---

## Related Documents

- [workflow.md](./workflow.md) - State machine details
- [data-model.md](./data-model.md) - Database schema
- [on-chain-spec.md](./on-chain-spec.md) - Contract specifications
