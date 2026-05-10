# Tokenized Commodities Integration Layer

**Document:** `documents/commodities/TOKENIZED_COMMODITIES_INTEGRATION_LAYER.md`  
**Status:** Canonical reference — reflects Phase 1 live state  
**Version:** 1.0.0

---

## 1. What Is the Tokenized Commodities Integration Layer?

The Tokenized Commodities Integration Layer (TCIL) is the unified product layer
inside Axiom Protocol that provides a consistent, reusable pattern for:

- **Axiom-issued reserve modules** — commodity tokens issued by Axiom Protocol
  (e.g. AXAU, gold rail on Arbitrum One)
- **External supported commodity assets** — third-party tokenized commodities
  integrated for portfolio visibility (e.g. KAG, Kinesis Silver on Ethereum)
- **Deferred / not-issued instruments** — acknowledged candidates that are
  explicitly not live (e.g. AXAG)

The layer defines a single registry, shared status badges, shared disclosures,
a comparison module, and a canonical hub page at `/commodities`.

---

## 2. How AXAU Fits

| Property | Value |
|---|---|
| Symbol | `AXAU` |
| Name | Axiom Gold Reserve |
| Issuer | Axiom Protocol |
| Chain | Arbitrum One |
| Product status | `LIVE` |
| Axiom-issued | `true` |
| Axiom custodies underlying | `false` (reserves via PAXG + direct custodied gold) |
| Reserve model | NAVEngine-backed; gold reserves held via PAXG and direct custodied gold |
| Pricing source | CoinGecko PAXG / Chainlink XAU/USD |
| Read-only | `false` (Axiom is the issuer; mint/redeem paths exist for authorized users) |
| Detail route | `/axau` |
| Maturity label | `production` |

**Architecture notes:**

- AXAU is the reserve framework. Gold is the current live reserve module.
- NAV is published on-chain by `NAVEngine`. The authoritative on-chain value governs.
- `MintRedeemController` enforces coverage ratio before any mint or redeem.
- Additional reserve sleeves (e.g. silver, land) may be added through governance
  approval and launch-gate sign-off.
- No additional reserve sleeves are live in Phase 1.

**Source files:**
- `lib/axau/` — liquidityEngine, commodityDisclosure, spec, stabilizationReport
- `lib/services/AXAUContractService.ts` — on-chain reads
- `contracts/axau/` — AXGoldVault, NAVEngine, MintRedeemController
- `pages/axau.tsx` — AXAU detail page
- `pages/axau-disclosure.tsx` — full reserve disclosure
- `pages/api/axau/` — nav, holders, oracle-freshness, vault-buffer

---

## 3. How KAG Fits

| Property | Value |
|---|---|
| Symbol | `KAG` |
| Name | Kinesis Silver |
| Issuer | KMS Labs / Kinesis ecosystem |
| Chain | Ethereum mainnet |
| Contract | `0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e` |
| Product status | `EXTERNAL_SUPPORTED` |
| Axiom-issued | `false` |
| Axiom custodies underlying | `false` |
| Reserve model | `null` (not applicable — Axiom is not the issuer) |
| Pricing source | CoinGecko kinesis-silver (USD per gram) |
| Read-only | `true` |
| Detail route | `/commodities/kag` |
| Maturity label | `external-live` |

**Preserved truths:**
- KAG is issued by KMS Labs within the Kinesis ecosystem.
- Axiom supports KAG as an external commodity asset for portfolio visibility.
- Axiom does not issue KAG.
- Axiom does not directly custody the underlying silver.
- Any redemption rights depend on KMS Labs / Kinesis terms.
- Support is read-only: no swaps, no deposits, no withdrawals, no banking rails.
- AXAG is not live and is not issued.

**Source files:**
- `lib/commodities/kagService.ts` — price fetching, balance reads
- `pages/commodities/kag.tsx` — KAG detail page
- `pages/api/commodities/kag/status.ts` — on-chain status
- `pages/api/commodities/kag/balance.ts` — wallet balance lookup

---

## 4. AXAG Status

| Property | Value |
|---|---|
| Symbol | `AXAG` |
| Product status | `NOT_LIVE_NOT_ISSUED` |
| Axiom-issued | `false` |
| Contract address | (none — not deployed) |
| Maturity label | `not-issued` |

**Hard rule:** AXAG must remain `NOT_LIVE_NOT_ISSUED` in all registries, pages,
and API responses. No AXAG token exists on any chain. This will not change
without governance approval and a launch-gate sign-off.

**Draft reference files (informational only):**
- `contracts/axau/drafts/AXAGTokenLite3643.sol`
- `contracts/axau/drafts/AXSilverVault.sol`
- `documents/commodities/AXAG_*` — custody, RFP, and diligence documents

---

## 5. Registry — Required Fields

All commodity assets must be registered in `lib/commodities/registry.ts`.
The `CommodityAsset` interface requires the following fields:

| Field | Type | Description |
|---|---|---|
| `symbol` | `string` | Token ticker (uppercase) |
| `name` | `string` | Full human-readable name |
| `unit` | `string` | Unit description |
| `issuer` | `string` | Issuing entity name |
| `chain` | `string` | Network name |
| `contractAddress` | `string` | On-chain address or empty string |
| `category` | `CommodityCategory` | Asset class (GOLD, SILVER, etc.) |
| `productStatus` | `CommodityProductStatus` | Normalized status (see §6) |
| `axiomIssued` | `boolean` | Whether Axiom is the issuer |
| `axiomCustodies` | `boolean` | Whether Axiom custodies the underlying |
| `reserveModel` | `string \| null` | Reserve/backing description (null if external) |
| `pricingSource` | `string` | Canonical price source |
| `readOnly` | `boolean` | True for all external assets |
| `detailRoute` | `string` | Front-end page route or empty string |
| `apiRoutes` | `object` | Keyed API route paths |
| `maturityLabel` | `CommodityMaturityLabel` | Human-readable maturity |
| `riskLabel` | union | LIVE / EXTERNAL / INACTIVE / NOT_ISSUED / DEFERRED |
| `disclosureNotes` | `string[]` | Per-asset canonical disclosure strings |

---

## 6. Product Status Enum

| Status | Meaning |
|---|---|
| `LIVE` | Issued, deployed, and fully operational |
| `EXTERNAL_SUPPORTED` | Not Axiom-issued; read-only portfolio support |
| `DEPLOYED_INACTIVE` | Contracts exist; trading/issuance not yet active |
| `NOT_LIVE_NOT_ISSUED` | No contract, no token; planning/deferred only |
| `DEFERRED` | Candidate acknowledged; blocked on governance/custody |

UI display is handled by `components/commodities/CommodityStatusBadge.tsx`.

---

## 7. Pricing / Disclosure / Risk Requirements

### Pricing
- Every registry entry must have a `pricingSource` string.
- Price fetching for external assets lives in `lib/commodities/<symbol>Service.ts`.
- External prices flow through `lib/commodities/insightsService.ts` for the
  commodity insights layer and portfolio context.
- No price may be presented as a buy/sell signal. All prices are reference-only.

### Disclosures
- Shared canonical disclosures live in `lib/commodities/disclosures.ts`.
- Import from there; do not write new commodity disclosure strings inline.
- `COMMODITY_DISCLOSURES` — full list for hub and insights pages.
- `AXAU_DISCLOSURES` — minimal set for AXAU-specific pages.
- `KAG_DISCLOSURES` — minimal set for KAG-specific pages.
- `COMMODITY_PAGE_BANNER` — standard banner text for all commodity pages.

### Risk labels
- Use `CommodityStatusBadge` for all commodity status displays.
- Use `CommodityComparisonTable` for any AXAU vs KAG or multi-asset comparison.
- No financial advice, no buy/sell language, no yield claims on any commodity page.

---

## 8. Page / API / Portfolio / Insights Integration Pattern

### Pages
| Route | File | Description |
|---|---|---|
| `/commodities` | `pages/commodities/index.tsx` | Unified commodities hub |
| `/commodities/kag` | `pages/commodities/kag.tsx` | KAG external silver detail |
| `/commodities/insights` | `pages/commodities/insights.tsx` | Gold/silver spot, ratio, comparison |
| `/axau` | `pages/axau.tsx` | AXAU gold reserve detail |
| `/axau-disclosure` | `pages/axau-disclosure.tsx` | AXAU full disclosure |
| `/portfolio/real-assets` | `pages/portfolio/real-assets.tsx` | Wallet-aware commodity holdings |
| `/commodity-framework` | `pages/commodity-framework.tsx` | Governance framework for new assets |

### API Routes
| Route | Description |
|---|---|
| `GET /api/commodities` | Full commodity registry (all assets including AXAG) |
| `GET /api/commodities/kag/status` | KAG on-chain status |
| `GET /api/commodities/kag/balance` | KAG wallet balance |
| `GET /api/commodities/insights` | Commodity insights (spot, ratio, comparison) |
| `GET /api/axau/nav` | AXAU NAV and oracle state |
| `GET /api/axau/oracle-freshness` | AXAU oracle freshness check |
| `GET /api/axau/vault-buffer` | AXAU PAXG buffer state |
| `GET /api/axau/commodity-disclosure` | AXAU full disclosure JSON |

### Portfolio integration
- `lib/portfolio/realAssetsPortfolio.ts` — wallet-aware AXAU + KAG + AXUSD positions
- `pages/portfolio/real-assets.tsx` — wallet-aware portfolio view
- Both surfaces are read-only. No deposit/withdrawal paths.

### Insights integration
- `lib/commodities/insightsService.ts` — gold spot, silver spot, gold/silver ratio,
  AXAU implied USD, KAG implied USD, product maturity, portfolio context
- Feeds `/commodities/insights` and `GET /api/commodities/insights`

---

## 9. How to Add a Future External Commodity Asset

1. **Registry** — add an entry to `COMMODITY_REGISTRY` in
   `lib/commodities/registry.ts`. Required fields listed in §5.
   Set `readOnly: true`, `axiomIssued: false`, `axiomCustodies: false`.

2. **Service** — create `lib/commodities/<symbol>Service.ts` with:
   - `get<SYMBOL>UsdValue(amount)` — returns price from approved source
   - Include error handling; return structured null + error on failure.

3. **API routes** — create:
   - `pages/api/commodities/<symbol>/status.ts` — on-chain status read
   - `pages/api/commodities/<symbol>/balance.ts` — wallet balance read (optional)

4. **Page** — create `pages/commodities/<symbol>.tsx` following the KAG pattern.
   Include `CommodityStatusBadge`, `COMMODITY_PAGE_BANNER`, and per-asset
   disclosure strings from `lib/commodities/disclosures.ts`.

5. **Insights** — add the asset to `lib/commodities/insightsService.ts` if
   spot price display in the insights layer is needed.

6. **Portfolio** — add to `lib/portfolio/realAssetsPortfolio.ts` if
   wallet-aware balance tracking is needed.

7. **Documentation** — update this document and the commodity registry notes.

---

## 10. Out of Scope

The following are explicitly **out of scope** for the Tokenized Commodities
Integration Layer:

- **Banking rails** — no ACH, wire, or fiat redemption paths
- **Custody changes** — no new custodians without separate governance approval
- **New token issuance** — no new Axiom-issued tokens without governance + launch gate
- **Write paths for external assets** — KAG and any future external assets are
  read-only; no swaps, no deposits, no withdrawals
- **Financial advice** — no buy/sell recommendations, no yield claims, no
  rebalancing signals
- **AXAG activation** — AXAG remains NOT_LIVE_NOT_ISSUED; this requires a
  separate governance proposal, custody resolution, and launch gate
- **Base metals, energy, agricultural** — deferred; see COMMODITY_EXPANSION_FRAMEWORK.md

---

*Axiom Protocol — Tokenized Commodities Integration Layer — Phase 1*
