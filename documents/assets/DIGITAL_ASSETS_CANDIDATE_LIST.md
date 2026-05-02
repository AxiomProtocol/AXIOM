# Axiom Digital Assets Candidate List

Document class: Working Candidate List
Status: Active — seeded with initial candidate buckets
Version: 1.0
Effective: 2026-05-02
Framework: `documents/assets/DIGITAL_ASSETS_ADMISSION_FRAMEWORK.md`
Implementation: `lib/assets/registry.ts`

---

## Status Notice

This list seeds the read-only Digital Assets registry. Inclusion in any tier of this list is documentary — public surfaces are activated only for assets at READY NOW status that have been merged into `lib/assets/registry.ts` and have a service module and disclosure surface deployed.

Truth statements preserved:
- AXUSD = Axiom-issued stable asset layer
- AXAU = Axiom reserve framework with gold as live module
- KAG = external supported silver asset
- AXAG = not live and is not issued

---

## How to Read This List

For each candidate the table records:

- **Asset name** and **Symbol**
- **Category** — `DIGITAL_COMMODITY`, `RESERVE_GRADE_STABLE`, `STRATEGIC_CRYPTO`, `TOKENIZED_RWA`, `AXIOM_ISSUED`
- **Issuer** — legal entity that issues the asset
- **Chain** — primary chain for the read-only integration
- **Contract confirmed?** — Yes / Pending / No
- **Market data source available?** — Chainlink / CoinGecko / CoinMarketCap / None
- **Custody/redeemability clarity?** — Clear / Conditional / Opaque / None
- **Read-only integration friction** — Low / Medium / High
- **Recommended status** — READY NOW / NEEDS DILIGENCE / OUT OF SCOPE

---

## Bucket A — Digital Commodities

Assets representing physical commodities (precious metals, etc.) tokenized for on-chain holding. Pattern reference: KAG.

| Asset | Symbol | Issuer | Chain | Contract Confirmed? | Market Data | Custody/Redemption | Friction | Recommended |
| ----- | ------ | ------ | ----- | :-----------------: | ----------- | ------------------ | :------: | :---------: |
| Kinesis Silver (LIVE) | KAG | KMS Labs AG | Ethereum mainnet | Yes — `0x56Ba8B58...41B8e` | CoinGecko (kinesis-silver) | Conditional — KMS Labs platform | Low | **READY NOW** (live) |
| Paxos Gold | PAXG | Paxos Trust Company | Arbitrum One | Yes — `0xfEb4DfC8...28429` | Chainlink XAU/USD + CoinGecko | Clear — Brink's London + monthly attestation | Low | **READY NOW** |
| Kinesis Gold | KAU | KMS Labs AG | Ethereum mainnet | Pending direct verification | CoinGecko (kinesis-gold) | Conditional — KMS Labs platform (same as KAG) | Low | **NEEDS DILIGENCE** — promotes to READY NOW once KIN-style address verification closes |
| Tether Gold | XAUT | TG Commodities Limited | Ethereum mainnet | Yes (public) | CoinGecko (tether-gold) | Conditional — Tether-affiliated custody, attestation cadence weaker than Paxos | Medium | **NEEDS DILIGENCE** — issuer transparency review (parallel to USDT review) |
| Cache Gold | CGT | Cache | Ethereum mainnet | Yes (public) | CoinGecko (cache-gold) | Opaque to weak — niche issuer; redemption documented but limited | Medium | **NEEDS DILIGENCE** — issuer prudential review |
| AXAG (Axiom Silver) | AXAG | Axiom Protocol (would-be) | N/A — not live | No — no contract | None — instrument not live | None — not live | N/A | **OUT OF SCOPE** — not live and not issued |
| Synthetic gold tokens (sXAU, mXAU, etc.) | various | Synthetic protocols | various | various | various | Synthetic — no physical backing | High | **OUT OF SCOPE** — synthetic, fails Section 9 |

---

## Bucket B — Reserve-Grade Stable Assets

Stable assets backed by reserves (cash, US Treasuries, or equivalent collateral) and recognized for portfolio visibility. Note: AXUSD is the Axiom-issued stable; entries here are external references only.

| Asset | Symbol | Issuer | Chain | Contract Confirmed? | Market Data | Custody/Redemption | Friction | Recommended |
| ----- | ------ | ------ | ----- | :-----------------: | ----------- | ------------------ | :------: | :---------: |
| USD Coin (native Arbitrum) | USDC | Circle Internet Financial | Arbitrum One | Yes — `0xaf88d065...e5831` | Chainlink USDC/USD + CoinGecko | Clear — BNY Mellon + monthly Deloitte attestation | Low | **READY NOW** |
| Dai Stablecoin | DAI | Sky Protocol (formerly MakerDAO) | Arbitrum One | Yes — `0xDA10009c...000da1` | Chainlink DAI/USD + CoinGecko | Conditional — on-chain collateral, governance redemption | Medium | **NEEDS DILIGENCE** — decentralized-issuer disclosure pattern |
| Tether USD | USDT | Tether Operations Limited | Arbitrum One | Yes — `0xFd086bC7...FCbb9` | Chainlink USDT/USD + CoinGecko | Conditional — quarterly BDO attestation | Medium | **NEEDS DILIGENCE** — attestation cadence and disclosure framing |
| First Digital USD | FDUSD | First Digital Trust | Ethereum mainnet | Yes (public) | CoinGecko (first-digital-usd) | Conditional — Hong Kong trust custodian | Medium | **NEEDS DILIGENCE** — issuer prudential review for non-US framework |
| PayPal USD | PYUSD | Paxos Trust Company | Ethereum + Solana | Yes (public) | CoinGecko (paypal-usd) | Clear — Paxos-issued under NYDFS | Low | **READY NOW** (after Arbitrum availability confirmed) |
| Tokenized US Treasury bills (BUIDL, OUSG, USDM, etc.) | various | BlackRock/Securitize, Ondo, Mountain | various | Yes (public) | varies | Conditional — securities classification, qualified-investor restrictions | High | **NEEDS DILIGENCE** — securities classification review; not for retail surface |
| Algorithmic stables without backing reserve (UST historical, etc.) | various | various | various | varies | varies | None — algorithmic | High | **OUT OF SCOPE** — fails reserve-grade requirement |

---

## Bucket C — Strategic Crypto Assets

Major crypto assets with verified custody/wrapper provenance, suitable for portfolio visibility and disclosure.

| Asset | Symbol | Issuer | Chain | Contract Confirmed? | Market Data | Custody/Redemption | Friction | Recommended |
| ----- | ------ | ------ | ----- | :-----------------: | ----------- | ------------------ | :------: | :---------: |
| Wrapped Bitcoin | WBTC | BitGo Trust Company | Arbitrum One | Yes — `0x2f2a2543...C5B0f` | Chainlink BTC/USD + CoinGecko | Conditional — BitGo PoR + merchant network | Low | **READY NOW** |
| Native Bitcoin (read via address watch) | BTC | N/A — protocol-native | Bitcoin mainnet | N/A — UTXO model | Chainlink BTC/USD + CoinGecko | N/A — self-custody model | Low | **READY NOW** (Phase A: address-watch only, no wrapping) |
| Ethereum (native) | ETH | N/A — protocol-native | Ethereum + Arbitrum One | N/A | Chainlink ETH/USD + CoinGecko | N/A — self-custody | Low | **READY NOW** (Phase A: address-watch and Arbitrum balance reads) |
| Wrapped Lido Staked Ether | wstETH | Lido DAO | Arbitrum One | Yes — `0x5979D7b5...A4800529` | Chainlink wstETH/USD + CoinGecko | Conditional — non-custodial wrapper, Lido withdrawal queue | Medium | **NEEDS DILIGENCE** — yield-bearing wrapper disclosure |
| Rocket Pool Staked ETH | rETH | Rocket Pool DAO | Arbitrum One | Yes (public) | Chainlink rETH/USD + CoinGecko | Conditional — non-custodial protocol | Medium | **NEEDS DILIGENCE** — yield-bearing wrapper disclosure |
| Coinbase Staked ETH | cbETH | Coinbase Inc. | Arbitrum One | Yes (public) | Chainlink cbETH/USD + CoinGecko | Conditional — Coinbase custodial staking | Medium | **NEEDS DILIGENCE** — yield-bearing wrapper disclosure |
| ARB | ARB | Arbitrum Foundation | Arbitrum One | Yes (public) | Chainlink ARB/USD + CoinGecko | N/A — governance token, no underlying reserve | Low | **NEEDS DILIGENCE** — governance-token disclosure pattern |
| Privacy coins (XMR, ZEC) | XMR / ZEC | various | non-EVM | N/A | various | N/A | High | **OUT OF SCOPE** — sanctions and AML risk |
| Memecoins | various | varies | various | varies | varies | N/A | High | **OUT OF SCOPE** — institutional fit |

---

## Bucket D — Tokenized RWAs (Real-World Assets)

Tokenized representations of real-world securities, treasuries, real estate, or other off-chain assets. All entries here begin at NEEDS DILIGENCE or OUT OF SCOPE pending securities-classification review.

| Asset | Symbol | Issuer | Chain | Contract Confirmed? | Market Data | Custody/Redemption | Friction | Recommended |
| ----- | ------ | ------ | ----- | :-----------------: | ----------- | ------------------ | :------: | :---------: |
| BlackRock USD Institutional Digital Liquidity Fund | BUIDL | BlackRock / Securitize | Ethereum + multi-chain | Yes (public) | Issuer-published NAV | Conditional — qualified-purchaser restrictions | High | **NEEDS DILIGENCE** — securities classification |
| Ondo Short-Term US Government Bond Fund | OUSG | Ondo Finance | Ethereum mainnet | Yes (public) | Issuer-published NAV | Conditional — accredited-investor restrictions | High | **NEEDS DILIGENCE** — securities classification |
| Mountain Protocol USDM | USDM | Mountain Protocol | Ethereum mainnet | Yes (public) | CoinGecko | Conditional — Bermuda DABA framework | Medium | **NEEDS DILIGENCE** — securities and stablecoin hybrid |
| Tokenized real estate fractional shares (various) | various | varies | various | varies | typically none | Opaque | High | **OUT OF SCOPE** — no public market data; custody-heavy |

---

## Bucket E — Axiom-Issued Assets (registry truth alignment only)

These are recorded in the registry to preserve truth-statement alignment, not for admission under this Framework.

| Asset | Symbol | Status |
| ----- | ------ | ------ |
| Axiom Silver | AXAG | **OUT OF SCOPE** — not live and is not issued. Recorded so the registry truth matches the public truth. Silver sleeve inside AXAU (Option B) is the active path. |

---

## Recommended First 3–5 Low-Friction Additions After KAG

Ranked by readiness score (lowest friction first). All five satisfy all seven admission criteria. None require custody, issuance, or write paths.

| Rank | Asset | Total Score | Risk Label | Why It Goes First |
| :--: | ----- | :---------: | ---------- | ----------------- |
| 1 | **PAXG** | 0 | TIER_1_VERIFIED | NYDFS-regulated; already used internally as the AXAU gold reserve; treating it as a recognized external commodity asset is documentary, not a new integration |
| 2 | **USDC** | 0 | TIER_1_VERIFIED | Native Arbitrum One contract; multi-jurisdiction prudential framework; Chainlink + CoinGecko pricing; clean attestation cadence — pairs naturally with AXUSD as the external stable reference |
| 3 | **WBTC** | 2 | TIER_1_VERIFIED | BitGo Trust Company custodian, continuous proof-of-reserves; Chainlink BTC/USD; verified Arbitrum contract — opens BTC visibility via wrapped representation |
| 4 | **KAU** | 6 | TIER_2_REVIEWED | Symmetric to KAG (same issuer, same regulatory framework, same disclosure pattern). Enters registry at NEEDS DILIGENCE while the KMS Labs developer documentation address is independently verified; promotes to READY NOW automatically once verified — direct replication of the KAG admission |
| 5 | **PYUSD** | 0–2 | TIER_1_VERIFIED | Paxos-issued under NYDFS, same regulatory standing as PAXG. Read-only integration trivial once Arbitrum One availability is confirmed |

These five expand Axiom's read-only asset surface from 1 (KAG) to 6 covering: gold (PAXG, KAU), silver (KAG), regulated stables (USDC, PYUSD), and BTC exposure (WBTC) — a credible institutional starter set.

---

## Assets Explicitly Rejected for Now

Recorded so future review starts from a known position.

| Asset / Class | Rejection Reason |
| ------------- | ---------------- |
| **AXAG** | Not live and is not issued — preserves truth statement |
| **Privacy coins (XMR, ZEC)** | Sanctions and AML risk — Section 9 absolute disqualifier |
| **Memecoins (any)** | Out of institutional fit |
| **Algorithmic stables without reserves** | Fails reserve-grade requirement |
| **Synthetic commodity tokens (sXAU, mXAU, etc.)** | Synthetic / derivative without physical backing |
| **Tokenized real-estate fractional shares (various)** | No public market data; custody-heavy; out of read-only scope |
| **Tokenized RWA equity products** | Securities classification; not appropriate for read-only retail surface |
| **Any Axiom-branded wrapper not yet live** | Conflicts with truth statement; OUT OF SCOPE by definition |
| **Bridged USDC.e on Arbitrum** | Superseded by native Arbitrum USDC; bridged asset adds disclosure complexity without benefit |

---

*End of Candidate List v1.0 — Maintained alongside `lib/assets/registry.ts`*
