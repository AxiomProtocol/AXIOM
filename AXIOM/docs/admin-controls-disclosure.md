# Admin Controls Disclosure — Axiom Protocol

**Version:** 1.0  
**Effective Date:** 2026-03-30  
**Classification:** Institutional Disclosure — Not Investment Advice

---

## 1. Purpose

This document enumerates every privileged function across the Axiom Protocol ERC-3643 AXUSD system, identifies the current authority holder for each function, describes the authorization mechanism, and tracks migration status toward multi-party governance.

This disclosure is provided to allocators, counterparties, and compliance reviewers who require a complete picture of the protocol's administrative control surface.

---

## 2. Authority Holders

| Label | Address | Type | Notes |
|---|---|---|---|
| Deployer EOA | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | Single private key | Current admin for most ERC-3643 contracts; migration to Safe/Timelock in progress (Task #42) |
| Governance Safe (3-of-5) | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Gnosis Safe, 3-of-5 multisig | Target admin for canonical PSM, treasury, and protocol-level functions |
| AXM Admin Safe | `0x93696b537d814Aed5875C4490143195983AED365` | Gnosis Safe | AXM token mint authority |
| Timelock Controller (24h) | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | OpenZeppelin TimelockController | 24-hour minimum delay; Governance Safe holds PROPOSER_ROLE |
| Claim Issuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` | Contract | Issues and revokes on-chain identity claims via ERC-3643 ClaimIssuer interface |

---

## 3. ERC-3643 Unified AXUSD Token (`0xD6110F59...`)

| Function | Privilege Level | Current Holder | Migration Target | Notes |
|---|---|---|---|---|
| `mint(address, uint256)` | AGENT_ROLE | Deployer EOA | Canonical PSM (post `addAgent()`) | Only whitelisted agents may mint |
| `burn(address, uint256)` | AGENT_ROLE | Deployer EOA | Canonical PSM (post `addAgent()`) | Only whitelisted agents may burn |
| `freezeAddress(address, bool)` | AGENT_ROLE | Deployer EOA | Compliance ops tooling | Freeze/unfreeze individual wallet |
| `batchFreezeAddress(address[], bool[])` | AGENT_ROLE | Deployer EOA | Compliance ops tooling | Batch freeze operation |
| `freezePartialTokens(address, uint256)` | AGENT_ROLE | Deployer EOA | Compliance ops tooling | Partial token freeze |
| `unfreezePartialTokens(address, uint256)` | AGENT_ROLE | Deployer EOA | Compliance ops tooling | Release partial freeze |
| `forcedTransfer(address, address, uint256)` | AGENT_ROLE | Deployer EOA | Governance Safe | Recovery of misrouted funds |
| `recoveryAddress(address, address, address)` | AGENT_ROLE | Deployer EOA | Governance Safe | Identity recovery for lost wallet |
| `setIdentityRegistry(address)` | OWNER | Deployer EOA | Governance Safe + Timelock | Replace compliance registry — critical |
| `setCompliance(address)` | OWNER | Deployer EOA | Governance Safe + Timelock | Replace compliance module — critical |
| `pause()` | AGENT_ROLE | Deployer EOA | Governance Safe | Emergency halt all transfers |
| `unpause()` | AGENT_ROLE | Deployer EOA | Governance Safe | Resume transfers |
| `addAgent(address)` | OWNER | Deployer EOA | Governance Safe + Timelock | Grant mint/burn/freeze authority |
| `removeAgent(address)` | OWNER | Deployer EOA | Governance Safe + Timelock | Revoke agent authority |

---

## 4. Identity Registry (`0x58f64a1262...`)

| Function | Privilege Level | Current Holder | Migration Target | Notes |
|---|---|---|---|---|
| `registerIdentity(address, onchainId, uint16)` | AGENT_ROLE | Deployer EOA | Compliance ops tooling | On-boards a new investor identity |
| `deleteIdentity(address)` | AGENT_ROLE | Deployer EOA | Compliance ops tooling | Removes investor identity |
| `updateIdentity(address, newOnchainId)` | AGENT_ROLE | Deployer EOA | Compliance ops tooling | Replaces investor's ONCHAINID |
| `updateCountry(address, uint16)` | AGENT_ROLE | Deployer EOA | Compliance ops tooling | Changes investor country code |
| `addAgent(address)` | OWNER | Deployer EOA | Governance Safe + Timelock | Grant agent role to address |
| `removeAgent(address)` | OWNER | Deployer EOA | Governance Safe + Timelock | Revoke agent role |

---

## 5. Claim Issuer (`0x579A367e...`)

| Function | Privilege Level | Current Holder | Notes |
|---|---|---|---|
| `issueClaim(identity, topic, data, sig)` | Protocol operator | Deployer EOA | Called off-chain via ERC3643Service; writes claim to ONCHAINID contract |
| `revokeClaim(claimId, identity)` | Deployer EOA | Deployer EOA | Revoke by claim ID — database state and on-chain revoke |
| `revokeClaimBySignature(bytes)` | Deployer EOA | Deployer EOA | Revoke by original claim signature |

---

## 6. Canonical PSM (`0xDB669bb6...`)

| Function | Privilege Level | Current Holder | Notes |
|---|---|---|---|
| `pause()` | OWNER | Governance Safe | Emergency halt mint/redeem |
| `unpause()` | OWNER | Governance Safe | Resume mint/redeem |
| `setDebtCeiling(uint256)` | OWNER | Governance Safe | Change AXUSD issuance cap |
| `setMintFee(uint256)` | OWNER | Governance Safe | Adjust mint fee in basis points |
| `setRedeemFee(uint256)` | OWNER | Governance Safe | Adjust redeem fee in basis points |
| `sweepFees(address)` | OWNER | Governance Safe | Transfer accrued USDC fees to recipient |

Note: The Canonical PSM was deployed with the Governance Safe as owner. No Deployer EOA authority exists on the PSM.

---

## 7. Modular Compliance (`0xaC9E1A91...`)

| Function | Privilege Level | Current Holder | Notes |
|---|---|---|---|
| `bindModule(address)` | Token Owner (AXUSD owner) | Deployer EOA | Add compliance module |
| `unbindModule(address)` | Token Owner | Deployer EOA | Remove compliance module |
| `callModuleFunction(bytes, address)` | Token Owner | Deployer EOA | Governance call-through to modules |

---

## 8. Lending Platform Module (`0xC0177120...`)

| Function | Privilege Level | Current Holder | Notes |
|---|---|---|---|
| `addPlatform(token, platform)` | Token Owner | Deployer EOA | Whitelist a DeFi platform for compliance bypass |
| `removePlatform(token, platform)` | Token Owner | Deployer EOA | Remove platform whitelist |

---

## 9. AXM Token (ERC20) (`0x864F9c6f...`)

| Function | Privilege Level | Current Holder | Notes |
|---|---|---|---|
| `mint(address, uint256)` | MINTER_ROLE | AXM Admin Safe (`0x93696b...`) | Governance Safe controls |
| `pause()` | PAUSER_ROLE | AXM Admin Safe | Emergency halt AXM transfers |
| Role grants | DEFAULT_ADMIN_ROLE | AXM Admin Safe | Role management authority |

---

## 10. Governance Structure and Migration Status

### Current State (Bootstrap Phase)
- Most ERC-3643 agent functions are controlled by the **Deployer EOA** — a single private key
- This is acknowledged as a temporary bootstrap configuration
- Deployer EOA exposure is the primary administrative risk factor

### Target State
- All owner functions migrated to **Governance Safe (3-of-5)** + **Timelock (24h)**
- Agent functions migrated to automated compliance tooling under Safe supervision
- Deployer EOA retains no protocol authority

### Migration Progress (Task #42)

| Contract | Function Class | Migrated? |
|---|---|---|
| Canonical PSM | Owner | Yes — Governance Safe owns PSM at deployment |
| Unified AXUSD Token | Owner | No — Deployer EOA; pending Safe handover |
| Unified AXUSD Token | Agent (mint/burn) | No — Deployer EOA; pending PSM `addAgent()` |
| Identity Registry | Owner | No — Deployer EOA; pending handover |
| Identity Registry | Agent | No — Deployer EOA; partially delegated to compliance tooling |
| Modular Compliance | Owner | No — Deployer EOA; pending handover |
| AXM Token | MINTER_ROLE | Yes — AXM Admin Safe |

---

## 11. Off-Chain Admin Controls

| System | Access Mechanism | Holders | Notes |
|---|---|---|---|
| `/api/erc3643/*` compliance endpoints | `x-admin-key` header = `ADMIN_SOLVENCY_KEY` env var | Deployer / internal ops | KYC approval, claim revocation, accreditation review |
| `/api/solvency/*` internal endpoints | `x-admin-key` header = `ADMIN_SOLVENCY_KEY` env var | Deployer / internal ops | Snapshot triggers, reserve reads |
| Founder Ops Dashboard (`/founder-ops`) | Session auth (Auth0 + admin role check) | Internal only | Full compliance ops UI |

---

## 12. Limitations and Disclosures

- The Deployer EOA represents a single point of failure for most ERC-3643 agent functions. Loss or compromise of this key could result in inability to issue claims (bricking KYC flows) or, if an attacker gained access, the ability to freeze addresses.
- No time-locked delay currently protects ERC-3643 agent actions (freeze, mint, burn). The Timelock protects owner-level parameter changes but is not yet wired to the agent functions.
- Governance Safe migration (Task #42) is in progress and not yet complete. No timeline for completion is guaranteed.
- This document reflects state as of 2026-03-30. It will be updated as migrations complete.

---

*Document produced by Axiom Protocol. Last updated: 2026-03-30.*
