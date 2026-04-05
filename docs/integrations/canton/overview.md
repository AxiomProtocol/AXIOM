# Canton Network — Integration Overview

**Axiom Role:** Institutional-Grade Finance Interoperability Bridge  
**Chain Category:** institutional (non-EVM)  
**Status:** Researching  
**Feature Flag:** `ENABLE_CANTON_INSTITUTIONAL_BRIDGE`  
**EVM Compatible:** No  
**Execution Model:** DAML smart contracts on participant nodes  
**Operated by:** Digital Asset (DA) — Canton is their production network

---

## What Canton Does in the Axiom Architecture

Canton is the planned **institutional-grade bridge** for Axiom Protocol. It does NOT replace Arbitrum, does NOT replace AXUSD, and is NOT a payments rail.

Its role is: **connect Axiom's private market products to enterprise financial institutions operating on the Canton Network**, enabling institutional participants (banks, custodians, prime brokers) to interact with Axiom capital programs through their Canton infrastructure.

### Why This Matters

Canton is where major institutional finance is moving on-chain. Current Canton participants include:
- Goldman Sachs
- BNY Mellon
- Broadridge
- SBI Digital Asset Holdings
- Deutsche Boerse
- Cboe

These institutions are not building on Ethereum or Arbitrum. They are building on Canton. For Axiom to participate in institutional private capital markets, a Canton integration surface provides access to this network.

---

## Canton Architecture (Critical Differences from EVM)

Canton is fundamentally different from EVM chains:

| Concept | EVM (Arbitrum) | Canton |
|---------|---------------|--------|
| Contract language | Solidity | DAML |
| Execution model | Global state machine | Need-to-know data sharing |
| Privacy model | Pseudonymous, public ledger | Contract data visible only to parties |
| Network participants | Miners/validators | Participant nodes |
| Transaction | Hash on public chain | DAML transaction, visible only to involved parties |
| Gas | ETH/ARB | Network fees to sync domains |
| Smart contracts | Solidity/EVM | DAML templates |
| SDK | ethers.js / viem | DAML SDK / Ledger API |

### Key Implications for Axiom

1. **No Solidity contracts on Canton.** All Canton logic is written in DAML.
2. **Privacy is native.** Other Canton participants cannot see Axiom's contract data unless explicitly included.
3. **Requires participant agreement.** Cannot deploy to Canton without signing a participant agreement with Digital Asset or a Canton network operator.
4. **Ledger API is gRPC.** Not REST or WebSocket — requires gRPC client.

---

## Integration Surface Summary

| Surface | Status | Notes |
|--------|--------|-------|
| Canton participant node | Not started | Requires participant agreement |
| DAML SDK | Not reviewed | Different from all existing Axiom tooling |
| Ledger API (gRPC) | Not reviewed | Primary programmatic interface |
| Canton JSON API | Not reviewed | REST wrapper over Ledger API (easier) |
| Digital Asset partnership | Not initiated | Required before any integration |
| DAML contracts for Axiom | Not designed | Requires DAML expertise |

---

## Role Boundaries (Must Not Be Crossed)

| Canton IS | Canton IS NOT |
|----------|--------------|
| Institutional interoperability bridge | Core execution layer |
| Enterprise finance product surface | Settlement layer |
| Private market connectivity | Replacement for Arbitrum |
| Institution-facing access layer | Payments rail |
| Need-to-know privacy for institutional data | Reserve layer |

---

## Partnership Prerequisite

**Canton integration cannot begin without a formal partnership or participant agreement with Digital Asset or an existing Canton network operator.**

This is not a technical blocker — it is a business relationship prerequisite. Until an agreement is in place:
- No DAML development should begin (DAML contracts are environment-specific)
- No participant node should be provisioned
- Integration remains at `researching` status

**First step:** Initiate contact with Digital Asset (canton.network/contact or sales@digitalasset.com) to understand participant onboarding process and requirements.
