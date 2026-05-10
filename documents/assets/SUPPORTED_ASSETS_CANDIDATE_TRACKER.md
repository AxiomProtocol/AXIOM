# Supported Assets Candidate Tracker

**Document:** `documents/assets/SUPPORTED_ASSETS_CANDIDATE_TRACKER.md`  
**Status:** Internal tracker — no public-support authority  
**Framework:** `documents/assets/SUPPORTED_ASSETS_ADMISSIONS_FRAMEWORK.md`  
**Implementation:** `lib/assets/admissions.ts`  

---

## Status Notice

This tracker is internal and advisory. It does not add live assets, issue
tokens, deploy contracts, activate AXAG, add banking rails, or create write
paths. No asset listed here becomes publicly supported unless that status is
already true in the relevant source-of-truth registry and launch/disclosure
requirements remain satisfied.

Current truth preserved:

- AXAU = reserve framework, gold live module
- KAG = `EXTERNAL_SUPPORTED` read-only silver asset
- AXAG = `NOT_LIVE_NOT_ISSUED`

---

## Reference Assets

| Asset name | Symbol | Category | Issuer | Chain | Contract verified | Market data source | Reserve/backing clarity | Redemption/custody clarity | Read-only integration friction | Readiness recommendation | Blocker notes |
|---|---:|---|---|---|---|---|---|---|---|---|---|
| Axiom Gold Reserve | AXAU | GOLD | Axiom Protocol | Arbitrum One | Yes | CoinGecko pax-gold / Chainlink XAU/USD | Clear for existing reserve framework | Axiom reserve/redemption terms apply | N/A — existing live reserve module | READY_NOW (reference only) | Existing AXAU truth only; no new issuance or deployment in this task |
| Kinesis Silver | KAG | SILVER | KMS Labs / Kinesis ecosystem | Ethereum mainnet | Yes | CoinGecko kinesis-silver | Clear / externally disclosed | Conditional on Kinesis terms; Axiom does not custody | Low | READY_NOW (existing external-supported reference) | Existing KAG truth only; read-only support remains unchanged |
| Axiom Silver Reserve | AXAG | SILVER | N/A — not issued | N/A | No — no contract | None | None — no reserve because no token exists | None — not live and not issued | High / blocked | OUT_OF_SCOPE | AXAG is `NOT_LIVE_NOT_ISSUED`; custody resolution and governance would be required before any future reconsideration |

---

## Future Candidate Assets

These rows are candidate/advisory records. They do not mark any asset live in
this task.

| Asset name | Symbol | Category | Issuer | Chain | Contract verified | Market data source | Reserve/backing clarity | Redemption/custody clarity | Read-only integration friction | Readiness recommendation | Blocker notes |
|---|---:|---|---|---|---|---|---|---|---|---|---|
| USD Coin | USDC | STABLE | Circle Internet Financial, LLC | Arbitrum One | Yes | CoinGecko usd-coin / Chainlink USDC/USD | Clear — reserves and attestations published by Circle | Clear, subject to Circle terms; Axiom does not redeem | Low | READY_NOW | Candidate/advisory row only; distinguish from Axiom-issued stable assets; no banking rails |
| Paxos Gold | PAXG | GOLD | Paxos Trust Company, LLC | Ethereum mainnet / Arbitrum reference | Yes | CoinGecko pax-gold / Chainlink XAU/USD | Clear — Paxos gold disclosures and attestations | Clear, subject to Paxos terms; Axiom does not redeem | Low | READY_NOW | Candidate/advisory row only; AXAU remains the Axiom-issued gold rail |
| Tether Gold | XAUT | GOLD | TG Commodities Limited | Ethereum mainnet | Yes | CoinGecko tether-gold | Conditional — gold backing disclosed; attestation cadence requires review | Conditional on Tether Gold terms | Medium | NEEDS_DILIGENCE | Issuer transparency and attestation cadence require periodic review |
| Wrapped Bitcoin | WBTC | BTC | BitGo Trust Company / WBTC merchant network | Arbitrum One | Yes | CoinGecko wrapped-bitcoin / Chainlink BTC/USD | Clear for wrapped BTC proof-of-reserves model | Conditional on BitGo / merchant-network process | Low | READY_NOW | Candidate/advisory row only; disclose wrapper, custodian, and merchant-network risk |
| Coinbase Wrapped Staked ETH | cbETH | STAKED_ETH | Coinbase, Inc. | Ethereum mainnet | Yes | CoinGecko coinbase-wrapped-staked-eth | Conditional — staked ETH wrapper with exchange-rate mechanics | Conditional on Coinbase staking and unstaking terms | Medium | NEEDS_DILIGENCE | Yield-bearing disclosure must state rewards come from Coinbase staking, not Axiom |

---

## Tracker Rules

1. Do not mark any new asset live from this tracker.
2. Do not mark any asset publicly supported unless already true in the repo's
   relevant registry and disclosure surface.
3. AXAG must remain `NOT_LIVE_NOT_ISSUED`.
4. External candidates must be read-only: no deposits, withdrawals, swaps,
   lending, custody, banking rails, or contract writes.
5. Commodity candidates continue to use the commodity admissions pipeline.

---

*Axiom Protocol — Supported Assets Candidate Tracker*
