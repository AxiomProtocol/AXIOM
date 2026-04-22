# Stellar — Official Domains and Documentation Sources

**Status:** Docs not yet attached — this file defines the collection checklist.

---

## Primary Documentation Surfaces to Collect

### 1. Stellar Developers Hub
- **Domain:** https://developers.stellar.org/
- **Priority:** CRITICAL
- **Sections needed:**
  - Getting started with Stellar
  - Stellar SDK (stellar-sdk) reference
  - Horizon API reference
  - Asset creation and issuance
  - Path payments
  - Account management (sequence, trust lines, XLM minimum)
  - Testnet access (Friendbot)

### 2. Stellar SEP Specifications (GitHub)
- **Domain:** https://github.com/stellar/stellar-protocol/tree/master/ecosystem
- **Priority:** CRITICAL — SEP standards govern all anchor integrations
- **Files to download:**
  - `sep-0001.md` — stellar.toml
  - `sep-0006.md` — Deposit and withdrawal
  - `sep-0010.md` — Stellar Web Authentication
  - `sep-0024.md` — Interactive Anchor (primary anchor protocol)
  - `sep-0031.md` — Cross-Border Payments

### 3. Stellar SDK (stellar-sdk) Docs
- **Domain:** https://stellar.github.io/js-stellar-sdk/
- **Priority:** CRITICAL — primary SDK for Axiom integration
- **Sections needed:**
  - Keypair generation
  - Transaction building
  - Payment operations
  - Path payment operations
  - Horizon Server client
  - Streaming / SSE

### 4. Soroban Documentation (Optional)
- **Domain:** https://soroban.stellar.org/docs/
- **Priority:** LOW — only if smart contracts are required (not expected for payments rail)

### 5. Circle USDC on Stellar
- **Domain:** https://developers.circle.com/stablecoins/stellar
- **Priority:** HIGH — USDC is the target corridor asset
- **Sections needed:**
  - USDC asset details on Stellar (issuer address)
  - CCTP support for Stellar (verify Arbitrum → Stellar)

---

## Anchor Partner Documentation to Collect (AFTER Partner Selection)

| Anchor | Domain | Priority |
|--------|--------|---------|
| MoneyGram Access | https://access.moneygram.com/api | After selection |
| Bitso Anchor | https://developers.bitso.com/ | After selection |
| Circle (if providing anchor) | https://developers.circle.com/ | After selection |

---

## Docs Attachment Status

| Source | Attached | Notes |
|--------|----------|-------|
| Stellar Developers Hub | No | Collect overview sections |
| SEP-0001 | No | stellar.toml spec |
| SEP-0010 | No | Authentication — CRITICAL |
| SEP-0024 | No | Interactive anchor — CRITICAL |
| SEP-0031 | No | Cross-border payments |
| stellar-sdk JS reference | No | CRITICAL |
| Circle USDC on Stellar | No | Partially known |
| Anchor-specific docs | No | Partner not yet selected |
