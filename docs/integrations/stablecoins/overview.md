# Stablecoin Integration Overview

---

## Axiom's Stablecoin Stack

| Token | Chain | Type | Role | Status |
|-------|-------|------|------|--------|
| AXUSD | Arbitrum One | ERC-3643 (T-REX) | Internal settlement layer | Live |
| AXAU | Arbitrum One | Custom ERC-20 + reserve | Reserve instrument (PAXG-backed) | Live |
| USDC | Arbitrum One | Circle USDC | PSM reserve / PSM backing | Live (in PSM) |
| PAXG | Ethereum / Arbitrum | Paxos ERC-20 | AXAU reserve backing | Live (vault) |

---

## AXUSD (Canonical — ERC-3643)

**Contract:** `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` (Arbitrum)  
**Standard:** ERC-3643 (T-REX) — identity-gated  
**Mint authority:** Canonical PSM only (ERC-3643 gated)  
**Settlement:** Internal Axiom settlement for capital programs, wealth practice, AXAU purchase  
**Not exported to:** Any other chain currently

**Cross-chain expansion note:**
- AXUSD should NOT be bridged to other chains without careful design
- Bridging ERC-3643 tokens is complex — identity compliance must follow the token
- Any cross-chain AXUSD exposure should go through a purpose-designed bridge contract that maintains compliance gating

---

## USDC (Circle — Multi-Chain)

Circle issues USDC on multiple chains. Axiom uses USDC primarily for PSM backing on Arbitrum.

**USDC availability for expansion:**

| Chain | USDC Availability | Notes |
|-------|------------------|-------|
| Arbitrum | Live | Used in PSM |
| Ethereum | Live | Canonical Circle USDC |
| Polygon | Live | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| Avalanche C-Chain | Live | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| Stellar | Live | Circle issues USDC on Stellar |

**Axiom use case for expansion:**
- Polygon: USDC already on Polygon — can be used for compliance screening flow
- Avalanche: USDC on Avalanche — usable in capital program environments
- Stellar: USDC on Stellar — primary corridor asset for international payments

**Circle CCTP (Cross-Chain Transfer Protocol):**
CCTP allows native USDC transfers between chains without bridges. Axiom can use CCTP to move USDC from Arbitrum to Stellar for payment corridor funding.

**CCTP supported chains (verify current list):** https://developers.circle.com/stablecoins/cctp-getting-started

---

## PAXG (Reserve Asset — Ethereum/Arbitrum)

**Issuer:** Paxos Trust Company  
**Chain:** Ethereum Mainnet (canonical), Arbitrum (bridged)  
**Standard:** ERC-20  
**Role:** Backs AXAU 1:1 in GoldVault contract

**Cross-chain expansion:** PAXG does NOT need to move to other chains. The reserve layer stays on Arbitrum. Only AXUSD settlement needs multi-chain expansion, and only if specific products require it.

---

## Stablecoin Expansion Design Rules

1. **AXUSD stays on Arbitrum** — Do not bridge AXUSD until a compliant ERC-3643 cross-chain bridge is designed
2. **Use USDC as the corridor currency** — USDC is available on all expansion target chains (except Canton/Cosmos where it's different)
3. **Circle CCTP is the preferred bridge mechanism** — for USDC moving between EVM chains (Arbitrum → Polygon → Avalanche)
4. **For Stellar:** USDC on Stellar is the peg mechanism — Axiom PSM USDC → CCTP/anchor → Stellar USDC → fiat
5. **For Canton:** No standard stablecoin — DAML models the asset
6. **For Cosmos:** If Axiom chain launches, AXUSD could be a native Cosmos token using ICS-20

---

## Key Stablecoin Env Variables

| Variable | Purpose | Status |
|---------|---------|--------|
| `STRIPE_SECRET_KEY` | Stripe (if used for USDC onramp) | Configured |
| Circle API credentials | USDC programmable wallets + compliance | Verify CIRCLE_APP_ID |
