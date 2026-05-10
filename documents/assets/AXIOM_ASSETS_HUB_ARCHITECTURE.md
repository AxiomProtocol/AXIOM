# Axiom Assets Hub Architecture

**Document:** `documents/assets/AXIOM_ASSETS_HUB_ARCHITECTURE.md`  
**Status:** Active public-hub architecture reference  
**Route:** `/assets`  
**Implementation:** `lib/assets/hub.ts`, `components/assets/AssetsHubComponents.tsx`, `pages/assets/index.tsx`

---

## Purpose

The Axiom Assets Hub is the active public integration layer for the protocol's
starting asset universe. It gives users one clear place to understand:

- what assets are live
- what assets are external and read-only
- what assets are paused, inactive, or draft
- what asset names require later classification
- where portfolio, commodity, reserve, and governance surfaces connect

The hub reflects actual protocol status. It is not a roadmap page and does not
turn investigatory or inactive assets into live products.

---

## Official Starting Set

### Internal live core

| Symbol | Name | Role |
|---|---|---|
| AXUSD | Axiom USD | Stable settlement and unit-of-account layer |
| AXAU | Axiom Gold Reserve | Reserve framework; gold is the current live reserve module |
| AXM | Axiom Protocol Token | Governance and protocol coordination |
| SEED / veAXM | SEED / vote-escrowed AXM | Participation lockup and governance-alignment layer |

### External supported layer

| Symbol | Name | Role |
|---|---|---|
| KAG | Kinesis Silver | External supported silver asset; read-only Axiom support |

### Paused / inactive / draft

| Symbol | Name | Status |
|---|---|---|
| LAND | LAND reserve sleeve | `DEPLOYED_INACTIVE`; not active reserve backing |
| AXAG | Axiom Silver Reserve | `NOT_LIVE_NOT_ISSUED`; no token exists |

### Investigate later

| Name | Status |
|---|---|
| AxiomParticipation | Unknown / needs review |
| AxiomFounderBadge | Unknown / needs review |
| AxiomLandReceipt | Unknown / needs review |

These investigatory assets are not part of the active integration layer and must
not be treated as live until classified.

---

## Separation Model

The hub deliberately separates assets into four buckets:

1. **Internal live core** - Axiom-issued or Axiom-core live assets.
2. **External supported layer** - External assets Axiom supports read-only.
3. **Paused / inactive / draft reserve expansion** - Known assets or reserve
   sleeves that are not active.
4. **Investigate later** - Contract names found in repo surfaces that require
   review before classification.

This separation prevents inactive reserve sleeves and utility/NFT contract names
from being mistaken for live supported assets.

---

## Data Sources / Registries Used

The hub is a read-only aggregation layer. It does not replace any registry.

| Source | Use |
|---|---|
| `lib/commodities/registry.ts` | AXAU, KAG, AXAG commodity status and issuer/chain truth |
| `lib/commodities/disclosures.ts` | Canonical AXAU, KAG, AXAG disclosure language |
| `lib/axau/spec.ts` | AXAU reserve-layer structure, including planned/inactive LAND context |
| `shared/contracts.ts` | AXM and SEED / veAXM contract truth references |
| `lib/portfolio/realAssetsPortfolio.ts` | Portfolio linkage for AXUSD, AXAU, KAG |
| `lib/assets/admissions.ts` | Supported-assets admissions compatibility and AXAG guardrails |
| `lib/capinfra/assetRegistry.ts` | Reviewed as internal/operator registry; not imported into public hub because it is DB-backed and mutating |

The cap-infra asset registry remains an operator/capital-infrastructure service.
The public hub does not call it because that would add runtime DB dependency and
could blur public product status with operator collateral classification.

---

## Aggregation Model

`lib/assets/hub.ts` exports normalized entries with:

- `name`
- `symbol`
- `category`
- `issuer`
- `chain`
- `productStatus`
- `axiomIssued`
- `axiomCustodies`
- `lifecycleTruth`
- `description`
- `links`
- `disclosureNotes`
- `maturityLabel`
- `riskLabel`
- `role`
- `productTruthStatement`
- `sourceRefs`

The hub also exports:

- `listAxiomAssets()`
- `listActiveStartingAssets()`
- `getAxiomAssetsHubSections()`
- `getAxiomAssetBySymbol(symbol)`
- `AXIOM_ASSET_SYSTEM_MAP`
- `AXIOM_ASSETS_HUB_DISCLOSURES`

This keeps future extension simple: new official assets can be added by first
updating the source registry/framework that owns the truth, then adding a hub
entry only after the source status is clear.

---

## Disclosure Rules

The `/assets` page uses the following canonical truth language:

- KAG is issued by KMS Labs within the Kinesis ecosystem.
- Axiom supports KAG as an external commodity asset.
- Axiom does not issue KAG.
- Axiom does not issue AXAG in this phase.
- Axiom does not directly custody the underlying silver.
- Any redemption rights depend on KMS Labs / Kinesis terms.
- AXAG is not live and is not issued.
- LAND is deployed inactive and not active reserve backing.
- AXAU is the reserve framework. Gold is the current live reserve module.

External support must always be described as read-only unless a separate source
of truth explicitly authorizes a different product state.

---

## Future Extension Pattern

To add a future asset to the hub:

1. Classify it in the owning registry or admissions framework.
2. Confirm whether it is internal issued, external supported, inactive/draft, or
   investigatory.
3. File disclosure language before adding public copy.
4. Add a normalized entry in `lib/assets/hub.ts`.
5. Link only to routes that already exist and match the asset's status.
6. Run build and safety checks.

Do not add a hub entry as a substitute for registry admission. The hub is a
presentation and integration layer, not an approval mechanism.

---

## Deliberately Excluded From the Active Layer

The following are deliberately excluded from active status:

- AXAG issuance or activation
- LAND activation as reserve backing
- banking rails
- deposits, withdrawals, swaps, lending, or custody actions created by the hub
- unclassified NFT/utility contracts as live assets
- future external assets outside the official starting set
- operator-only pages such as `/operator/assets/admissions` as public navigation

Existing public routes that are outside the starting set remain governed by
their own source-of-truth modules. The hub does not expand the official starting
set to include them.

---

*Axiom Protocol - Axiom Assets Hub Architecture*
