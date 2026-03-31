# Axiom Protocol — Institutional Executive Summary & Technical Whitepaper

**Version:** 2.0
**Date:** March 31, 2026
**Classification:** Institutional Disclosure — Not Investment Advice
**Issuer:** Axiom Nexus LLC
**Network:** Arbitrum One (chainId: 42161)
**Document Status:** Canonical Reference
**Supersedes:** v1.1 (March 30, 2026), v3.0 (March 23, 2026)

---

> This document is provided for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any security or financial instrument. All on-chain references are verifiable on Arbitrum One. All rates are variable. No returns are guaranteed. Performance and reserve data cited herein reflect the state of the protocol as of the date above and are subject to change. This document is not legal or investment advice.

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
11. [Axiom Nexus Banking and Participant Payment Infrastructure](#11-axiom-nexus-banking-and-participant-payment-infrastructure)
12. [Tiered Access and Verified Participant Architecture](#12-tiered-access-and-verified-participant-architecture)
13. [Development Milestones — Tasks #42–#47](#13-development-milestones--tasks-4247)
14. [Institutional Adoption Audit](#14-institutional-adoption-audit)
15. [Retail and Community Adoption Framework](#15-retail-and-community-adoption-framework)
16. [On-Chain Proof of Execution](#16-on-chain-proof-of-execution)
17. [Known Issues and Remediation Status](#17-known-issues-and-remediation-status)
18. [Regulatory Positioning](#18-regulatory-positioning)
19. [Forward Roadmap](#19-forward-roadmap)
20. [Contract Address Registry](#20-contract-address-registry)
21. [Glossary](#21-glossary)

---

## 1. Executive Summary

Axiom Protocol is a governance-first wealth infrastructure operating on Arbitrum One. Its core mandate is to build a sovereign digital-physical economy in which community capital accumulation, real asset acquisition, and on-chain financial infrastructure operate under a unified compliance and governance layer — accessible to verified participants from both institutional and community entry points.

As of March 31, 2026, the protocol has completed a multi-phase engineering cycle (Tasks #42–#47) that has advanced the platform from a prototype-stage stablecoin issuer into a full-stack, institutional-grade capital operating system. The most recent advancement — Task #47, the Axiom Nexus Banking Product Integration Layer — wires every protocol product into a single FDIC-insured banking rail, providing participants with a deterministic, auditable path from fiat currency to on-chain participation.

### State of the Protocol — March 31, 2026

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
| Banking Rail | Increase.com — FDIC-insured at First Internet Bank |
| Participant Banking Tables | 4 (participants, insurance holds, LP deposits, distributions) |
| Real Asset Deals (Pipeline) | 20 deals under analysis |
| Field Inspections | 3 completed |
| Syndication Offerings | 10 structured |
| Operations Logged | 12 founder ops entries |

### Core Differentiators

**1. Identity-Gated Financial Rails**
Every AXUSD transaction is enforced through the ERC-3643 identity standard. No transfer, mint, or redeem is possible without on-chain verification. This is not a post-hoc compliance layer — it is enforced at the automated control layer level on every transfer.

**2. Dual-Lane Participant Architecture**
Lane A (institutional/accredited) and Lane B (verified standard) enable differentiated access to protocol products without exposing institutional infrastructure to unverified participants or requiring all participants to meet accredited investor thresholds.

**3. Physical-Digital Bridge**
The protocol's land acquisition pipeline, field inspection system, and syndication module connect on-chain capital formation to real-world asset acquisition — providing a traceable bridge between digital participation and physical asset ownership.

**4. Integrated Fiat Capital Gateway**
The Axiom Nexus Account (First Internet Bank, via Increase.com) provides a single FDIC-insured banking entry point for all capital-bearing activities. Participants receive unique ACH reference codes enabling precise attribution of incoming fiat payments to on-chain participant records — without requiring per-user banking accounts.

**5. Transparent by Design**
The Proof of Execution system, solvency console, and reserve methodology documentation create a multi-layer audit record that institutional counterparties can independently verify on-chain.

---

## 2. Protocol Architecture Overview

Axiom Protocol is organized into six functional layers, each operating with a defined interface to the others:

```
+-----------------------------------------------------------------------+
|  Layer 6: Fiat Capital Gateway                                        |
|  Axiom Nexus Account (FDIC) · ACH Reference Codes · Insurance Holds  |
|  LP Deposit Registry · Distributions                                  |
+-----------------------------------------------------------------------+
|  Layer 5: Physical World                                              |
|  Land Pipeline · Field Inspections · Syndication Closings             |
+-----------------------------------------------------------------------+
|  Layer 4: Capital Formation                                           |
|  Syndication Module · Lending Fund · Community Entry Credit           |
+-----------------------------------------------------------------------+
|  Layer 3: On-Chain Financial Rails                                    |
|  EulerSwap Pools · Euler Lending Vaults · PSM                         |
+-----------------------------------------------------------------------+
|  Layer 2: Compliance and Identity                                     |
|  ERC-3643 · Identity Registry · Claim Topics · Tiered Access          |
+-----------------------------------------------------------------------+
|  Layer 1: Governance and Token                                        |
|  AXM Governance Token · Governance Safe · Timelock Controller         |
+-----------------------------------------------------------------------+
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

AXUSD uses OpenZeppelin AccessControl — not the T-REX `addAgent`/`isAgent` pattern. Role grants are executed via `grantRole(role, address)`.

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
| MINTER_ROLE | Granted |
| AGENT_ROLE | Granted |

### 4.2 Mint Flow

```
User (Verified Wallet)
  |
  +-- Step 1: USDC.approve(PSM, amount)
  |
  +-- Step 2: PSM.mint(amount)
  |     +-- Identity check: isVerified(msg.sender) -> true required
  |     +-- Fee deducted: fee = amount x 0.001 (10 bps)
  |     +-- USDC transferred to PSM (amount)
  |     +-- feesAccrued += fee (USDC)
  |     +-- AXUSD.mint(msg.sender, amount - fee)
  |
  +-- Result: Wallet receives AXUSD; PSM holds USDC reserve
```

### 4.3 Redeem Flow

```
User (Verified Wallet)
  |
  +-- Step 1: AXUSD.approve(PSM, amount)
  |
  +-- Step 2: PSM.redeem(amount)
  |     +-- Identity check: isVerified(msg.sender) -> true required
  |     +-- Fee deducted: fee = amount x 0.001 (10 bps)
  |     +-- AXUSD.burn(msg.sender, amount)
  |     +-- feesAccrued += fee (USDC)
  |     +-- USDC.transfer(msg.sender, amount - fee)
  |
  +-- Result: Wallet receives USDC; AXUSD supply decreases
```

### 4.4 Fee Accounting

Fees accumulate in `feesAccrued` on the PSM contract. The Governance Safe may call `sweepFees(recipient)` to distribute accrued fees. The function follows CEI (checks-effects-interactions) — state is cleared before the USDC transfer executes, preventing reentrancy.

### 4.5 Ceiling Management

When PSM utilization exceeds 95%, a ceiling increase must be proposed through the Governance Safe with a 24-hour Timelock delay. The current ceiling of 1,000,000 AXUSD provides approximately 99x headroom above current supply, establishing a conservative bootstrap configuration.

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

Axiom Protocol operates two EulerSwap pools providing on-chain liquidity for AXUSD and AXM:

**USDC/AXUSD Pool**

| Property | Value |
|----------|-------|
| Pool Address | `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` |
| Token Pair | USDC / Unified AXUSD |
| Equilibrium Peg | 1:1 |
| Fee | 0.30% |
| Concentration | 0.5 |
| LPM Whitelist | Confirmed (index [10], correct LPM=`0xC0177120...Bb6F`) |
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
A wallet is considered verified (and may transfer AXUSD) when it holds valid, unrevoked claims for both Topic 1 (KYC_VERIFIED) and Topic 3 (SANCTIONS_CLEAR). Topic 2 is required additionally for Lane A (institutional/accredited) products.

### 6.4 Claim Lifecycle

```
Submission (off-chain)
  |  User submits KYC form at /axusd -> database: t3_kyc_submissions
  |
Compliance Review (Founder Ops dashboard)
  |  Operator reviews queue, approves or rejects
  |
Atomic On-Chain Approval
  |  ERC3643Service.atomicKycApproval():
  |  1. deployIdentity(wallet) -> ONCHAINID contract
  |  2. registerIdentity(wallet, identity, country)
  |  3. issueClaim(topic=1) -- KYC
  |  4. issueClaim(topic=3) -- Sanctions
  |  All four calls in a single coordinated sequence
  |
Active State
  |  wallet.isVerified() = true -> can send/receive AXUSD
  |
Expiry or Revocation
     Claim.validTo exceeded -> isVerified() = false -> transfers blocked
     Compliance revokes: ClaimIssuer.revokeClaimBySignature()
```

### 6.5 Compliance Operations Infrastructure (Task #44)

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
The Founder Operations dashboard (`/founder-ops`) includes a dedicated Compliance tab with KYC approval queue, accreditation review queue, claim revocation interface, and full compliance operations log.

---

## 7. Governance and Risk Controls

### 7.1 Governance Structure

| Authority Layer | Mechanism | Contracts Governed |
|-----------------|-----------|-------------------|
| Governance Safe (3-of-5) | Gnosis Safe multi-party authorization at `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | PSM owner; emergency pause; fee sweep; ceiling changes |
| Timelock Controller (24h) | Enforces upgrade delay | All upgradeable contracts (proxy admin) |
| Deployer EOA | Bootstrap phase only | AXUSD token admin; Identity Registry admin (pending migration) |
| AXM Admin Safe | Multi-party authorization | AXM MINTER_ROLE |

### 7.2 Role Model

| Role | Holder | Functions Gated | Timelock Required |
|------|--------|-----------------|-------------------|
| EMERGENCY_ROLE | Governance Safe (3-of-5) | `pause()` on all pausable contracts | No — immediate |
| OPERATOR_ROLE | Deployer EOA (pending Safe migration) | `freeze()`, `unfreeze()` on AXUSD | No |
| MINTER_ROLE | Deployer EOA + PSM + Governance Safe | `mint()`, `burn()` on AXUSD | No (Safe proposal for >= 10K AXUSD) |
| COMPLIANCE_ROLE | Deployer EOA (pending Safe migration) | Claim issuance, whitelist | No |
| UPGRADER_ROLE | Timelock | Proxy admin upgrades | Yes — 24h delay |

### 7.3 Emergency Powers

The following functions may bypass the 24-hour Timelock under defined emergency conditions. All emergency actions require 3-of-5 Safe signatures and mandatory post-action disclosure within 24 hours.

| Function | Trigger Conditions | Authorization | Two-Person Rule |
|----------|--------------------|--------------|-----------------|
| `pause()` | Active exploit; regulatory order; critical vulnerability | 3-of-5 Safe | Yes |
| `emergencySweep()` | Imminent contract compromise; regulatory seizure | 3-of-5 Safe | Yes |
| `freeze(address)` | OFAC designation; court order; active exploit from address | Deployer EOA (pending Safe migration) | Yes (policy) |
| `forcedTransfer()` | Court order; regulatory asset recovery directive | Governance Safe | Yes |

Full emergency powers policy documented in `docs/emergency-powers-policy.md`.

### 7.4 Admin Action Log

Every mint, burn, freeze, forced transfer, pause, and registry update is written to the `admin_action_log` database table and visible in the Founder Operations dashboard with txHash, action type, target address, amount, and timestamp. This provides a tamper-evident off-chain audit trail supplementing on-chain event logs.

### 7.5 Migration Roadmap

| Contract | Function Class | Current State | Target State |
|----------|---------------|---------------|--------------|
| Canonical PSM | Owner | Governance Safe | Complete |
| Unified AXUSD Token | Owner | Deployer EOA | Transfer to Governance Safe |
| Unified AXUSD Token | Agent (mint/burn) | Deployer EOA + PSM | PSM as sole agent; EOA revoked |
| Identity Registry | Owner | Deployer EOA | Transfer to Governance Safe |
| Identity Registry | Agent | Deployer EOA | Delegated to compliance tooling |
| Modular Compliance | Owner | Deployer EOA | Transfer to Governance Safe |
| AXM Token | MINTER_ROLE | AXM Admin Safe | Complete |

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
RR = Total USDC Reserves / Canonical AXUSD Total Supply x 100

Where:
Total USDC Reserves = Canonical PSM USDC Balance
                    + Legacy GENIUS PSM USDC Balance
                    + Backstop Vault USDC Balance
```
Target: RR >= 100% at all times. The protocol targets RR >= 105% under normal operations.

**Coverage Ratio (CR)**
```
CR = Treasury Total Assets / Total Protocol Liabilities
```
Where Treasury Total Assets = on-chain treasury USD value; Total Protocol Liabilities = AXUSD outstanding + any off-chain obligations. A CR >= 1.0 indicates full coverage.

**Liquidity Buffer Ratio (LBR)**
```
LBR = Immediately Liquid Reserves / Total Protocol Liabilities
```
Where Immediately Liquid Reserves = Canonical PSM USDC only (excluding backstop vault with 24h timelock and legacy PSM with potential migration lock).

### 8.3 Policy Thresholds

| Mode | CR Range | LBR Condition | Protocol Response |
|------|----------|---------------|-------------------|
| NORMAL | >= 1.05 | LBR >= 0.50 | No restriction |
| CAUTION | 1.00–1.05 | LBR >= 0.30 | Alert issued; remediation plan required within 48h |
| RESTRICTED | 0.90–1.00 | LBR < 0.30 | PSM debt ceiling frozen; new product launches paused |
| EMERGENCY | < 0.90 | Any | Emergency pause eligible; governance vote required |
| BOOTSTRAP | N/A | Protocol in early deployment | Current mode — no restrictions |

### 8.4 Stress Testing

Three canonical stress scenarios are modeled in `/api/axusd/treasury-health`:

| Scenario | Redemption Wave | Coverage Test |
|----------|----------------|---------------|
| S1 | 10% of AXUSD supply redeemed simultaneously | Reserves >= S1 redemption amount |
| S2 | 25% of AXUSD supply redeemed simultaneously | Reserves >= S2 redemption amount |
| S3 | 50% of AXUSD supply redeemed simultaneously | Reserves >= S3 redemption amount |

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

The protocol maintains a live pipeline of real estate acquisition targets analyzed through its Deal Intelligence system. As of March 31, 2026:

| Metric | Count |
|--------|-------|
| Total Deals | 20 |
| Strategy — Buy & Hold | 12 |
| Strategy — Fix & Flip | 5 |
| Strategy — BRRRR | 2 |
| Strategy — Note/Seller Finance | 1 |
| Status — Under Underwriting | 18 |
| Status — Draft | 2 |

### 9.2 Field Inspection System

The Field Capture system enables mobile-first, structured property walkthroughs with unit-level condition assessment, sampling confidence scoring, geo-tagged inspection records, and reviewer sign-off workflow. Three field inspection sessions have been completed as of March 31, 2026.

### 9.3 Property Analysis Intelligence Suite

The protocol's property analysis tools include:

| System | Description |
|--------|-------------|
| IVCEE | Institutional Viability and Capital Efficiency Engine — allocator-grade underwriting intelligence |
| Cost Intelligence Engine | Production-grade rehab underwriting grounded in Craftsman National Construction Estimator (NCE) data (57 reference costs) |
| Multi-Exit Strategy Engine | Eight underwriting strategies with comparison and ranking |
| AI Acquisition Memo Builder | Gemini-powered institutional acquisition memo generation |
| MIRDT Capital Intelligence Terminal | Nine-dimension advisory signal engine producing a Protocol Readiness Score (PRS, 0-10) |
| Axiom Sentinel | Unified capital decision and risk authorization layer |
| Deal Flow Feed | Distressed property aggregation from government sources plus wholesaler submission portal |
| Document Intelligence | AI-powered document ingestion and extraction in the Deal Intelligence workspace |

---

## 10. Capital Formation and Syndication

### 10.1 Syndication Module

Ten structured syndication offerings are recorded in the protocol's capital formation system. The syndication module operates under SEC Reg D 506(c), restricting participation to accredited investors (Topic 2 claim required). The module includes:

- Offering lifecycle management (draft, open, closed, settled)
- LP Investor Portal with capital account views
- K-1 generation infrastructure
- Waterfall calculator (IRR, equity multiple, preferred return)
- Document upload and signature workflows
- Axiom Secondary Network V1 — permissioned secondary transfer and settlement layer for Axiom-issued private market products

### 10.2 Lending Fund

The protocol operates a Lending Fund under SEC Reg D 506(c), providing real estate bridge capital to Steward-tier and above participants in the Graduated Execution Framework. The On-Chain Lending Credit Market includes production automated control layers (`AXIOMFixedLoan` and `AXIOMCreditMarket`) deployed on Arbitrum One.

Accredited investors (Lane A) may commit capital to the Lending Fund via the ACH Deposit Path described in Section 11 — Axiom Nexus Banking. Participants complete LP registration to receive a unique ACH reference code, initiate a domestic wire or ACH transfer to the Axiom Nexus Account, and the operations team reviews the incoming payment and applies the deposit to the LP record upon confirmation.

### 10.3 Community Entry Credit

Community Entry Credit is a protocol-native credit facility extended to Graduated Execution Framework participants based on their participation history. It is not a federally insured deposit, bank loan, or securities product. Credit terms are defined in the Community Credit Agreement.

| Tier | Credit Limit |
|------|-------------|
| Observer | $0 |
| Participant | $1,500 |
| Operator | $5,000 |
| Steward | $10,000 |
| Architect | $25,000 |

---

## 11. Axiom Nexus Banking and Participant Payment Infrastructure

### 11.1 Overview

Task #47 (completed March 31, 2026) delivered the Axiom Nexus Banking Product Integration Layer — a complete participant payment infrastructure that enables Wealth Practice members and Lending Fund investors to move fiat capital into the protocol through a single FDIC-insured banking rail. This represents the protocol's first fully operational fiat-to-participation pathway.

### 11.2 Axiom Nexus Account

The Axiom Nexus Account is a single-entity institutional checking account held at First Internet Bank, accessed via the Increase.com banking API. It is not a per-participant account — all participant capital flows through one entity-level account, with attribution managed by unique ACH reference codes.

| Property | Value |
|----------|-------|
| Account Name | Axiom Nexus Account |
| Banking Partner | First Internet Bank |
| API Provider | Increase.com |
| Insurance | FDIC-insured |
| ABA Routing Number | 071006486 |
| Yield | Variable rate (currently approximately 2.64% APY) |
| Supported Rails | ACH, Domestic Wire |
| Account Model | Single-entity B2B treasury |

Note: Yield rates are variable and subject to change. No return is guaranteed.

### 11.3 Participant Reference Code System

Every participant — whether a Wealth Practice member or a Lending Fund LP — registers once and receives a unique ACH reference code in the format `AXM-XXXXXXXX` (eight hexadecimal characters derived from their wallet address). This code must be included in the memo or reference field of any ACH or wire transfer to the Axiom Nexus Account.

The reference code enables the operations team to attribute incoming payments to the correct participant record without requiring per-user banking accounts, KYC re-verification at the banking layer, or manual wallet matching.

**Registration Flow:**
```
Participant
  |
  +-- Step 1: Connect wallet (SIWE session required)
  |
  +-- Step 2: POST /api/banking/participant/register
  |     +-- SIWE auth verified (wallet ownership confirmed)
  |     +-- New record created in increase_participants table
  |     +-- Reference code generated: AXM-{first 8 hex chars of walletAddress}
  |     +-- Product type recorded (wealth_practice or lending_fund)
  |
  +-- Step 3: Participant receives reference code
        +-- Includes routing number, account number, and reference memo
        +-- Instructions: initiate ACH or wire with reference code in memo field
```

### 11.4 Insurance Hold System (Wealth Practice)

Wealth Practice groups require each member to maintain a performance insurance hold before receiving their first payout. The hold is calculated at 100% of one cycle contribution amount and is held for the duration of the member's participation in the group.

**Hold Lifecycle:**

| Status | Description | Next Action |
|--------|-------------|-------------|
| PENDING | Hold created; member has received deposit instructions | Member initiates ACH/wire with reference code |
| FUNDED | Operations team has confirmed incoming payment and applied to hold record | Member is cleared for payout cycle |
| RELEASED | Group has concluded; hold funds returned to member | Protocol confirms return transfer |
| FORFEITED | Member exited early or defaulted; hold retained by protocol | Documented in compliance ops log |

**API Endpoints (Insurance Hold):**

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/banking/insurance/create-hold` | POST | SIWE (wallet-owned) | Create insurance hold record |
| `/api/banking/insurance/[holdId]/fund` | PATCH | Admin key | Mark hold as funded after payment confirmed |
| `/api/banking/insurance/wallet/[walletAddress]` | GET | SIWE (wallet-owned) | Retrieve all holds for a participant wallet |

### 11.5 LP Deposit System (Lending Fund)

Accredited investor LPs commit capital to the Lending Fund through the ACH Deposit Path. After registration, the participant initiates an ACH or wire transfer to the Axiom Nexus Account referencing their AXM code. The operations team reviews the incoming transaction in the Increase dashboard, matches it to the participant record, and applies the deposit, which then triggers LP record activation.

**Deposit Lifecycle:**

| Status | Description |
|--------|-------------|
| PENDING | LP registered; deposit instructions issued; awaiting incoming funds |
| RECEIVED | Operations has confirmed funds arrived in Axiom Nexus Account |
| APPLIED | LP record updated; capital position recorded; participant confirmed |
| REJECTED | Payment could not be matched or was returned |

**Database Tables (Task #47):**

| Table | Purpose |
|-------|---------|
| `increase_participants` | Master registry of all registered participants with wallet address, reference code, product type, and contact information |
| `increase_insurance_holds` | Insurance hold records for Wealth Practice members — status, amount, funded date, group reference |
| `increase_lp_deposits` | LP deposit records for Lending Fund investors — status, amount, applied date, fund reference |
| `increase_distributions` | Distribution records for LP capital returns — amount, transaction reference, distribution date |

### 11.6 Authentication Architecture

All participant-scoped banking API endpoints require an active SIWE (Sign-In With Ethereum) session. Requests are validated by matching the session wallet address against the requested resource — a participant cannot access another participant's records.

| Auth Layer | Implementation | Applied To |
|------------|----------------|------------|
| SIWE Session | Cookie-based wallet session validated against `wallet_sessions` table | All participant registration and read endpoints |
| Wallet Ownership Match | Session wallet must match requested walletAddress parameter | All wallet-scoped GET endpoints |
| Admin Key Header | `x-admin-key` validated against `ADMIN_SOLVENCY_KEY` environment variable | All hold/deposit admin write operations |
| Development Bypass | `NODE_ENV=development` returns `'__dev__'` as a universal pass-through | Local development only |

### 11.7 Banking Dashboard — Participants Tab

The Banking dashboard at `/banking` has been extended with an administrative Participants tab providing the operations team full visibility and write access to participant records:

- Complete participant registry with search and filtering
- Insurance hold list with status and fund confirmation controls
- LP deposit list with received/applied status management
- Distribution records

### 11.8 Crypto Custody Layer

The Axiom Protocol also integrates BitGo CaaS (Custody as a Service) for institutional crypto custody, operating in parallel with the Increase fiat layer. The protocol's Bridge Service connects the Increase fiat rail to the BitGo crypto custody layer for fiat-to-digital settlement.

---

## 12. Tiered Access and Verified Participant Architecture

### 12.1 Dual-Lane Model

The protocol operates two compliance lanes that determine product access without requiring all participants to meet institutional accreditation thresholds:

**Lane A — Institutional / Accredited**

| Parameter | Value |
|-----------|-------|
| Requirements | Topics 1, 2, 3 (KYC + Accredited + Sanctions Clear) |
| Access | Lending Fund borrowing; syndication settlement; unlimited AXUSD transfer; Lending Fund LP deposits |
| Transfer Limit | Higher cap (configurable via TransferLimitModule) |
| Onboarding | Full KYC + Accredited Investor self-certification |

**Lane B — Verified Standard**

| Parameter | Value |
|-----------|-------|
| Requirements | Topics 1, 3 (KYC + Sanctions Clear) |
| Access | AXUSD wallet, PSM mint/redeem, EulerSwap, Community Entry Credit |
| Transfer Limit | 25,000 AXUSD/day cap |
| Onboarding | Standard KYC submission; estimated 48h review time |

### 12.2 Graduated Execution Framework (GEF)

The GEF is a participation-history-based access system that governs protocol credit and product access for community participants. GEF tier is determined by contribution record — not capital size.

| Tier | Credit Limit | Requirement |
|------|-------------|-------------|
| Observer | $0 | Wallet connected |
| Participant | $1,500 | Completed first full Wealth Practice cycle |
| Operator | $5,000 | Multi-cycle contributor; consistent record |
| Steward | $10,000 | Group facilitator or multi-group participant |
| Architect | $25,000 | Protocol-level participation; governance record |

### 12.3 The Wealth Practice

The Wealth Practice is the protocol's community economic coordination layer. It operates on a rotating community savings model in which members contribute fixed amounts on a defined schedule and each member receives the full pool on a rotating basis. Groups are managed with a three-stage trust pipeline, governance participation, and GEF contribution tracking.

The Wealth Practice is the primary community entry point into the Axiom fiat capital pathway. Members who join a group register through the banking participant system to receive an ACH reference code, fund their performance insurance hold, and then contribute each cycle using the same reference code. This creates a complete participation record — fiat deposits attributable to on-chain wallet addresses — without requiring members to hold or manage cryptocurrency.

**My Practice Tab (Banking Integration):**
- Step 1: Register to receive AXM reference code and deposit instructions
- Step 2: Fund insurance hold via ACH/wire to Axiom Nexus Account
- Step 3: Contribute each cycle using the same reference code
- Real-time hold status display with contextual guidance for each status state

---

## 13. Development Milestones — Tasks #42–#47

The following six engineering tasks represent the most significant protocol maturation phase to date, transforming Axiom Protocol from a prototype-stage issuer into a full-stack institutional capital operating system with a live fiat gateway.

### Task #42 — AXUSD Governance Hardening

**Objective:** Migrate protocol administrative authority away from a single deployer EOA toward a structured multi-party authorization and role-separated governance model.

**Deliverables Completed:**
- `src/config/adminRoles.ts` — OPERATOR_ROLE, MINTER_ROLE, COMPLIANCE_ROLE, EMERGENCY_ROLE, UPGRADER_ROLE defined with documentation
- Admin API route enforcement — all admin routes validate caller role rather than a shared key
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
- Root cause resolved: AXUSD uses OZ AccessControl (`grantRole`/`hasRole`), not T-REX `addAgent`/`isAgent`. Both MINTER_ROLE and AGENT_ROLE successfully granted to PSM
- `/api/axusd/psm` upgraded to report canonical PSM stats and legacy PSM as a deprecated separate object
- Mint/Redeem UI panel added to `axusd-3643.tsx` with identity gate, PSM metrics, and fee display
- `docs/reserve-methodology.md` — canonical reserve definition document

**End-to-End Verification:**
The first live mint was executed successfully post-activation: 20 USDC deposited, 19.98 AXUSD minted (0.02 USDC fee at 10 bps). AXM vault deposit of 20 AXM into eAXM-1 also confirmed. Total supply grew to 10,019.98 AXUSD.

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

### Task #45 — AXUSD Tiered Access Architecture and Verified User Experience

**Objective:** Implement the dual-lane compliance architecture (Lane A institutional, Lane B standard) and build a consumer-facing AXUSD wallet experience that abstracts ERC-3643 complexity from standard users while preserving full compliance enforcement.

**Deliverables Completed:**
- Lane A / Lane B claim topic requirements and transfer limits defined in `src/config/tierConfig.ts`
- `checkParticipantLane(wallet)` utility — returns `{ lane: 'A' | 'B' | 'unverified', topics: number[] }` from on-chain identity
- Consumer-facing AXUSD wallet page — balance, transfer history, compliance status badge, transfer form, Get Verified call to action
- KYC Onboarding Modal — 3-step flow: wallet connect, personal info, pending confirmation screen
- Compliance status badge — Not Verified / Pending / Verified Standard / Accredited — visible in navigation for connected wallets
- Institutional route protection — syndication and vault routes check lane before proceeding
- Disclosure page Participation Tiers section — plain language explanation of Lane A and Lane B

---

### Task #46 — AXUSD Audit and Assurance Readiness Package

**Objective:** Produce all in-repository deliverables required for external automated control layer audit engagement and institutional due diligence review.

**Deliverables Completed:**

| Document | Path | Description |
|----------|------|-------------|
| Reserve Methodology | `docs/reserve-methodology.md` | Reserve pool definitions, RR formula, PSM utilization, stress scenarios |
| Admin Controls Disclosure | `docs/admin-controls-disclosure.md` | Every privileged function, authority holder, EOA vs Safe status |
| Solvency Methodology | `docs/solvency-methodology.md` | CR, RR, LBR formulas, threshold definitions, data sources |
| Claim Topic Registry | `docs/claim-topic-registry.md` | All ERC-3643 topic IDs, validity periods, off-chain processes |
| Legal Entity Disclosure | `docs/legal-entity-disclosure.md` | Axiom Nexus LLC, registered address, operator relationship |
| Whitepaper Corrections | `docs/whitepaper-v1.1-corrections.md` | All corrections vs prior published claims (6 corrections documented) |
| Audit Readiness Checklist | `docs/audit-readiness-checklist.md` | Automated control layer audit requirements with current status per item |
| Emergency Powers Policy | `docs/emergency-powers-policy.md` | Timelock bypass functions, conditions, two-person rule |
| Diligence Pack API | `/api/solvency/diligence-pack` | Structured JSON combining solvency, contracts, claims, reserve methodology |
| Disclosure Page Links | `/disclosure` | Each document linked with last-updated timestamp |

---

### Task #47 — Axiom Nexus Banking Product Integration Layer

**Objective:** Connect every capital-bearing protocol product to the Axiom Nexus Account banking rail. Participants register once, receive a unique ACH reference code, and use that code to send fiat to the Axiom Nexus Account. Insurance holds (Wealth Practice) and LP deposits (Lending Fund) are tracked in the protocol database with full admin visibility.

**Deliverables Completed:**

**Schema (shared/increaseParticipantSchema.ts):**
- `increase_participants` — master participant registry (wallet, reference code, product type, name, email)
- `increase_insurance_holds` — Wealth Practice insurance hold records (status, amount, group reference, funded date)
- `increase_lp_deposits` — Lending Fund LP deposit records (status, amount, fund reference, applied date)
- `increase_distributions` — LP distribution records (amount, transaction reference, distribution date)

**API Endpoints:**

| Endpoint | Method | Auth | Function |
|----------|--------|------|----------|
| `/api/banking/participant/register` | POST | SIWE | Register participant and issue reference code |
| `/api/banking/participant/[walletAddress]` | GET | SIWE | Retrieve participant record for wallet |
| `/api/banking/participants` | GET | Admin key | List all participants with holds and deposits |
| `/api/banking/insurance/create-hold` | POST | SIWE | Create insurance hold for Wealth Practice member |
| `/api/banking/insurance/[holdId]/fund` | PATCH | Admin key | Mark hold funded after payment confirmation |
| `/api/banking/insurance/wallet/[walletAddress]` | GET | SIWE | Retrieve all holds for a wallet |
| `/api/banking/lp-deposits/apply` | POST | Admin key | Apply confirmed LP deposit to participant record |

**Frontend Deliverables:**
- Wealth Practice My Practice tab: reference code display, insurance hold creation, hold status cards with contextual guidance, 7-question FAQ
- Lending Fund invest page: ACH Deposit Path panel with 4-step visual process, reference code display, "After You Send" checklist, 6-question FAQ
- Banking dashboard Participants tab: admin workflow guide, complete participant registry, hold management controls, status reference table, 5-question admin FAQ

**Institutional Vocabulary Notes:**
The banking integration layer uses a B2B treasury model throughout — the Axiom Nexus Account is a single entity-level account, not a per-participant account. No per-user banking entities, virtual accounts, or debit cards are created. All attribution is managed through the reference code system.

---

## 14. Institutional Adoption Audit

This section provides an objective assessment of the protocol's readiness for institutional counterparty engagement. Each criterion is rated: Ready, In Progress, or Not Started.

### 14.1 Legal and Entity Structure

| Criterion | Status | Notes |
|-----------|--------|-------|
| Legal entity disclosed | Ready | Axiom Nexus LLC — documented in `docs/legal-entity-disclosure.md` |
| Registered address documented | Ready | Filed with state authority |
| Operator/issuer relationship documented | Ready | Axiom Nexus LLC is both issuer and operator |
| Regulatory framework identified | Ready | Designed to align with GENIUS Act stablecoin framework |
| Regulatory counsel engaged | Not Started | Templates provided; outside counsel execution pending |
| Legal opinion on token classification | Not Started | AXM: not characterized as a security. AXUSD: payment stablecoin. Formal opinion pending |

### 14.2 Reserve and Solvency

| Criterion | Status | Notes |
|-----------|--------|-------|
| Reserve methodology documented | Ready | `docs/reserve-methodology.md` |
| Reserve assets disclosed | Ready | Canonical PSM USDC, Legacy PSM USDC, Backstop Vault USDC |
| On-chain reserve queryable | Ready | PSM and Backstop Vault balances publicly readable |
| Coverage Ratio computed | Ready | Live in `/api/solvency/latest` |
| Solvency snapshots timestamped | Ready | 10 snapshots on record |
| Third-party reserve attestation | Not Started | Accounting firm engagement pending |
| Audit of reserve calculation logic | Not Started | Contingent on automated control layer audit |

### 14.3 Automated Control Layer Security

| Criterion | Status | Notes |
|-----------|--------|-------|
| Contracts deployed and verified | Ready | All canonical contracts on Arbiscan |
| Deployment scripts available | Ready | `/scripts/` directory |
| Known issues documented | Ready | 6 known issues in `docs/audit-readiness-checklist.md` |
| Admin controls documented | Ready | `docs/admin-controls-disclosure.md` |
| Emergency procedures documented | Ready | `docs/emergency-powers-policy.md` |
| Automated control layer audit | Not Started | Audit readiness package complete; engagement pending |
| Test suite | Not Started | Recommended prior to audit |
| Formal threat model | Not Started | Recommended prior to audit |
| Bug bounty program | Not Started | Planned for post-audit |

### 14.4 Governance

| Criterion | Status | Notes |
|-----------|--------|-------|
| Multi-party authorization governance documented | Ready | Governance Safe (3-of-5) at `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` |
| PSM owned by multi-party authorization | Ready | Governance Safe owns Canonical PSM |
| Timelock on upgrades | Ready | 24-hour Timelock Controller |
| AXUSD token migrated to multi-party authorization | In Progress | Deployer EOA holds admin; migration planned |
| Identity Registry migrated to multi-party authorization | In Progress | Deployer EOA holds admin; migration planned |
| On-chain governance (AXM voting) | Not Started | Planned for Universe Blockchain (L3) migration |

### 14.5 Compliance and Identity

| Criterion | Status | Notes |
|-----------|--------|-------|
| Identity-gated transfers | Ready | ERC-3643 enforced at contract level |
| KYC workflow operational | Ready | Full submission, review, approval flow live |
| Accredited investor workflow | Ready | Self-certification submission and Topic 2 issuance live |
| Sanctions screening | Ready | Topic 3 (SANCTIONS_CLEAR); 180-day validity |
| Claim revocation capability | Ready | `ERC3643Service.revokeClaim()` + API endpoint |
| Compliance operations log | Ready | `t3_compliance_ops_log` + Founder Ops dashboard |
| OFAC + international sanctions lists | In Progress | US-based screening active; international expansion planned |
| Third-party KYC provider integration | Not Started | Stubbed for Synaps/Persona; internal review in use |

### 14.6 Banking and Capital Controls

| Criterion | Status | Notes |
|-----------|--------|-------|
| FDIC-insured fiat account active | Ready | Axiom Nexus Account via Increase.com / First Internet Bank |
| Participant reference code system | Ready | AXM-XXXXXXXX format; issued at registration |
| Insurance hold system (Wealth Practice) | Ready | Full lifecycle tracking (pending, funded, released, forfeited) |
| LP deposit path (Lending Fund) | Ready | Full lifecycle tracking (pending, received, applied, rejected) |
| Admin payment confirmation controls | Ready | Banking dashboard Participants tab |
| Distribution tracking | Ready | `increase_distributions` table with reference and date |
| SIWE authentication on all banking endpoints | Ready | Wallet-ownership-matched session validation |
| Per-user banking accounts | Not Applicable | B2B treasury model; single entity account |

### 14.7 Transparency and Audit Trail

| Criterion | Status | Notes |
|-----------|--------|-------|
| Proof of Execution page | Ready | `/proof-of-execution` — 7 evidence rails |
| On-chain activity feed | Ready | Live PSM, vault, and EulerSwap transactions |
| Solvency console | Ready | `/solvency` — three-mode institutional console |
| Institutional disclosure page | Ready | `/disclosure` — with all doc links and timestamps |
| Hash chain audit record | Ready | 1 entry; expanding |
| Admin action log | Ready | Founder Ops dashboard |
| Diligence pack API | Ready | `/api/solvency/diligence-pack` |
| Participant payment audit trail | Ready | `increase_participants`, `increase_insurance_holds`, `increase_lp_deposits` tables |

### 14.8 Institutional Readiness Summary

**Overall Assessment:** The protocol has completed the foundational infrastructure required to engage institutional counterparties, including a live FDIC-insured fiat capital gateway. The primary blockers to full institutional readiness remain: (1) Deployer EOA migration to Governance Safe for AXUSD token and Identity Registry; (2) automated control layer audit; and (3) third-party reserve attestation.

| Category | Score (Weighted) |
|----------|-----------------|
| Legal/Entity Structure | 4 / 6 |
| Reserve/Solvency | 5 / 7 |
| Automated Control Layer Security | 5 / 10 |
| Governance | 4 / 6 |
| Compliance/Identity | 7 / 8 |
| Banking and Capital Controls | 8 / 8 |
| Transparency | 8 / 8 |
| **Total** | **41 / 53 (77%)** |

A score of 77% represents a materially improved foundation from the prior 73% assessment, with the banking and transparency categories now scoring full marks following Task #47. No criterion in this assessment is structurally blocked — each remaining gap has a defined remediation path.

---

## 15. Retail and Community Adoption Framework

### 15.1 Current Entry Points

| Product | Route | Lane | Minimum |
|---------|-------|------|---------|
| AXUSD Wallet | `/axusd` | Lane B (verified) | KYC only |
| Wealth Practice | `/wealth-practice` | Community (unverified) | No minimum |
| Community Entry Credit | `/community-credit` | Lane B (verified) | Participant GEF tier |
| Deal Flow Feed | `/deal-flow` | Unverified | None |
| Property Analysis | `/property-analysis` | Unverified | Free tier available |
| Lending Fund | `/lending-fund/invest` | Lane A (accredited) | Accredited investor |

### 15.2 Retail Onboarding Journey

```
Step 1: Wallet Connection
  +-- Connect via Reown AppKit (WalletConnect / MetaMask)

Step 2: KYC Submission
  +-- 3-step KYC Onboarding Modal
  |     Name, DOB, country, document type
  +-- Estimated 48h review

Step 3: Verification Confirmation
  +-- Compliance badge changes to "Verified Standard"
      isVerified() = true on-chain

Step 4: Protocol Access
  +-- AXUSD wallet active
      PSM mint/redeem available
      EulerSwap access enabled
      Community Entry Credit eligible

Step 5: Wealth Practice Banking Registration (optional)
  +-- Receive AXM reference code
      Fund insurance hold via ACH/wire
      Participate in community savings cycles

Step 6: Accreditation (for institutional products)
  +-- Submit accreditation self-certification
      Topic 2 issued upon approval
      Lending Fund and syndication access unlocked
```

### 15.3 Fiat Capital Pathway

The Axiom Nexus Banking integration provides the protocol's first fully operational fiat-to-participation pathway for community members:

```
Participant
  |
  +-- Registers on Wealth Practice or Lending Fund
  |
  +-- Receives AXM-XXXXXXXX reference code
  |
  +-- Initiates ACH or wire to Axiom Nexus Account (routing: 071006486)
  |   with reference code in memo field
  |
  +-- Operations confirms receipt in Increase dashboard
  |
  +-- Database record updated (hold funded or LP deposit applied)
  |
  +-- Participant participation record activated
```

This pathway requires no cryptocurrency ownership, no gas fees, and no wallet funding to begin — community members may participate in the Wealth Practice entirely through the fiat rail.

### 15.4 Community Economic Model

The Wealth Practice model provides a retail-accessible entry point that does not require capital thresholds or financial sophistication. Groups set their own contribution amounts, and GEF tier advancement is driven entirely by participation consistency — not investment size.

This creates a bottom-up pathway: a community member can enter through the Wealth Practice, build a GEF tier record, access Community Entry Credit, and eventually qualify for protocol-level products (Lending Fund access, syndication LP participation) through sustained participation rather than minimum capital deployment.

### 15.5 Retail Risk Disclosures

- AXUSD is an identity-gated stablecoin. Unverified wallets cannot hold or transfer AXUSD. Loss of identity verification (claim expiry, revocation) results in transfer restriction.
- Wealth Practice groups are community-managed. The protocol provides infrastructure and governance tools; member disputes and cycle defaults are managed by the group.
- Insurance holds deposited to the Axiom Nexus Account are operational funds held by Axiom Nexus LLC, not third-party custodial accounts. Hold terms are defined in the group participation agreement.
- Community Entry Credit is a protocol-extended credit facility, not a bank loan. Terms are defined in the credit agreement and enforced through GEF violation tracking.
- All on-chain assets are held in self-custody. The protocol does not take custody of user funds at the on-chain layer.
- Variable rates apply to all yield-generating products. No fixed returns are guaranteed.
- Automated control layers are not yet audited. Participants should assess protocol maturity risk accordingly.

---

## 16. On-Chain Proof of Execution

The protocol maintains a multi-layer, publicly verifiable execution record at `/proof-of-execution`. As of March 31, 2026:

| Rail | Count | Description |
|------|-------|-------------|
| Operations Log | 12 entries | Founder operations log across all categories |
| Real Asset Pipeline | 20 deals | Acquisition analysis and underwriting records |
| Field Inspections | 3 sessions | Physical property walkthroughs |
| Syndication Offerings | 10 structures | Capital formation records |
| Treasury Snapshots | 10 snapshots | Solvency record with CR, RR, policy mode |
| Hash Chain | 1 entry | Audit integrity chain |
| Verified Outcomes | 0 entries | Reviewed and confirmed results (expanding) |

### 16.1 Live On-Chain Activity (Selected)

The On-Chain Activity rail feeds directly from Arbitrum One via Alchemy. Monitored addresses include the Canonical PSM, both Euler vaults, and both EulerSwap pools. Selected confirmed transactions:

| Date | Type | Asset | Amount | Transaction |
|------|------|-------|--------|-------------|
| 2026-03-30 | PSM Mint | USDC | 20 | `0x84d471a5...` |
| 2026-03-30 | Vault Deposit (AXM) | AXM | 20 | `0xeef11373...` |
| 2026-03-28 | Vault Deposit (AXM) | AXM | 10,000 | `0x79ca2515...` (seed) |
| 2026-03-26 | Vault Deposit (AXUSD) | AXUSD | 10,000 | `0x82b7f98d...` (seed) |

All transactions are independently verifiable on Arbiscan at `https://arbiscan.io`.

---

## 17. Known Issues and Remediation Status

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| KI-001 | Deployer EOA holds mint authority on ERC-3643 AXUSD — single point of failure | High | In Progress — Migration to Governance Safe planned |
| KI-002 | No time-lock delay on ERC-3643 agent functions (freeze, forcedTransfer) | Medium | In Progress — Agent delegation planned |
| KI-003 | Canonical PSM MINTER_ROLE and AGENT_ROLE granted via EOA — same risk as KI-001 | Medium | Resolved — Both roles active; PSM minting confirmed live |
| KI-004 | eAXUSD-4 vault in WITHDRAW_ONLY mode due to hook config issue | Medium | Resolved by deprecation — eAXUSD-6 is canonical |
| KI-005 | Ownership transfer on AXUSD token is single-step `transferOwnership` | Low | Informational — Deployer must transfer to Safe promptly |
| KI-006 | ERC-3643 Country Allow Module currently only permits US (country code 840) | Informational | Intentional — International expansion via governance |

No new known issues were introduced by Task #47. The banking integration layer uses application-level controls (SIWE authentication, admin key validation) rather than automated control layer enforcement. The participant registry and hold/deposit tables are off-chain records managed by the operations team. No protocol funds are held in automated control layers as part of the banking integration.

---

## 18. Regulatory Positioning

### 18.1 AXUSD and the GENIUS Act Framework

AXUSD is designed to align with the Securing the U.S. Innovation Necessary for Every Stablecoin (GENIUS) Act framework for payment stablecoins. The protocol does not make a definitive legal conclusion that AXUSD is or will be compliant with the GENIUS Act, as that determination rests with outside counsel and the relevant regulatory bodies.

Key design choices aligned with the GENIUS Act framework:
- 1:1 USD backing via USDC reserves — no algorithmic stabilization
- Reserve assets held in segregated pools, not commingled with operating funds
- Identity-gated transfers — no anonymous circulation
- Reserve methodology published and verifiable
- PSM fee structure transparent and fixed

### 18.2 AXM Token

AXM is the governance token of the Axiom Protocol. It is not characterized as a security within this document. AXM grants holders the ability to participate in protocol governance decisions, including treasury allocation, fee parameters, and protocol upgrades. No legal opinion on AXM token classification is provided here — that determination requires outside counsel and is dependent on jurisdiction.

### 18.3 Syndication Offerings

All syndication offerings are structured under SEC Regulation D, Rule 506(c). Participation is restricted to accredited investors as verified through the ERC-3643 Topic 2 (ACCREDITED_INVESTOR) claim process. The protocol does not make general solicitations in violation of Reg D requirements.

### 18.4 Lending Fund LP Investments

Lending Fund LP commitments are accepted exclusively from accredited investors (Lane A) in accordance with SEC Reg D 506(c). The ACH Deposit Path described in Section 11 is the designated capital intake mechanism for Lending Fund LP commitments. Participants must complete accreditation verification before the LP deposit path is activated.

### 18.5 Banking Rail

The Axiom Nexus Account is a business checking account held by Axiom Nexus LLC at First Internet Bank, accessed via Increase.com. This account is not a brokerage account, trust account, or pooled investment vehicle. Funds deposited to this account by Wealth Practice participants are operational insurance holds subject to the terms of the group participation agreement. LP deposits are subject to the terms of the Lending Fund subscription documents.

### 18.6 Community Entry Credit

Community Entry Credit is a protocol-native credit facility extended based on GEF tier participation history. It is not a federally insured deposit, a bank loan, or a securities product. Credit terms are defined in the Community Credit Agreement and are subject to GEF enforcement.

---

## 19. Forward Roadmap

### Phase 1 (Q2 2026) — Governance Migration
- Transfer AXUSD token ownership to Governance Safe
- Transfer Identity Registry ownership to Governance Safe
- Revoke Deployer EOA agent status on AXUSD (replacing with PSM as sole MINTER_ROLE holder)
- Engage automated control layer auditor using `docs/audit-readiness-checklist.md` package

### Phase 2 (Q3 2026) — Audit and Attestation
- Complete automated control layer audit (AXUSD token, PSM, identity contracts)
- Third-party reserve attestation from accounting firm
- Bug bounty program launch
- Formal legal opinion on AXM and AXUSD characterization

### Phase 3 (Q3–Q4 2026) — Protocol Expansion
- Universe Blockchain (L3) migration planning
- International expansion via Country Allow Module governance vote
- Third-party KYC provider integration (Synaps or Persona)
- Increase participant banking expansion — additional product integrations (Wealth Practice group-level accounts, distribution automation)
- AXM on-chain governance voting

### Phase 4 (Q4 2026 and Beyond) — Full Institutional Stack
- Permissioned secondary market for Syndication LP interests
- Cross-chain AXUSD bridging (Arbitrum, Universe Blockchain)
- T-bill reserve asset onboarding (supplementary backstop)
- DePIN network expansion (DeNet storage nodes)
- Institutional API access for diligence portals
- Automated LP distribution via Increase Transfers API (eliminating manual distribution workflow)

---

## 20. Contract Address Registry

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

### Lending Infrastructure

| Contract | Address | Status |
|----------|---------|--------|
| AXIOMFixedLoan | Deployed on Arbitrum One | Live |
| AXIOMCreditMarket | Deployed on Arbitrum One | Live |

### Legacy Contracts (Deprecated)

| Contract | Address | Status |
|----------|---------|--------|
| Legacy GENIUS PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | Configured-Inactive |
| GENIUS AXUSD Token | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Deprecated |
| Euler AXUSD Token | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Deprecated |

### External Integrations

| System | Identifier |
|--------|-----------|
| USDC (Arbitrum One) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Alchemy RPC | Arbitrum One — `arb-mainnet.g.alchemy.com/v2/` |
| Arbiscan (Block Explorer) | `https://arbiscan.io` |
| Increase.com Banking API | Axiom Nexus Account — ABA 071006486 (First Internet Bank) |
| BitGo CaaS | Institutional crypto custody |

---

## 21. Glossary

| Term | Definition |
|------|------------|
| **Automated Control Layers** | Programmable code deployed on a blockchain that executes automatically under defined conditions. Also referred to in technical contexts as smart contracts. |
| **Multi-Party Authorization** | A governance mechanism requiring multiple independent private key signatures to authorize a transaction. Also referred to in technical contexts as multi-sig. |
| **On-Chain Financial Rails** | Decentralized financial protocols operating on a public blockchain. Also referred to in technical contexts as DeFi. |
| **Asset Onboarding / Issuance** | Representing a real-world asset or financial instrument as a blockchain token. Also referred to in technical contexts as tokenization. |
| **Participation Lockup** | Committing tokens to a protocol in exchange for governance rights or protocol rewards. Also referred to in technical contexts as staking. |
| **Canonical PSM** | The single authorized USDC to AXUSD mint/redeem facility for Unified AXUSD. Replaces all legacy PSM configurations. |
| **ERC-3643** | The T-REX standard for identity-gated security tokens, enforcing compliance at the automated control layer transfer level. |
| **ONCHAINID** | An on-chain identity contract deployed per investor via the Identity Factory, storing verified claim signatures. |
| **Coverage Ratio (CR)** | Treasury Total Assets / Total Protocol Liabilities. Measures overall protocol solvency. |
| **Reserve Ratio (RR)** | Total USDC Reserves / Canonical AXUSD Supply. Measures direct USD backing. |
| **Liquidity Buffer Ratio (LBR)** | Immediately Liquid Reserves / Total Protocol Liabilities. Measures near-term redemption capacity. |
| **Lane A** | Institutional/accredited participant lane. Topics 1, 2, 3 required. Higher transfer limits. Full product access. |
| **Lane B** | Verified standard participant lane. Topics 1 and 3 required. 25,000 AXUSD/day cap. Core product access. |
| **GEF** | Graduated Execution Framework. Participation-history-based tier system governing protocol credit and product access. |
| **The Wealth Practice** | The protocol's community rotating savings coordination system. Formerly referred to as Savings Circle. |
| **EVK** | Ethereum Vault Kit. Euler V2's modular vault standard compatible with ERC-4626. |
| **EulerSwap** | Euler's automated market-making layer, integrated with EVK vaults for supply-side liquidity. |
| **Proof of Execution** | The protocol's multi-rail auditable operations record at `/proof-of-execution`. |
| **GENIUS Act** | Securing the U.S. Innovation Necessary for Every Stablecoin Act. US federal payment stablecoin legislation. |
| **Reg D 506(c)** | SEC exemption permitting general solicitation of accredited investors only. Used for Axiom syndication offerings and Lending Fund LP commitments. |
| **Axiom Nexus Account** | The protocol's FDIC-insured institutional checking account at First Internet Bank, accessed via Increase.com. Single-entity B2B treasury for all fiat capital flows. |
| **ACH Reference Code** | A unique participant identifier in the format AXM-XXXXXXXX issued to each registered participant. Must be included in the memo field of any ACH or wire transfer to the Axiom Nexus Account for payment attribution. |
| **Insurance Hold** | A performance deposit held by Axiom Nexus LLC for each Wealth Practice participant, calculated at 100% of one cycle contribution amount. Held for the duration of group participation; released upon group conclusion or forfeited upon early exit. |
| **SIWE** | Sign-In With Ethereum. An authentication standard enabling wallet-ownership-verified sessions without a traditional username and password. |
| **IVCEE** | Institutional Viability and Capital Efficiency Engine. The protocol's allocator-grade property underwriting intelligence system. |
| **MIRDT** | The protocol's nine-dimension capital intelligence terminal producing a Protocol Readiness Score (PRS, 0-10). |
| **Axiom Sentinel** | A unified capital decision and risk authorization layer governing protocol fund movements and agent actions. |

---

*Document produced by Axiom Protocol — Axiom Nexus LLC. Last updated: March 31, 2026.*
*All on-chain references are verifiable on Arbitrum One (chainId: 42161) via Arbiscan.*
*This document does not constitute an offer to sell or solicitation of an offer to purchase any security.*
*All rates are variable. No returns are guaranteed.*
*Forward-looking statements reflect current intentions and are subject to change without notice.*
*Version 2.0 supersedes v1.1 (March 30, 2026) and v3.0 (March 23, 2026).*
