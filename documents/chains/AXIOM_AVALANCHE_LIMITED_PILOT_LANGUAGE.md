# Axiom Protocol — Avalanche Limited Pilot Approved Language

**Document type:** Communications Guidance  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Version:** 1.0.0  
**Created:** 2026-05-14  
**Applies to:** Internal communications, operator updates, partner briefings, status pages, product copy  

---

## Purpose

This document defines approved and prohibited language for all references to the Avalanche C-Chain deployment during the limited pilot period. It ensures accurate representation to all audiences without overstating readiness, understating risk, or creating compliance exposure.

Any communications that describe the Avalanche deployment must use only approved language from this document or language substantially equivalent and approved by Operations Lead or Compliance Counsel.

---

## Approved Language

### Describing Deployment Status

> "Axiom Protocol's Avalanche C-Chain deployment is live in limited pilot mode."

> "The Avalanche ERC-3643 compliance stack is operational in a controlled pilot."

> "Avalanche C-Chain deployment is in limited pilot mode on chainId 43114."

> "The Avalanche AXUSD contract is deployed and verified on Avalanche mainnet, operating under pilot constraints."

### Describing Access

> "Pilot access is restricted to pre-approved operator and founder wallets."

> "Participant access is operator-controlled during the pilot period."

> "This is not an open public deployment."

> "Pilot participants are individually pre-approved before any minting activity."

### Describing Minting

> "Minting is operator-controlled."

> "Each mint is manually authorized and recorded by the protocol operator."

> "No automated minting is active during the pilot period."

> "Minting is capped at 2,500 AXUSD total during the pilot."

### Describing Compliance Controls

> "US-only jurisdiction gating is active and enforced on-chain."

> "Transfers are gated to US-domiciled participants only (ISO 3166-1 code 840)."

> "A per-wallet daily transfer cap of 5,000 AXUSD is enforced on-chain."

> "ERC-3643 compliance controls are active, including country allowlist and transfer limit modules."

### Describing Pending Controls

> "Safe migration and external audit are required before production scale."

> "Role migration to a Gnosis Safe multi-party authorization structure is planned before full production."

> "An external security audit is required before the deployment accepts meaningful TVL."

> "The pilot operates under accepted-risk controls pending Safe deployment and audit."

### Describing TVL and Scale

> "No unrestricted TVL is being accepted."

> "Total pilot minting is capped at 2,500 AXUSD."

> "This is not a full production deployment. Meaningful TVL requires additional controls."

> "The pilot is designed to validate operational readiness, not to accumulate significant value."

### Describing Arbitrum Relationship

> "Arbitrum One remains the canonical settlement chain for Axiom Protocol."

> "Avalanche C-Chain is an expansion network operating in limited pilot mode alongside the Arbitrum canonical deployment."

---

## Prohibited Language

The following phrases must not be used in any internal or external communication about the Avalanche deployment.

| Prohibited | Reason | Approved Alternative |
|---|---|---|
| "fully live" | Inaccurate — controls are deferred | "live in limited pilot mode" |
| "open to all users" | Inaccurate — access is restricted | "restricted to approved participants" |
| "institutional-ready" | Inaccurate — audit not complete, no Safe | "operational in controlled pilot" |
| "unrestricted production" | Inaccurate — caps and controls active | "limited pilot mode" |
| "audited" | Inaccurate — external audit not yet conducted | "internally reviewed; external audit pending" |
| "safe for significant TVL" | Inaccurate — audit and Safe migration deferred | "pilot TVL cap of 2,500 AXUSD" |
| "bankless launch" | Misleading — deferred rail, not excluded | "crypto-native launch; ACH/wire deferred" |
| "live on Avalanche" (unqualified) | Incomplete — must include "limited pilot" | "live in limited pilot mode on Avalanche" |
| "production launch" | Inaccurate — pilot, not launch | "limited pilot mode" |
| "open TVL" | Inaccurate | "TVL cap of 2,500 AXUSD during pilot" |
| "permissionless" | Inaccurate — ERC-3643 is permissioned | "permissioned under ERC-3643" |
| "compliant" (unqualified) | No legal conclusion on token classification | "designed to align with ERC-3643 compliance framework" |

---

## Additional Vocabulary Notes

These guidelines supplement but do not replace the canonical glossary at `lib/glossary.ts`.

| Technical Term | Institutional Vocabulary |
|---|---|
| smart contract | automated control layer |
| multi-sig | multi-party authorization |
| DeFi | on-chain financial rails |
| tokenization | asset onboarding / issuance |
| staking | participation lockup |
| country allowlist module | jurisdiction control layer |
| transfer limit module | transfer cap enforcement |

---

## Usage Examples

### Status Page (correct)

> Avalanche C-Chain: Limited Pilot Mode — Operator-Controlled  
> US jurisdiction gating active. Safe migration pending. Audit pending.

### Operator Briefing (correct)

> The Avalanche ERC-3643 compliance stack is live in limited pilot mode.
> Minting is operator-controlled, capped at 2,500 AXUSD total. US-only access.
> Gnosis Safe deployment and external audit are required before production scale.

### What NOT to send (incorrect)

> ~~The Avalanche deployment is live! Unrestricted production is now active. Fully audited and institutional-ready.~~

---

*Axiom Protocol Internal — Communications Guidance v1.0.0 — 2026-05-14*
