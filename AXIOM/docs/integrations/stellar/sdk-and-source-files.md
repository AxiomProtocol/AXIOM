# Stellar — SDKs and Source Files Required

**Status:** No SDK reviewed. Source files not attached.

---

## Required SDKs

### 1. @stellar/stellar-sdk (PRIMARY)
- **Package:** `@stellar/stellar-sdk`
- **Purpose:** The official Stellar JavaScript/TypeScript SDK for all Stellar network operations
- **Priority:** CRITICAL — required for all Stellar integration
- **Review status:** Not reviewed
- **NPM:** https://www.npmjs.com/package/@stellar/stellar-sdk
- **GitHub:** https://github.com/stellar/js-stellar-sdk
- **Docs:** https://stellar.github.io/js-stellar-sdk/

**Key capabilities to verify from source:**
- Account keypair generation (`Keypair.fromSecret()`)
- Transaction building (`TransactionBuilder`)
- Payment operations (`Operation.payment()`)
- Path payment operations (`Operation.pathPaymentStrictSend()`)
- Asset definition (`new Asset('USDC', 'GA5ZSEJ...')`)
- Transaction signing and submission
- Horizon Server client (`new Horizon.Server()`)
- Streaming payments/transactions (SSE)
- SEP-0010 authentication
- SEP-0024 interactive deposit/withdrawal flow

### 2. @stellar/stellar-base
- **Package:** `@stellar/stellar-base`
- **Purpose:** Low-level XDR encoding/decoding, keypairs — included with stellar-sdk
- **Priority:** INCLUDED in stellar-sdk
- **Note:** Usually not imported directly; stellar-sdk wraps it

### 3. @stellar/anchor-tests (optional, testing only)
- **Package:** `@stellar/anchor-tests`
- **Purpose:** Validate anchor SEP compliance in testing
- **Priority:** LOW — use during anchor integration testing, not production

---

## No Hardhat / EVM Tooling Needed

Stellar is NOT EVM-compatible. None of the following apply:
- No Hardhat config
- No ethers.js
- No viem
- No Solidity contracts

The integration is purely via `@stellar/stellar-sdk` + REST API calls.

---

## Source Files Still Needed

| File / Artifact | Source | Status |
|----------------|--------|--------|
| @stellar/stellar-sdk source | npm/@stellar/stellar-sdk | Not attached |
| Stellar SEP-0024 specification | github.com/stellar/stellar-protocol | Not attached |
| Stellar SEP-0031 specification | github.com/stellar/stellar-protocol | Not attached |
| SEP-0010 authentication spec | github.com/stellar/stellar-protocol | Not attached |
| Selected anchor's stellar.toml | Anchor domain /.well-known/stellar.toml | Not attached — anchor not selected |
| Selected anchor's API docs | Anchor partner | Not attached |
| Circle Stellar USDC asset details | Circle docs | Partially known |

---

## SEP Specification Files to Collect

| SEP | Title | URL |
|-----|-------|-----|
| SEP-0001 | Stellar.toml | https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md |
| SEP-0006 | Deposit and Withdrawal | https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0006.md |
| SEP-0010 | Stellar Web Authentication | https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md |
| SEP-0024 | Interactive Anchor | https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md |
| SEP-0031 | Cross-Border Payments | https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0031.md |

---

## Once SDK Is Reviewed, Implement

1. `lib/multichain/adapters/StellarPaymentAdapter.ts` — wraps stellar-sdk for Axiom payment operations
2. `lib/services/StellarRailService.ts` — high-level Stellar payment rail (extends `SettlementRailService`)
3. `lib/services/StellarAnchorService.ts` — SEP-0024/0031 anchor integration
4. `pages/api/stellar/payment.ts` — initiate payment via Stellar rail
5. `pages/api/stellar/status.ts` — payment status tracking
6. Update `expansion_settlement_corridors` table with live Stellar corridor records
