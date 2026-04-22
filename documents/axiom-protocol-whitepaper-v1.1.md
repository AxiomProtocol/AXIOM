# Axiom Protocol — Institutional Executive Summary & Technical Whitepaper

**Version:** 1.1  
**Date:** March 30, 2026  
**Classification:** Institutional Disclosure — Not Investment Advice  
**Issuer:** Axiom Nexus LLC  
**Network:** Arbitrum One (chainId: 42161)  
**Document Status:** Canonical Reference

---

> This document is provided for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any security or financial instrument. All on-chain references are verifiable on Arbitrum One. Performance and reserve data cited herein reflect the state of the protocol as of the date above and are subject to change. This document is not legal or investment advice.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Protocol Architecture Overview](#2-protocol-architecture-overview)
3. [AXUSD — Unified Stablecoin Infrastructure](#3-axusd--unified-stablecoin-infrastructure)
4. [Peg Stability Module (PSM)](#4-peg-stability-module-psm)
5. [Euler V2 Lending and Liquidity Layer](#5-euler-v2-lending-and-liquidity-layer)
6. [ERC-3643 Compliance Architecture](#6-erc-3643-compliance-architecture)
7. [Governance and Risk Controls](#7-governance-and-risk-controls)
8. [Reserve Methodology and Solvency Framework](#8-reserve-methodology-and-solvency-framework)
9. [Real Asset Infrastructure](#9-real-asset-infrastructure)
10. [Capital Formation and Syndication](#10-capital-formation-and-syndication)
11. [Tiered Access and Verified Participant Architecture](#11-tiered-access-and-verified-participant-architecture)
12. [Development Milestones — Tasks #42–#46](#12-development-milestones--tasks-4246)
13. [Institutional Adoption Audit](#13-institutional-adoption-audit)
14. [Retail Adoption Framework and Readiness Assessment](#14-retail-adoption-framework-and-readiness-assessment)
15. [On-Chain Proof of Execution](#15-on-chain-proof-of-execution)
16. [Known Issues and Remediation Status](#16-known-issues-and-remediation-status)
17. [Regulatory Positioning](#17-regulatory-positioning)
18. [Forward Roadmap](#18-forward-roadmap)
19. [Contract Address Registry](#19-contract-address-registry)
20. [Glossary](#20-glossary)

---

## 1. Executive Summary

Axiom Protocol is a governance-first wealth infrastructure operating on Arbitrum One. Its core mandate is to build a sovereign digital-physical economy in which community capital accumulation, real asset acquisition, and on-chain financial infrastructure operate under a unified compliance and governance layer — accessible to verified participants from both institutional and community entry points.

As of March 30, 2026, the protocol has completed a multi-phase upgrade cycle (Tasks #42–#46) that has advanced AXUSD from a prototype stablecoin into a production-grade, identity-gated financial instrument with a fully operational issuance and redemption mechanism, a two-lane tiered compliance architecture, an institutional audit readiness package, and live on-chain liquidity through Euler V2 lending markets and EulerSwap automated market-making pools.

### State of the Protocol — March 30, 2026

| Metric | Value |
|--------|-------|
| Canonical AXUSD Supply | 10,019.98 AXUSD |
| PSM Debt Ceiling | 1,000,000 AXUSD |
| PSM Utilization | ~1.0% |
| PSM Status | Live — MINTER_ROLE + AGENT_ROLE active |
| PSM Mint/Redeem Fee | 10 basis points (0.10%) |
| Active Euler Lending Vault (AXUSD) | eAXUSD-6 — `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` |
| Active Euler AXM Vault | eAXM-1 — `0x8e28ffa89d168599156004db4f4d12c2af7c250e` |
| EulerSwap USDC/AXUSD Pool | Deployed + Configured — `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` |
| EulerSwap AXM/AXUSD Pool | Deployed + Seeded — `0x981763699D269E129a08E216b1AeC7caa376A8a8` |
| Identity Framework | ERC-3643 — 3-topic claim system (KYC, Accredited, Sanctions) |
| Real Asset Deals (Pipeline) | 20 deals under analysis |
| Field Inspections | 3 completed |
| Syndication Offerings | 10 structured |
| Operations Logged | 12 founder ops entries |

### Core Differentiators

**1. Identity-Gated Financial Rails**  
Every AXUSD transaction is enforced through the ERC-3643 identity standard. No transfer, mint, or redeem is possible without on-chain verification. This is not a post-hoc compliance layer — it is enforced at the smart contract level on every transfer.

**2. Dual-Lane Participant Architecture**  
Lane A (institutional/accredited) and Lane B (verified standard) enable differentiated access to protocol products without exposing institutional infrastructure to unverified participants or requiring all participants to meet accredited investor thresholds.

**3. Physical-Digital Bridge**  
The protocol's land acquisition pipeline, field inspection system, and syndication module connect on-chain capital formation to real-world asset acquisition — providing a traceable bridge between digital participation and physical asset ownership.

**4. Transparent by Design**  
The Proof of Execution system, solvency console, and reserve methodology documentation create a multi-layer audit record that institutional counterparties can independently verify on-chain.

---

## 2. Protocol Architecture Overview

Axiom Protocol is organized into five functional layers, each operating with a defined interface to the others:

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: Physical World                                        │
│  Land Pipeline · Field Inspections · Syndication Closings       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Capital Formation                                     │
│  Syndication Module · Lending Fund · Community Entry Credit     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: DeFi Infrastructure                                   │
│  EulerSwap Pools · Euler Lending Vaults · PSM                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Compliance and Identity                               │
│  ERC-3643 · Identity Registry · Claim Topics · Tiered Access    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Governance and Token                                  │
│  AXM Governance Token · Governance Safe · Timelock Controller   │
└─────────────────────────────────────────────────────────────────┘
```

### Primary Tokens

| Token | Address | Standard | Status |
|-------|---------|----------|--------|
| AXM (Governance) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | ERC-20 | Live |
| Unified AXUSD (Stablecoin) | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | ERC-3643 | Live |
| eAXUSD-6 (Euler Receipt) | `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` | ERC-4626 | Live |
| eAXM-1 (Euler Receipt) | `0x8e28ffa89d168599156004db4f4d12c2af7c250e` | ERC-4626 | Live (supply-only) |

### Deprecated Tokens (No New Activity)

| Token | Address | Reason |
|-------|---------|--------|
| GENIUS AXUSD | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Superseded by Unified AXUSD |
| Euler AXUSD | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Superseded by Unified AXUSD |
| eAXUSD-4 | `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059` | Hook config issue; WITHDRAW_ONLY |

---

## 3. AXUSD — Unified Stablecoin Infrastructure

### 3.1 Architecture

AXUSD is a USD-pegged stablecoin deployed on Arbitrum One as an ERC-3643 identity-gated token. It supersedes all prior AXUSD generations (GENIUS epoch, Euler epoch) and operates as the single canonical stablecoin for the Axiom Protocol ecosystem.

The ERC-3643 standard enforces identity compliance at the transfer level. Every transfer — including mints, redeems, and wallet-to-wallet transfers — passes through the Identity Registry's `isVerified()` check. Unverified wallets cannot receive or send AXUSD, regardless of the transaction originator.

**Key Contract Properties:**

| Property | Value |
|----------|-------|
| Contract Address | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` |
| Implementation (Proxy) | `0xaf5e5db11fa94e510f4fd4c519abd3269462f394` |
| Standard | ERC-3643 (OpenZeppelin AccessControl) |
| Upgrade Pattern | Transparent Proxy |
| Decimals | 18 |
| Max Supply | 1,000,000,000 AXUSD |
| Current Supply | 10,019.98 AXUSD |
| Roles | DEFAULT_ADMIN_ROLE, MINTER_ROLE, AGENT_ROLE |
| Transfer Enforcement | Identity Registry + Compliance Module |

### 3.2 Access Control Model

AXUSD uses OpenZeppelin AccessControl — **not** the T-REX `addAgent`/`isAgent` pattern. Role grants are executed via `grantRole(role, address)`.

| Role | Keccak256 Hash | Current Holder | Gates |
|------|----------------|----------------|-------|
| DEFAULT_ADMIN_ROLE | `0x0000...0000` | Deployer EOA | Role management |
| MINTER_ROLE | `0x9f2df0...956a6` | Deployer EOA + Canonical PSM | `mint()`, `burn()` |
| AGENT_ROLE | `0xcab5a0...7709` | Deployer EOA + Canonical PSM | Agent-level access |

### 3.3 Supply History

| Date | Event | Supply |
|------|-------|--------|
| Pre-2026 | Legacy GENIUS and Euler epochs | Deprecated |
| 2026-03-26 | Canonical AXUSD + eAXUSD-6 launched; EulerSwap USDC/AXUSD seeded with 10,000 AXUSD | ~10,000 AXUSD |
| 2026-03-28 | AXM/AXUSD EulerSwap pool seeded with 9,000 AXUSD; eAXM-1 seeded with 10,000 AXM | ~10,000 AXUSD |
| 2026-03-30 | PSM activation; first end-to-end mint executed (20 USDC → 19.98 AXUSD) | **10,019.98 AXUSD** |

---

## 4. Peg Stability Module (PSM)

### 4.1 Overview

The Canonical PSM is the sole authorized mint/redeem venue for Unified AXUSD. It accepts USDC at a 1:1 rate (less fee) to mint AXUSD, and burns AXUSD to return USDC. Identity checks are enforced at the PSM level — callers must hold valid KYC_VERIFIED and SANCTIONS_CLEAR claims.

| Property | Value |
|----------|-------|
| Contract Address | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` |
| Reserve Asset | USDC (`0xaf88d065e77c8cC2239327C5EDb3A432268e5831`) |
| Mint Fee | 10 basis points (0.10%) |
| Redeem Fee | 10 basis points (0.10%) |
| Debt Ceiling | 1,000,000 AXUSD |
| Current Utilization | ~1.0% |
| Owner | Governance Safe (`0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d`) |
| MINTER_ROLE | Granted ✓ |
| AGENT_ROLE | Granted ✓ |

### 4.2 Mint Flow

```
User (Verified Wallet)
  │
  ├─ Step 1: USDC.approve(PSM, amount)
  │
  ├─ Step 2: PSM.mint(amount)
  │     ├─ Identity check: isVerified(msg.sender) → true required
  │     ├─ Fee deducted: fee = amount × 0.001 (10 bps)
  │     ├─ USDC transferred to PSM (amount)
  │     ├─ feesAccrued += fee (USDC)
  │     └─ AXUSD.mint(msg.sender, amount - fee)
  │
  └─ Result: Wallet receives AXUSD; PSM holds USDC reserve
```

### 4.3 Redeem Flow

```
User (Verified Wallet)
  │
  ├─ Step 1: AXUSD.approve(PSM, amount)
  │
  ├─ Step 2: PSM.redeem(amount)
  │     ├─ Identity check: isVerified(msg.sender) → true required
  │     ├─ Fee deducted: fee = amount × 0.001 (10 bps)
  │     ├─ AXUSD.burn(msg.sender, amount)
  │     ├─ feesAccrued += fee (USDC)
  │     └─ USDC.transfer(msg.sender, amount - fee)
  │
  └─ Result: Wallet receives USDC; AXUSD supply decreases
```

### 4.4 Fee Accounting

Fees accumulate in `feesAccrued` on the PSM contract. The Governance Safe may call `sweepFees(recipient)` to distribute accrued fees. The function follows CEI (checks-effects-interactions) — state is cleared before the USDC transfer executes, preventing reentrancy.

### 4.5 Ceiling Management

When PSM utilization exceeds 95%, a ceiling increase must be proposed through the Governance Safe with a 24-hour Timelock delay. The current ceiling of 1,000,000 AXUSD provides ~99× headroom above current supply, establishing a conservative bootstrap configuration.

---

## 5. Euler V2 Lending and Liquidity Layer

### 5.1 Lending Vaults

Axiom Protocol operates two active Euler V2 EVK (Ethereum Vault Kit) vaults on Arbitrum One:

**eAXUSD-6 — AXUSD Lending Market**

| Property | Value |
|----------|-------|
| Address | `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` |
| Asset | Unified AXUSD |
| Mode | Supply + Borrow |
| Oracle | ERC-7726 (AXUSD/USD) |
| Status | Live |
| Initial Liquidity | 10,000 AXUSD seeded at deployment |

**eAXM-1 — AXM Collateral Vault**

| Property | Value |
|----------|-------|
| Address | `0x8e28ffa89d168599156004db4f4d12c2af7c250e` |
| Asset | AXM Governance Token |
| Mode | Supply-only (no borrowing) |
| Oracle | `address(0)` — collateral pricing external |
| hookConfig | Fixed; hookTarget=`address(0)`, hookedOps=32767 |
| Status | Live |
| Initial Liquidity | 10,000 AXM seeded for AXM/AXUSD EulerSwap pool |

**Deprecated Vault**

| Vault | Address | Status | Action |
|-------|---------|--------|--------|
| eAXUSD-4 | `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059` | WITHDRAW_ONLY | Hook config issue; no new deposits; existing holders may withdraw |

### 5.2 Euler Earn Vault

| Property | Value |
|----------|-------|
| Address | `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` |
| Type | Euler Earn (yield-bearing) |
| Asset | AXUSD |
| Status | Live |

### 5.3 EulerSwap Automated Market-Making Pools

Axiom Protocol operates two EulerSwap pools, providing on-chain liquidity for AXUSD and AXM:

**USDC/AXUSD Pool**

| Property | Value |
|----------|-------|
| Pool Address | `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` |
| Token Pair | USDC / Unified AXUSD |
| Equilibrium Peg | 1:1 |
| Fee | 0.30% |
| Concentration | 0.5 |
| LPM Whitelist | ✓ (index [10], correct LPM=`0xC0177120...Bb6F`) |
| Deployment Date | 2026-03-26 |
| Status | Deployed + Configured |

**AXM/AXUSD Pool**

| Property | Value |
|----------|-------|
| Pool Address | `0x981763699D269E129a08E216b1AeC7caa376A8a8` |
| Token Pair | AXM / Unified AXUSD |
| Supply Vault 0 | eAXM-1 |
| Supply Vault 1 | eAXUSD-6 |
| Pool Reserves | 10,000 AXM / 9,000 AXUSD |
| Fee | 0.30% |
| Concentration | 0.5 |
| Fee Recipient | AxiomFeeBurner |
| Deployment Date | 2026-03-28 |
| Status | Deployed + Seeded |

---

## 6. ERC-3643 Compliance Architecture

### 6.1 Overview

AXUSD uses the ERC-3643 (T-REX) standard for identity-gated compliance. Every transfer is validated against an on-chain Identity Registry. Wallets without valid claims cannot send or receive AXUSD — enforcement is at the contract level, not at the application layer.

### 6.2 Infrastructure Contracts

| Contract | Address | Role |
|----------|---------|------|
| Unified AXUSD Token | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | Token with transfer hooks |
| Identity Registry | `0x58f64a1262d5434d6C7637a2309b0999bB6D1970` | Maps wallets to ONCHAINID contracts; enforces `isVerified()` |
| Identity Registry Storage | `0x5A906507f886db1f41b12c75324C96dE27aB2E81` | Persistent identity storage |
| Modular Compliance | `0xD94a0dAc0c5Ce2D5f0E9FDe4fD5c30Ea82F06A84` | Routes transfer checks to compliance modules |
| Claim Topics Registry | `0xf4eA4f42fC03a5bE104fcB91e109665ae7b0EB18` | Authoritative list of recognized claim topic IDs |
| Trusted Issuers Registry | `0x3367c571f5ae60b4E2c5ABca22cA311b413F89D1` | Whitelists claim issuers per topic |
| Claim Issuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` | Signs and revokes claims on behalf of Axiom Protocol |
| Identity Factory | `0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9` | Deploys EIP-1167 minimal proxy ONCHAINID contracts |

### 6.3 Claim Topic Registry

| Topic ID | Name | Validity | Required For | Off-Chain Process |
|----------|------|----------|-------------|-------------------|
| 1 | KYC_VERIFIED | 365 days | All AXUSD transfers; PSM mint/redeem | Name, DOB, country, document type; reviewed by compliance team |
| 2 | ACCREDITED_INVESTOR | 365 days | Lending Fund; Lane A products | Self-certification of accreditation basis; documentation review |
| 3 | SANCTIONS_CLEAR | 180 days | All AXUSD transfers | Automated sanctions screening against OFAC, EU, UN watchlists |

**`isVerified()` Logic:**  
A wallet is considered verified (and may transfer AXUSD) when it holds valid, unrevoked claims for **both Topic 1 (KYC_VERIFIED) and Topic 3 (SANCTIONS_CLEAR)**. Topic 2 is required additionally for Lane A (institutional/accredited) products.

### 6.4 Claim Lifecycle

```
Submission (off-chain)
  │  User submits KYC form at /axusd → database: t3_kyc_submissions
  │
Compliance Review (Founder Ops dashboard)
  │  Operator reviews queue, approves or rejects
  │
Atomic On-Chain Approval
  │  ERC3643Service.atomicKycApproval():
  │  1. deployIdentity(wallet) → ONCHAINID contract
  │  2. registerIdentity(wallet, identity, country)
  │  3. issueClaim(topic=1) — KYC
  │  4. issueClaim(topic=3) — Sanctions
  │  All four calls in a single coordinated sequence
  │
Active State
  │  wallet.isVerified() = true → can send/receive AXUSD
  │
Expiry or Revocation
     Claim.validTo exceeded → isVerified() = false → transfers blocked
     Compliance revokes: ClaimIssuer.revokeClaimBySignature()
```

### 6.5 Compliance Operations Infrastructure (Task #44)

The following database tables and API endpoints were added in Task #44 to support ongoing identity compliance operations:

**Database Tables:**
- `t3_accreditation_submissions` — Accredited investor self-certifications
- `t3_compliance_ops_log` — Timestamped log of all claim lifecycle events

**API Endpoints:**
- `POST /api/erc3643/identity/approve` — Atomic KYC approval (registerIdentity + Topics 1 + 3)
- `POST /api/erc3643/identity/revoke` — Claim revocation
- `GET /api/erc3643/identity/compliance-log` — Full compliance event log
- `POST /api/erc3643/accreditation/submit` — Accreditation submission
- `POST /api/erc3643/accreditation/approve` — Accreditation approval (Topic 2 issuance)

**Founder Ops Compliance Tab:**
The Founder Operations dashboard (`/founder-ops`) includes a dedicated Compliance tab with:
- KYC approval queue with one-click atomic approval
- Accreditation review queue
- Claim revocation interface
- Full compliance operations log

---

## 7. Governance and Risk Controls

### 7.1 Governance Structure

| Authority Layer | Mechanism | Contracts Governed |
|-----------------|-----------|-------------------|
| Governance Safe (3-of-5) | Gnosis Safe multisig at `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | PSM owner; emergency pause; fee sweep; ceiling changes |
| Timelock Controller (24h) | Enforces upgrade delay | All upgradeable contracts (proxy admin) |
| Deployer EOA | Bootstrap phase only | AXUSD token admin; Identity Registry admin (pending migration) |
| AXM Admin Safe | Multisig | AXM MINTER_ROLE |

### 7.2 Role Model (Task #42)

| Role | Holder | Functions Gated | Timelock Required |
|------|--------|-----------------|-------------------|
| EMERGENCY_ROLE | Governance Safe (3-of-5) | `pause()` on all pausable contracts | No — immediate |
| OPERATOR_ROLE | Deployer EOA → Safe (pending) | `freeze()`, `unfreeze()` on AXUSD | No |
| MINTER_ROLE | Deployer EOA + PSM + Governance Safe | `mint()`, `burn()` on AXUSD | No (Safe proposal for ≥10K AXUSD) |
| COMPLIANCE_ROLE | Deployer EOA → Safe (pending) | Claim issuance, whitelist | No |
| UPGRADER_ROLE | Timelock | Proxy admin upgrades | Yes — 24h delay |

### 7.3 Emergency Powers

The following functions may bypass the 24-hour Timelock under defined emergency conditions. All emergency actions require 3-of-5 Safe signatures and mandatory post-action disclosure within 24 hours.

| Function | Trigger Conditions | Authorization | Two-Person Rule |
|----------|--------------------|--------------|-----------------|
| `pause()` | Active exploit; regulatory order; critical vulnerability | 3-of-5 Safe | Yes |
| `emergencySweep()` | Imminent contract compromise; regulatory seizure | 3-of-5 Safe | Yes |
| `freeze(address)` | OFAC designation; court order; active exploit from address | Deployer EOA (→ Safe pending) | Yes (policy) |
| `forcedTransfer()` | Court order; regulatory asset recovery directive | Governance Safe | Yes |

Full emergency powers policy documented in `docs/emergency-powers-policy.md`.

### 7.4 Admin Action Log

Every mint, burn, freeze, forced transfer, pause, and registry update is written to the `admin_action_log` database table and visible in the Founder Operations dashboard with txHash, action type, target address, amount, and timestamp. This provides a tamper-evident off-chain audit trail supplementing on-chain event logs.

### 7.5 Migration Roadmap (Task #42 Progress)

| Contract | Function Class | Current State | Target State |
|----------|---------------|---------------|--------------|
| Canonical PSM | Owner | Governance Safe ✓ | Complete |
| Unified AXUSD Token | Owner | Deployer EOA | Transfer to Governance Safe |
| Unified AXUSD Token | Agent (mint/burn) | Deployer EOA + PSM | PSM as sole agent; EOA revoked |
| Identity Registry | Owner | Deployer EOA | Transfer to Governance Safe |
| Identity Registry | Agent | Deployer EOA | Delegated to compliance tooling |
| Modular Compliance | Owner | Deployer EOA | Transfer to Governance Safe |
| AXM Token | MINTER_ROLE | AXM Admin Safe ✓ | Complete |

---

## 8. Reserve Methodology and Solvency Framework

### 8.1 Reserve Hierarchy

AXUSD reserves are held across three segregated pools:

| Pool | Address | Role | Status |
|------|---------|------|--------|
| Canonical PSM (ERC-3643) | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` | Primary reserve pool for Unified AXUSD. Identity-gated. 10 bps fee. | Live |
| Legacy GENIUS PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | USDC reserves from legacy GENIUS epoch. Retained as supplementary backstop. | Configured-Inactive |
| Backstop Vault (USDC) | `0x54438249457694eB5431811f3f19444Af0a01B29` | Emergency USDC reserve. 24h timelock on withdrawals. Tail redemption coverage. | Live |

### 8.2 Core Metrics and Formulas

**Reserve Ratio (RR)**
```
RR = Total USDC Reserves / Canonical AXUSD Total Supply × 100

Where:
Total USDC Reserves = Canonical PSM USDC Balance
                    + Legacy GENIUS PSM USDC Balance
                    + Backstop Vault USDC Balance
```
Target: RR ≥ 100% at all times. The protocol targets RR ≥ 105% under normal operations.

**Coverage Ratio (CR)**
```
CR = Treasury Total Assets / Total Protocol Liabilities
```
Where Treasury Total Assets = on-chain treasury USD value; Total Protocol Liabilities = AXUSD outstanding + any off-chain obligations. A CR ≥ 1.0 indicates full coverage.

**Liquidity Buffer Ratio (LBR)**
```
LBR = Immediately Liquid Reserves / Total Protocol Liabilities
```
Where Immediately Liquid Reserves = Canonical PSM USDC only (excluding backstop vault with 24h timelock and legacy PSM with potential migration lock).

### 8.3 Policy Thresholds

| Mode | CR Range | LBR Condition | Protocol Response |
|------|----------|---------------|-------------------|
| NORMAL | ≥ 1.05 | LBR ≥ 0.50 | No restriction |
| CAUTION | 1.00–1.05 | LBR ≥ 0.30 | Alert issued; remediation plan required within 48h |
| RESTRICTED | 0.90–1.00 | LBR < 0.30 | PSM debt ceiling frozen; new product launches paused |
| EMERGENCY | < 0.90 | Any | Emergency pause eligible; governance vote required |
| BOOTSTRAP | N/A | Protocol in early deployment | Current mode — no restrictions |

### 8.4 Stress Testing

Three canonical stress scenarios are modeled in `/api/axusd/treasury-health`:

| Scenario | Redemption Wave | Coverage Test |
|----------|----------------|---------------|
| S1 | 10% of AXUSD supply redeemed simultaneously | Reserves ≥ S1 redemption amount |
| S2 | 25% of AXUSD supply redeemed simultaneously | Reserves ≥ S2 redemption amount |
| S3 | 50% of AXUSD supply redeemed simultaneously | Reserves ≥ S3 redemption amount |

### 8.5 Solvency Attestation Cadence

| Frequency | Action | System |
|-----------|--------|--------|
| Continuous | On-chain reserve balance queryable | Arbitrum One RPC |
| Per Snapshot | Solvency snapshot written to database with CR, RR, LBR, policy mode | `/api/solvency/latest` |
| On Demand | Institutional diligence pack JSON | `/api/solvency/diligence-pack` |
| Quarterly (planned) | Third-party reserve attestation | External accounting firm |

---

## 9. Real Asset Infrastructure

### 9.1 Land Acquisition Pipeline

The protocol maintains a live pipeline of real estate acquisition targets analyzed through its Deal Intelligence system. As of March 30, 2026:

| Metric | Count |
|--------|-------|
| Total Deals | 20 |
| Strategy — Buy & Hold | 12 |
| Strategy — Fix & Flip | 5 |
| Strategy — BRRRR | 2 |
| Strategy — Note/Seller Finance | 1 |
| Status — Under Underwriting | 18 |
| Status — Draft | 2 |

### 9.2 Field Inspection System (Layer 5)

The Field Capture system enables mobile-first, structured property walkthroughs with:
- Unit-level condition assessment
- Sampling confidence scoring
- Geo-tagged inspection records
- Reviewer sign-off workflow

3 field inspection sessions completed as of March 30, 2026.

### 9.3 Property Analysis Intelligence

The protocol's property analysis tools include:
- **IVCEE** (Institutional Viability & Capital Efficiency Engine) — allocator-grade underwriting intelligence
- **Cost Intelligence Engine** — production-grade rehab underwriting grounded in Craftsman National Construction Estimator (NCE) data (57 reference costs)
- **Multi-Exit Strategy Engine** — 8 underwriting strategies with comparison and ranking
- **AI Acquisition Memo Builder** — Gemini-powered institutional acquisition memo generation
- **MIRDT Capital Intelligence Terminal** — nine-dimension advisory signal engine producing a Protocol Readiness Score (PRS, 0–10)

---

## 10. Capital Formation and Syndication

### 10.1 Syndication Module

10 structured syndication offerings are recorded in the protocol's capital formation system. The syndication module operates under SEC Reg D 506(c), restricting participation to accredited investors. The module includes:
- Offering lifecycle management (draft → open → closed → settled)
- LP Investor Portal with capital account views
- K-1 generation infrastructure
- Waterfall calculator (IRR, equity multiple, preferred return)
- Document upload and signature workflows

### 10.2 Lending Fund

The protocol operates a Lending Fund (SEC Reg D 506(c)) providing real estate bridge capital to Steward-tier and above participants in the Graduated Execution Framework. The On-Chain Lending Credit Market includes production smart contracts (`AXIOMFixedLoan` and `AXIOMCreditMarket`) deployed on Arbitrum One.

### 10.3 Banking Infrastructure

The protocol integrates:
- **Unit Finance** — FDIC-insured deposit accounts, ACH, debit cards, KYC
- **BitGo CaaS** — Institutional crypto custody
- **Bridge Service** — Fiat ↔ crypto settlement layer

---

## 11. Tiered Access and Verified Participant Architecture

### 11.1 Dual-Lane Model (Task #45)

The protocol operates two compliance lanes that determine product access without requiring all participants to meet institutional accreditation thresholds:

**Lane A — Institutional / Accredited**

| Requirement | Topics 1, 2, 3 (KYC + Accredited + Sanctions Clear) |
|-------------|------------------------------------------------------|
| Access | Lending Fund borrowing; syndication settlement; unlimited AXUSD transfer |
| Transfer Limit | Higher cap (configurable via TransferLimitModule) |
| Onboarding | Full KYC + Accredited Investor self-certification |

**Lane B — Verified Standard**

| Requirement | Topics 1, 3 (KYC + Sanctions Clear) |
|-------------|--------------------------------------|
| Access | AXUSD wallet, PSM mint/redeem, EulerSwap, Community Entry Credit |
| Transfer Limit | 25,000 AXUSD/day cap |
| Onboarding | Standard KYC submission; 48h review time |

**EulerSwap Access:** Both lanes may access EulerSwap pools, which are whitelisted in the LendingPlatformModule. Institutional liquidity provision and Euler vault deposits are accessible to Lane A and Lane B verified wallets.

### 11.2 Graduated Execution Framework (GEF)

The GEF is a participation-history-based access system that governs protocol credit and product access for community participants. GEF tier is determined by contribution record — not capital size.

| Tier | Credit Limit | Requirement |
|------|-------------|-------------|
| Observer | $0 | Wallet connected |
| Participant | $1,500 | Completed first full Wealth Practice cycle |
| Operator | $5,000 | Multi-cycle contributor; consistent record |
| Steward | $10,000 | Group facilitator or multi-group participant |
| Architect | $25,000 | Protocol-level participation; governance record |

### 11.3 The Wealth Practice

The Wealth Practice (formerly "Savings Circle") is the protocol's community economic coordination layer. It operates on a rotating community savings model where members contribute fixed amounts on a defined schedule and each member receives the full pool on a rotating basis. Groups are managed on-chain with a three-stage trust pipeline, governance participation, and GEF contribution tracking.

---

## 12. Development Milestones — Tasks #42–#46

The following five engineering tasks represent the most significant protocol maturation phase to date, transforming AXUSD from a prototype into a production-grade institutional instrument.

### Task #42 — AXUSD Governance Hardening

**Objective:** Migrate protocol administrative authority away from a single deployer EOA toward a structured multisig and role-separated governance model.

**Deliverables Completed:**
- `src/config/adminRoles.ts` — OPERATOR_ROLE, MINTER_ROLE, COMPLIANCE_ROLE, EMERGENCY_ROLE, UPGRADER_ROLE defined with documentation
- Admin API route enforcement — all admin routes validate caller role rather than a single shared key
- `admin_action_log` database table — every privileged action timestamped
- Founder Ops admin action log panel — last 50 actions visible with txHash and metadata
- `docs/emergency-powers-policy.md` — defines timelock bypass conditions, authorization requirements, two-person rule
- Canonical PSM deployed with Governance Safe as owner (not Deployer EOA)

**Remaining Work:** AXUSD token owner transfer and ERC-3643 agent delegation from Deployer EOA to Governance Safe is in progress (see Known Issues KI-001).

---

### Task #43 — AXUSD Issuance and Redemption Upgrade (Canonical PSM)

**Objective:** Deploy and activate the Canonical PSM, enabling verified users to mint and redeem AXUSD against USDC for the first time.

**Deliverables Completed:**
- Canonical PSM deployed at `0xDB669bb6cA07215C5B055B62072AAED2F821E53F`
- PSM registered in `activeContracts.generated.ts` as `CANONICAL_PSM`
- **Root cause resolved:** AXUSD uses OZ AccessControl (`grantRole`/`hasRole`), not T-REX `addAgent`/`isAgent`. Both MINTER_ROLE and AGENT_ROLE successfully granted to PSM via corrected `activate-psm.ts` script
- `/api/axusd/psm` upgraded to report canonical PSM stats and legacy PSM as a deprecated separate object
- Mint/Redeem UI panel added to `axusd-3643.tsx` with identity gate, PSM metrics, and fee display
- `docs/reserve-methodology.md` — canonical reserve definition document

**End-to-End Verification:**
The first live mint was executed successfully post-activation: 20 USDC deposited → 19.98 AXUSD minted (0.02 USDC fee at 10 bps). AXM vault deposit of 20 AXM → eAXM-1 also executed and confirmed. Total supply grew to 10,019.98 AXUSD.

---

### Task #44 — AXUSD Compliance Operations Upgrade

**Objective:** Build a complete compliance operations layer for ERC-3643 AXUSD identity management, enabling the team to manage KYC approvals, accreditation reviews, claim revocations, and compliance logging through a production dashboard.

**Deliverables Completed:**
- `t3_accreditation_submissions` table — stores accreditation self-certifications with basis and documentation references
- `t3_compliance_ops_log` table — append-only log of all claim lifecycle events with operator, action, and timestamp
- `POST /api/erc3643/identity/approve` — atomic KYC approval: registers identity + issues Topics 1 and 3 in a single coordinated sequence
- `POST /api/erc3643/identity/revoke` — claim revocation via ClaimIssuer
- `GET /api/erc3643/identity/compliance-log` — paginated compliance event history
- `POST /api/erc3643/accreditation/submit` — accreditation submission entry point
- `POST /api/erc3643/accreditation/approve` — Topic 2 issuance upon approval
- Updated `expiry-check.ts` with Resend email alerts (30-day renewal warnings)
- Founder Ops Compliance tab — KYC queue, accreditation queue, revoke interface, ops log

---

### Task #45 — AXUSD Tiered Access Architecture and Verified User UX

**Objective:** Implement the dual-lane compliance architecture (Lane A institutional, Lane B standard) and build a consumer-facing AXUSD wallet experience that hides ERC-3643 complexity from standard users while preserving full compliance enforcement.

**Deliverables Completed:**
- Lane A / Lane B claim topic requirements and transfer limits defined in `src/config/tierConfig.ts`
- `checkParticipantLane(wallet)` utility — returns `{ lane: 'A' | 'B' | 'unverified', topics: number[] }` from on-chain identity
- Consumer-facing AXUSD wallet page — balance, transfer history, compliance status badge, transfer form, Get Verified CTA
- KYC Onboarding Modal — 3-step flow: wallet connect → personal info → pending screen; calls `/api/erc3643/identity/submit`
- Compliance status badge — Not Verified / Pending / Verified Standard / Accredited — visible in nav for connected wallets
- Institutional route protection — syndication and vault routes check lane before proceeding
- Disclosure page "Participation Tiers" section — plain language explanation of Lane A and Lane B

---

### Task #46 — AXUSD Audit and Assurance Readiness Package

**Objective:** Produce all in-repo deliverables required for external smart contract audit engagement and institutional due diligence review.

**Deliverables Completed:**

| Document | Path | Description |
|----------|------|-------------|
| Reserve Methodology | `docs/reserve-methodology.md` | Reserve pool definitions, RR formula, PSM utilization, stress scenarios |
| Admin Controls Disclosure | `docs/admin-controls-disclosure.md` | Every privileged function, authority holder, EOA vs Safe status |
| Solvency Methodology | `docs/solvency-methodology.md` | CR, RR, LBR formulas, threshold definitions, data sources |
| Claim Topic Registry | `docs/claim-topic-registry.md` | All ERC-3643 topic IDs, validity periods, off-chain processes |
| Legal Entity Disclosure | `docs/legal-entity-disclosure.md` | Axiom Nexus LLC, registered address, operator relationship |
| Whitepaper Corrections | `docs/whitepaper-v1.1-corrections.md` | All corrections vs prior published claims (6 corrections documented) |
| Audit Readiness Checklist | `docs/audit-readiness-checklist.md` | Smart contract audit requirements with current status per item |
| Emergency Powers Policy | `docs/emergency-powers-policy.md` | Timelock bypass functions, conditions, two-person rule |
| Diligence Pack API | `/api/solvency/diligence-pack` | Structured JSON combining solvency, contracts, claims, reserve methodology |
| Disclosure Page Links | `/disclosure` | Each document linked with last-updated timestamp |

---

## 13. Institutional Adoption Audit

This section provides an objective assessment of the protocol's readiness for institutional counterparty engagement. Each criterion is rated on a three-point scale: **Ready** / **In Progress** / **Not Started**.

### 13.1 Legal and Entity Structure

| Criterion | Status | Notes |
|-----------|--------|-------|
| Legal entity disclosed | Ready | Axiom Nexus LLC — documented in `docs/legal-entity-disclosure.md` |
| Registered address documented | Ready | Filed with state authority |
| Operator/issuer relationship documented | Ready | Axiom Nexus LLC is both issuer and operator |
| Regulatory framework identified | Ready | Designed to align with GENIUS Act stablecoin framework |
| Regulatory counsel engaged | Not Started | Templates provided; outside counsel execution pending |
| Legal opinion on token classification | Not Started | AXM: not characterized as a security. AXUSD: payment stablecoin. Formal opinion pending |

### 13.2 Reserve and Solvency

| Criterion | Status | Notes |
|-----------|--------|-------|
| Reserve methodology documented | Ready | `docs/reserve-methodology.md` |
| Reserve assets disclosed | Ready | Canonical PSM USDC, Legacy PSM USDC, Backstop Vault USDC |
| On-chain reserve queryable | Ready | PSM and Backstop Vault balances publicly readable |
| Coverage Ratio computed | Ready | Live in `/api/solvency/latest` |
| Solvency snapshots timestamped | Ready | 10 snapshots on record |
| Third-party reserve attestation | Not Started | Accounting firm engagement pending |
| Audit of reserve calculation logic | Not Started | Contingent on smart contract audit |

### 13.3 Smart Contract Security

| Criterion | Status | Notes |
|-----------|--------|-------|
| Contracts deployed and verified | Ready | All canonical contracts on Arbiscan |
| Deployment scripts available | Ready | `/scripts/` directory |
| Known issues documented | Ready | 6 known issues in `docs/audit-readiness-checklist.md` |
| Admin controls documented | Ready | `docs/admin-controls-disclosure.md` |
| Emergency procedures documented | Ready | `docs/emergency-powers-policy.md` |
| Smart contract audit | Not Started | Audit readiness package complete; engagement pending |
| Test suite | Not Started | Recommended prior to audit |
| Formal threat model | Not Started | Recommended prior to audit |
| Bug bounty program | Not Started | Planned for post-audit |

### 13.4 Governance

| Criterion | Status | Notes |
|-----------|--------|-------|
| Multisig governance documented | Ready | Governance Safe (3-of-5) at `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` |
| PSM owned by multisig | Ready | Governance Safe owns Canonical PSM ✓ |
| Timelock on upgrades | Ready | 24-hour Timelock Controller |
| AXUSD token migrated to multisig | In Progress | Deployer EOA holds admin; migration planned |
| Identity Registry migrated to multisig | In Progress | Deployer EOA holds admin; migration planned |
| On-chain governance (AXM voting) | Not Started | Planned for Universe Blockchain (L3) migration |

### 13.5 Compliance and Identity

| Criterion | Status | Notes |
|-----------|--------|-------|
| Identity-gated transfers | Ready | ERC-3643 enforced at contract level |
| KYC workflow operational | Ready | Full submission → review → approval flow live |
| Accredited investor workflow | Ready | Self-certification submission and Topic 2 issuance live |
| Sanctions screening | Ready | Topic 3 (SANCTIONS_CLEAR); 180-day validity |
| Claim revocation capability | Ready | `ERC3643Service.revokeClaim()` + API endpoint |
| Compliance operations log | Ready | `t3_compliance_ops_log` + Founder Ops dashboard |
| OFAC + international sanctions lists | In Progress | US-based screening active; international expansion planned |
| Third-party KYC provider integration | Not Started | Stubbed for Synaps/Persona; internal review in use |

### 13.6 Transparency and Audit Trail

| Criterion | Status | Notes |
|-----------|--------|-------|
| Proof of Execution page | Ready | `/proof-of-execution` — 7 evidence rails |
| On-chain activity feed | Ready | Live PSM, vault, and EulerSwap transactions |
| Solvency console | Ready | `/solvency` — three-mode institutional console |
| Institutional disclosure page | Ready | `/disclosure` — with all doc links and timestamps |
| Hash chain audit record | Ready | 1 entry; expanding |
| Admin action log | Ready | Founder Ops dashboard |
| Diligence pack API | Ready | `/api/solvency/diligence-pack` |

### 13.7 Institutional Readiness Summary

**Overall Assessment:** The protocol has completed the foundational infrastructure required to engage institutional counterparties. The primary blockers to full institutional readiness are: (1) Deployer EOA → Governance Safe migration for AXUSD token and Identity Registry; (2) smart contract audit; and (3) third-party reserve attestation.

| Category | Score (Weighted) |
|----------|-----------------|
| Legal/Entity Structure | 4 / 6 |
| Reserve/Solvency | 5 / 7 |
| Smart Contract Security | 5 / 10 |
| Governance | 4 / 6 |
| Compliance/Identity | 7 / 8 |
| Transparency | 7 / 7 |
| **Total** | **32 / 44 (73%)** |

A score of 73% represents a sound foundation with identifiable, actionable gaps. No criterion in this assessment is structurally blocked — each remaining gap has a defined remediation path.

---

## 14. Retail Adoption Framework and Readiness Assessment

### 14.1 Current Retail Entry Points

| Product | Route | Lane | Minimum |
|---------|-------|------|---------|
| AXUSD Wallet | `/axusd` | Lane B (verified) | KYC only |
| Wealth Practice | `/wealth-practice` | Unverified (community) | No minimum |
| Community Entry Credit | `/community-credit` | Lane B (verified) | GEF Participant tier |
| Deal Flow Feed | `/deal-flow` | Unverified | None |
| Property Analysis | `/property-analysis` | Unverified | Free tier available |

### 14.2 Retail Onboarding Journey

```
Step 1: Wallet Connection
  └─ Connect via Reown AppKit (WalletConnect / MetaMask)

Step 2: KYC Submission
  └─ 3-step KYC Onboarding Modal
      │  Name, DOB, country, document type
      └─ Estimated 48h review

Step 3: Verification Confirmation
  └─ Compliance badge changes to "Verified Standard"
     isVerified() = true on-chain

Step 4: Protocol Access
  └─ AXUSD wallet active
     PSM mint/redeem available
     EulerSwap access enabled
     Community Entry Credit eligible
```

### 14.3 Retail Readiness Assessment

| Criterion | Status | Notes |
|-----------|--------|-------|
| Wallet connection | Ready | Reown AppKit v1.8 + SIWE; Arbitrum One |
| Mobile-responsive UI | Ready | All critical pages mobile-optimized |
| KYC onboarding modal | Ready | 3-step in-app flow |
| AXUSD wallet page | Ready | Balance, transfers, compliance status |
| Compliance badge in nav | Ready | Real-time status for connected wallets |
| PSM mint/redeem UI | Ready | Full UI with fee display and ceiling indicator |
| Get Verified CTA | Ready | Surfaces from nav badge and wallet page |
| Wealth Practice groups | Ready | Join, contribute, governance |
| Community Entry Credit | Ready | Up to $1,500 for Participant tier |
| Deal Flow access | Ready | Distressed property feed |
| Mobile KYC capture | In Progress | Document photo upload on mobile |
| Push notifications | Not Started | Claim expiry reminders; contribution cycle alerts |
| Localization | Not Started | English only currently |
| Fiat on-ramp | Not Started | Planned via banking bridge (Unit + BitGo) |

### 14.4 Community Economic Model

The Wealth Practice model provides a retail-accessible entry point that does not require capital thresholds or financial sophistication. Groups set their own contribution amounts (some starting at $50/cycle), and GEF tier advancement is driven entirely by participation consistency — not investment size.

This creates a bottom-up pathway: a community member can enter through the Wealth Practice, build a GEF tier record, access Community Entry Credit, and eventually qualify for Protocol-level products (Lending Fund access, Syndication LP participation) through sustained participation rather than minimum capital deployment.

### 14.5 Retail Risk Disclosures

- AXUSD is an identity-gated stablecoin. Unverified wallets cannot hold or transfer AXUSD. Loss of identity verification (claim expiry, revocation) results in transfer restriction.
- Wealth Practice groups are community-managed. The protocol provides infrastructure and governance tools; member disputes and cycle defaults are managed by the group.
- Community Entry Credit is a protocol-extended credit facility, not a bank loan. Terms are defined in the credit agreement and enforced through GEF violation tracking.
- All on-chain assets are held in self-custody. The protocol does not take custody of user funds.
- Variable rates apply to all yield-generating products. No fixed returns are guaranteed.
- Smart contracts are not yet audited. Users should assess protocol maturity risk accordingly.

---

## 15. On-Chain Proof of Execution

The protocol maintains a multi-layer, publicly verifiable execution record at `/proof-of-execution`. As of March 30, 2026:

| Rail | Count | Description |
|------|-------|-------------|
| Operations Log | 12 entries | Founder operations log across all categories |
| Real Asset Pipeline | 20 deals | Acquisition analysis and underwriting records |
| Field Inspections | 3 sessions | Physical property walkthroughs |
| Syndication Offerings | 10 structures | Capital formation records |
| Treasury Snapshots | 10 snapshots | Solvency record with CR, RR, policy mode |
| Hash Chain | 1 entry | Audit integrity chain |
| Verified Outcomes | 0 entries | Reviewed and confirmed results (expanding) |

### 15.1 Live On-Chain Activity (Selected)

The On-Chain Activity rail feeds directly from Arbitrum One via Alchemy. Monitored addresses include the Canonical PSM, both Euler vaults, and both EulerSwap pools. Selected confirmed transactions:

| Date | Type | Asset | Amount | Transaction |
|------|------|-------|--------|-------------|
| 2026-03-30 | PSM Mint | USDC | 20 | `0x84d471a5…` |
| 2026-03-30 | Vault Deposit (AXM) | AXM | 20 | `0xeef11373…` |
| 2026-03-28 | Vault Deposit (AXM) | AXM | 10,000 | `0x79ca2515…` (seed) |
| 2026-03-26 | Vault Deposit (AXUSD) | AXUSD | 10,000 | `0x82b7f98d…` (seed) |

All transactions are independently verifiable on Arbiscan at `https://arbiscan.io`.

---

## 16. Known Issues and Remediation Status

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| KI-001 | Deployer EOA holds mint authority on ERC-3643 AXUSD — single point of failure | High | In Progress — Migration to Governance Safe planned |
| KI-002 | No time-lock delay on ERC-3643 agent functions (freeze, forcedTransfer) | Medium | In Progress — Agent delegation planned |
| KI-003 | Canonical PSM MINTER_ROLE and AGENT_ROLE granted via EOA — same risk as KI-001 | Medium | Resolved — Both roles active; PSM minting confirmed live |
| KI-004 | eAXUSD-4 vault in WITHDRAW_ONLY mode due to hook config issue | Medium | Resolved by deprecation — eAXUSD-6 is canonical |
| KI-005 | Ownership transfer on AXUSD token is single-step `transferOwnership` | Low | Informational — Deployer must transfer to Safe promptly |
| KI-006 | ERC-3643 Country Allow Module currently only permits US (country code 840) | Informational | Intentional — International expansion via governance |

---

## 17. Regulatory Positioning

### 17.1 AXUSD and the GENIUS Act Framework

AXUSD is designed to align with the Securing the U.S. Innovation Necessary for Every Stablecoin (GENIUS) Act framework for payment stablecoins. The protocol does not make a definitive legal conclusion that AXUSD is or will be compliant with the GENIUS Act, as that determination rests with outside counsel and the relevant regulatory bodies.

Key design choices aligned with the GENIUS Act framework:
- 1:1 USD backing via USDC reserves — no algorithmic stabilization
- Reserve assets held in segregated pools, not commingled with operating funds
- Identity-gated transfers — no anonymous circulation
- Reserve methodology published and verifiable
- PSM fee structure transparent and fixed

### 17.2 AXM Token

AXM is the governance token of the Axiom Protocol. It is not characterized as a security within this document. AXM grants holders the ability to participate in protocol governance decisions, including treasury allocation, fee parameters, and protocol upgrades. No legal opinion on AXM token classification is provided here — that determination requires outside counsel and is dependent on jurisdiction.

### 17.3 Syndication Offerings

All syndication offerings are structured under SEC Regulation D, Rule 506(c). Participation is restricted to accredited investors as verified through the ERC-3643 Topic 2 (ACCREDITED_INVESTOR) claim process. The protocol does not make general solicitations in violation of Reg D requirements.

### 17.4 Community Entry Credit

Community Entry Credit is a protocol-native credit facility extended based on GEF tier participation history. It is not a federally insured deposit, a bank loan, or a securities product. Credit terms are defined in the Community Credit Agreement and are subject to GEF enforcement.

---

## 18. Forward Roadmap

### Phase 1 (Q2 2026) — Governance Migration
- Transfer AXUSD token ownership to Governance Safe
- Transfer Identity Registry ownership to Governance Safe
- Revoke Deployer EOA agent status on AXUSD (replacing with PSM as sole MINTER_ROLE holder)
- Engage smart contract auditor using `docs/audit-readiness-checklist.md` package

### Phase 2 (Q3 2026) — Audit and Attestation
- Complete smart contract audit (AXUSD token, PSM, identity contracts)
- Third-party reserve attestation from accounting firm
- Bug bounty program launch
- Formal legal opinion on AXM and AXUSD characterization

### Phase 3 (Q3–Q4 2026) — Protocol Expansion
- Universe Blockchain (L3) migration planning
- International expansion via Country Allow Module governance vote
- Third-party KYC provider integration (Synaps or Persona)
- Fiat on-ramp via banking bridge (Unit + BitGo)
- AXM on-chain governance voting

### Phase 4 (Q4 2026 and Beyond) — Full Institutional Stack
- Permissioned secondary market for Syndication LP interests
- Cross-chain AXUSD bridging (Arbitrum → Universe Blockchain)
- T-bill reserve tokenization (supplementary backstop)
- DePIN network expansion (DeNet storage nodes)
- Institutional API access for diligence portals

---

## 19. Contract Address Registry

### Core Protocol Contracts

| Contract | Address | Status |
|----------|---------|--------|
| AXM Governance Token | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | Live |
| Unified AXUSD (ERC-3643) | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | Live |
| AXUSD Implementation (Proxy) | `0xaf5e5db11fa94e510f4fd4c519abd3269462f394` | Live |
| Canonical PSM | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` | Live |
| Backstop Vault | `0x54438249457694eB5431811f3f19444Af0a01B29` | Live |
| Governance Safe (3-of-5) | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Live |
| Deployer EOA | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | Bootstrap authority |

### ERC-3643 Identity Infrastructure

| Contract | Address | Status |
|----------|---------|--------|
| Identity Registry | `0x58f64a1262d5434d6C7637a2309b0999bB6D1970` | Live |
| Identity Registry Storage | `0x5A906507f886db1f41b12c75324C96dE27aB2E81` | Live |
| Modular Compliance | `0xD94a0dAc0c5Ce2D5f0E9FDe4fD5c30Ea82F06A84` | Live |
| Claim Topics Registry | `0xf4eA4f42fC03a5bE104fcB91e109665ae7b0EB18` | Live |
| Trusted Issuers Registry | `0x3367c571f5ae60b4E2c5ABca22cA311b413F89D1` | Live |
| Claim Issuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` | Live |
| Identity Factory | `0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9` | Live |

### Euler V2 Infrastructure

| Contract | Address | Status |
|----------|---------|--------|
| eAXUSD-6 Lending Vault | `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` | Live |
| Euler Earn Vault | `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` | Live |
| eAXM-1 Vault (supply-only) | `0x8e28ffa89d168599156004db4f4d12c2af7c250e` | Live |
| EulerSwap USDC/AXUSD Pool | `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` | Live |
| EulerSwap AXM/AXUSD Pool | `0x981763699D269E129a08E216b1AeC7caa376A8a8` | Live |
| eAXUSD-4 (deprecated) | `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059` | WITHDRAW_ONLY |

### Legacy Contracts (Deprecated)

| Contract | Address | Status |
|----------|---------|--------|
| Legacy GENIUS PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | Configured-Inactive |
| GENIUS AXUSD Token | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Deprecated |
| Euler AXUSD Token | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Deprecated |

### External Integrations

| System | Address / Identifier |
|--------|---------------------|
| USDC (Arbitrum One) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Alchemy RPC | Arbitrum One — `arb-mainnet.g.alchemy.com/v2/` |
| Arbiscan (Block Explorer) | `https://arbiscan.io` |

---

## 20. Glossary

| Term | Definition |
|------|------------|
| **Automated Control Layers** | Smart contracts — programmable code deployed on a blockchain that executes automatically under defined conditions |
| **Multi-Party Authorization** | Multi-signature — requiring multiple independent private key signatures to authorize a transaction |
| **On-Chain Financial Rails** | DeFi infrastructure — decentralized financial protocols operating on a public blockchain |
| **Asset Onboarding / Issuance** | Tokenization — representing a real-world asset or financial instrument as a blockchain token |
| **Participation Lockup** | Staking — committing tokens to a protocol in exchange for governance rights or protocol rewards |
| **Canonical PSM** | The single authorized USDC→AXUSD mint/redeem facility for Unified AXUSD. Replaces all legacy PSM configurations |
| **ERC-3643** | The T-REX standard for identity-gated security tokens, enforcing compliance at the smart contract transfer level |
| **ONCHAINID** | An on-chain identity contract deployed per investor via the Identity Factory, storing verified claim signatures |
| **Coverage Ratio (CR)** | Treasury Total Assets / Total Protocol Liabilities — measures overall protocol solvency |
| **Reserve Ratio (RR)** | Total USDC Reserves / Canonical AXUSD Supply — measures direct USD backing |
| **Liquidity Buffer Ratio (LBR)** | Immediately Liquid Reserves / Total Protocol Liabilities — measures near-term redemption capacity |
| **Lane A** | Institutional/accredited participant lane — Topics 1, 2, 3 required; higher transfer limits; full product access |
| **Lane B** | Verified standard participant lane — Topics 1 and 3 required; 25,000 AXUSD/day cap; core product access |
| **GEF** | Graduated Execution Framework — participation-history-based tier system governing protocol credit and product access |
| **The Wealth Practice** | The protocol's community rotating savings coordination system. Formerly "Savings Circle" / "ROSCA" |
| **EVK** | Ethereum Vault Kit — Euler V2's modular vault standard compatible with ERC-4626 |
| **EulerSwap** | Euler's automated market-making layer, integrated with EVK vaults for supply-side liquidity |
| **Proof of Execution** | The protocol's multi-rail auditable operations record at `/proof-of-execution` |
| **GENIUS Act** | Securing the U.S. Innovation Necessary for Every Stablecoin Act — US federal payment stablecoin legislation |
| **Reg D 506(c)** | SEC exemption permitting general solicitation of accredited investors only; used for Axiom syndication offerings |

---

*Document produced by Axiom Protocol — Axiom Nexus LLC. Last updated: March 30, 2026.*  
*All on-chain references are verifiable on Arbitrum One (chainId: 42161) via Arbiscan.*  
*This document does not constitute an offer to sell or solicitation of an offer to purchase any security.*  
*Forward-looking statements reflect current intentions and are subject to change without notice.*
