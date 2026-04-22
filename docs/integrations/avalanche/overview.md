# Avalanche — Integration Overview

**Axiom Role:** Compliance-Aware Capital Deployment Zones  
**Chain ID:** 43114 (C-Chain Mainnet)  
**Status:** Researching  
**Feature Flag:** `ENABLE_AVALANCHE_CAPITAL_ENV`  
**EVM Compatible:** Yes (C-Chain)  
**RPC Provider:** Alchemy (`avax-mainnet` network slug)

---

## What Avalanche Does in the Axiom Architecture

Avalanche is the planned **compliance-aware capital deployment zone** for Axiom Protocol. It does NOT replace Arbitrum as the core execution environment, and it does NOT replace AXUSD as the internal settlement layer.

Its role is: **enable permissioned, private capital deployment environments** — using Avalanche's Subnet architecture — for institutional participants who require isolated, compliance-enforced execution environments. This maps to Axiom's Reg D 506(c) capital programs and private lending operations that benefit from customizable execution rules.

### Why This Matters

Avalanche Subnets allow Axiom to deploy a **custom execution environment** with:
- Permissioned validator sets (whitelisted institutions only)
- Custom gas token or fee model
- EVM-compatible execution (Subnet-EVM)
- Isolated state (transactions private to subnet participants)

This enables Axiom to offer institutional capital programs in an execution environment where the rules — who can transact, what assets are valid, what compliance gates apply — are enforced at the infrastructure level, not just by application logic.

---

## Integration Surface Summary

| Surface | Status | Notes |
|--------|--------|-------|
| C-Chain RPC | Available | Alchemy supports avax-mainnet |
| Subnet creation | Not reviewed | Requires validator setup + Subnet SDK |
| Subnet-EVM | Not reviewed | Go-based custom VM for subnet |
| AvalancheGo node | Not reviewed | Required for validator participation |
| Glacier API | Not reviewed | Avalanche data indexing API |
| BitGo AVAX support | Verify | Check if BitGo CaaS supports AVAX |
| Circle on Avalanche | Partial | USDC exists on Avalanche C-Chain |

---

## Role Boundaries (Must Not Be Crossed)

| Avalanche IS | Avalanche IS NOT |
|-------------|-----------------|
| Capital deployment zone | Core execution layer |
| Permissioned subnet environment | Settlement layer |
| Institutional product isolation layer | Reserve layer |
| Additive compliance rail | Replacement for Arbitrum |
| Customizable execution environment | Replacement for AXUSD |

---

## Subnet Architecture Decision (Not Yet Made)

The key architectural decision for Avalanche integration is:

1. **C-Chain deployment only:** Deploy Axiom capital program contracts directly to Avalanche C-Chain (simpler, less isolation)
2. **Custom Subnet with Subnet-EVM:** Create a permissioned Avalanche Subnet dedicated to Axiom capital programs (more complex, full isolation)

Decision must be made before implementation begins. See `open-questions.md`.
