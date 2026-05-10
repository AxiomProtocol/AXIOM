# Axiom Internal Asset Tracker

Document class: Internal Asset Registry — Read-Only Tracker  
Status: Active  
Version: 1.0  
Prepared: 2026-05-10  
Source of truth: `documents/assets/INTERNAL_ASSET_DISCOVERY_REPORT.md`  
Registry files: `lib/commodities/registry.ts`, `lib/assets/registry.ts`, `lib/tokens.ts`, `shared/contracts.ts`, `src/config/activeContracts.generated.ts`

---

## Status Definitions

| Status | Meaning |
| ------ | ------- |
| `LIVE` | Issued, deployed, and fully operational |
| `DEPLOYED_INACTIVE` | Contracts exist on-chain; component or issuance not active |
| `DRAFT_ONLY` | Contract code exists in repo but has never been deployed to any network |
| `NOT_LIVE_NOT_ISSUED` | No contract, no token; architectural planning only |
| `DEPRECATED` | Superseded by newer deployment; kept for audit trail only |
| `UNKNOWN_NEEDS_REVIEW` | Referenced in codebase but deployment status not confirmed in canonical registry |

---

## Internal Asset Registry

### Asset 1 — AXUSD

| Field | Value |
| ----- | ----- |
| **Asset name** | Axiom USD |
| **Symbol** | AXUSD |
| **Category** | AXIOM_ISSUED — Reserve-Grade Stablecoin |
| **Issuer** | Axiom Protocol |
| **Axiom issues** | Yes |
| **Axiom custodies underlying** | No — USDC reserves held by Circle (BNY Mellon) |
| **Chain** | Arbitrum One (chainId 42161) |
| **Canonical contract** | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` (ERC-3643) |
| **Additional contracts** | See table below |
| **Status** | **LIVE** |
| **Notes** | Multiple contract generations; only the ERC-3643 canonical is the active production token. Deprecated versions are preserved for audit trail. |

**All AXUSD contracts:**

| Label | Address | Status |
| ----- | ------- | ------ |
| Canonical AXUSD (ERC-3643) | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | LIVE — canonical |
| Canonical PSM | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` | LIVE — 1M ceiling |
| GENIUS AXUSD (legacy) | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | DEPRECATED |
| GENIUS PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | DEPRECATED (USDC reserves valid) |
| Euler AXUSD (original) | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | DEPRECATED (Euler vault binding only) |
| Euler PSM | `0x4584888cB411E9cc88e3800BAB73A430D90d3793` | DEPRECATED |
| EulerSwap AXUSD/USDC pool | `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` | LIVE — peg stability venue |
| EulerSwap AXUSD/AXM pool | `0x981763699D269E129a08E216b1AeC7caa376A8a8` | LIVE — seeded 2026-03-28 |

**Source files:**
- `lib/tokens.ts`
- `src/config/activeContracts.generated.ts`
- `shared/contracts.ts` (AXUSD_STABLECOIN_CONTRACTS, AXUSD_GENIUS_CONTRACTS, AXUSD_INTEGRATION_CONTRACTS, EULER_SWAP)
- `contracts/axusd/CanonicalPSM.sol`
- `contracts/oracle/AXUSDPegOracleAdapter.sol`
- `server/services/oracle/axusdUsdValuation.ts`
- `pages/api/axau/*` (API routes)

---

### Asset 2 — AXAU

| Field | Value |
| ----- | ----- |
| **Asset name** | Axiom Gold Reserve |
| **Symbol** | AXAU |
| **Category** | AXIOM_ISSUED — Multi-Component Reserve Basket |
| **Issuer** | Axiom Protocol |
| **Axiom issues** | Yes |
| **Axiom custodies underlying** | No — PAXG held by Paxos/Brink's; land held by Axiom entity |
| **Chain** | Arbitrum One (chainId 42161) |
| **Canonical contract** | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` (ERC-3643) |
| **Status** | **LIVE** (gold module); **DEPLOYED_INACTIVE** (land module) |
| **Notes** | Single live reserve module: XAU (PAXG). Land module deployed but disabled. Silver draft contracts exist but not deployed. |

**AXAU contracts:**

| Contract | Address | Status |
| -------- | ------- | ------ |
| AXAUTokenLite3643 | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` | LIVE |
| CommodityRegistry | `0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa` | LIVE |
| AXGoldVault | `0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8` | LIVE |
| NAVEngine | `0x80F8634a43B26a2bd403396A42465F138aeCC519` | LIVE |
| MintRedeemController (v2) | `0x682Ed413767b6275e29fc706391474F2C5Cc1A2A` | LIVE |
| MintRedeemController (v1) | `0x036F05a3fB74d35439c074f25F691b36f5D37792` | DEPRECATED |
| AXLandVault | `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` | DEPLOYED_INACTIVE |
| LandNAVOracleMultiSig | `0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc` | DEPLOYED_INACTIVE |

**Source files:**
- `lib/commodities/registry.ts`
- `deployments/axau-arbitrum.json`
- `documents/axau/AXAU_RESERVE_FRAMEWORK_BRIEF.md`
- `contracts/axau/*.sol`
- `pages/api/axau/*`
- Operator: `pages/operator/reserve.tsx`, `pages/operator/axau-stabilization.tsx`

---

### Asset 3 — AXM

| Field | Value |
| ----- | ----- |
| **Asset name** | Axiom Governance Token |
| **Symbol** | AXM |
| **Category** | AXIOM_ISSUED — Governance / Utility Token |
| **Issuer** | Axiom Protocol |
| **Axiom issues** | Yes |
| **Axiom custodies underlying** | N/A — governance token, no reserve backing |
| **Chain** | Arbitrum One (chainId 42161) |
| **Canonical contract** | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| **Status** | **LIVE** |
| **Notes** | Used for governance voting, DePIN node purchase discounts (15%), and AXM/AXUSD EulerSwap liquidity. Minting authority held by AXM Admin Safe. |

**AXM contracts:**

| Contract | Address | Status |
| -------- | ------- | ------ |
| AXM Token | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | LIVE |
| AXM Admin Safe | `0x93696b537d814Aed5875C4490143195983AED365` | LIVE — minting authority |
| AXM EVK Vault (eAXM-1) | `0x8e28ffa89d168599156004db4f4d12c2af7c250e` | LIVE — EulerSwap pool supply vault |

**Source files:**
- `lib/tokens.ts`
- `shared/contracts.ts` (CORE_CONTRACTS.AXM_TOKEN)
- `src/config/activeContracts.generated.ts`
- `lib/config/governance-authority.ts`
- `lib/governance/service.ts`

---

### Asset 4 — SEED (veAXM)

| Field | Value |
| ----- | ----- |
| **Asset name** | SEED (Vote-Escrowed AXM) |
| **Symbol** | SEED (legacy alias: veAXM) |
| **Category** | AXIOM_ISSUED — Governance / Yield Instrument |
| **Issuer** | Axiom Protocol |
| **Axiom issues** | Yes — minted on AXM lock |
| **Axiom custodies underlying** | Yes — locked AXM held in SEED contract |
| **Chain** | Arbitrum One (chainId 42161) |
| **Canonical contract** | `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046` |
| **Status** | **LIVE** |
| **Notes** | Curve-style locking (1–4 years). SEED grants governance power, yield access, and produce/land cycle eligibility. Yield distributed in AXUSD by SEEDYieldDistributor weekly. |

**SEED contracts:**

| Contract | Address | Status |
| -------- | ------- | ------ |
| SEED contract | `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046` | LIVE |
| SEED Yield Distributor | `0x5867e1a8c77530648edF61975CBB57a8913d159F` | LIVE |
| Revenue Router | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | LIVE |

**Source files:**
- `shared/contracts.ts` (V2_SOVEREIGN_BANKING_CONTRACTS.SEED, AXUSD_INTEGRATION_CONTRACTS.SEED_YIELD_DISTRIBUTOR)
- `lib/server/v2ContractService.ts`
- `lib/governance/service.ts`

---

### Asset 5 — AXAG

| Field | Value |
| ----- | ----- |
| **Asset name** | Axiom Silver Reserve (Not Issued) |
| **Symbol** | AXAG |
| **Category** | AXIOM_ISSUED (would-be) — planned silver wrapper |
| **Issuer** | N/A — not live, not issued |
| **Axiom issues** | No |
| **Axiom custodies underlying** | No |
| **Chain** | N/A — not deployed |
| **Canonical contract** | None |
| **Status** | **NOT_LIVE_NOT_ISSUED** |
| **Notes** | Draft contracts exist for design reference only. Current design target is Path A (silver sleeve inside AXAU). Standalone AXAG token (Path B) is deferred. All gates remain open. |

**Draft contracts (not deployed):**

| File | Role |
| ---- | ---- |
| `contracts/axau/drafts/AXAGTokenLite3643.sol` | Standalone AXAG token (Path B only) |
| `contracts/axau/drafts/AXSilverVault.sol` | KAG reserve vault (Paths A and B) |
| `contracts/axau/drafts/XagPerGramOracle.sol` | Gram-price oracle wrapper |

**Source files:**
- `lib/commodities/registry.ts` (productStatus: NOT_LIVE_NOT_ISSUED)
- `lib/assets/registry.ts` (admissionStatus: OUT_OF_SCOPE)
- `contracts/axau/drafts/README.md`
- `documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md`
- `documents/commodities/AXAG_INTERNAL_AUDIT_REPORT.md`
- `documents/commodities/AXAG_REGULATORY_INTERPRETATION_MEMO.md`
- `documents/commodities/AXAG_KINESIS_GO_LIVE_PATH.md`
- `documents/commodities/AXAG_STAGE_2_DILIGENCE_PACKET.md`

---

### Asset 6 — AXAU Land Sleeve (LAND module)

| Field | Value |
| ----- | ----- |
| **Asset name** | AXAU Land Reserve Component |
| **Symbol** | LAND (component key inside AXAU; no separate token) |
| **Category** | AXIOM_ISSUED — Illiquid Reserve Module |
| **Issuer** | Axiom Protocol (as part of AXAU) |
| **Axiom issues** | Indirectly — land backing contributes to AXAU NAV |
| **Axiom custodies underlying** | Yes — titled property |
| **Chain** | Arbitrum One |
| **Canonical contract** | AXLandVault `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` |
| **Status** | **DEPLOYED_INACTIVE** |
| **Notes** | `enabled = false` in CommodityRegistry. `haircutBps = 4000`, `maxWeightBps = 1000`. No NAV ever submitted. Activation requires appraiser signers, titled property acquisition, and governor call to setEnabled. |

**Source files:**
- `deployments/axau-arbitrum.json` (componentIds.LAND, AXLandVault, LandNAVOracleMultiSig)
- `contracts/axau/AXLandVault.sol`, `LandNAVOracleMultiSig.sol`
- `documents/axau/AXAU_RESERVE_FRAMEWORK_BRIEF.md` (Section 3.2)

---

### Asset 7 — KAG (External Supported)

| Field | Value |
| ----- | ----- |
| **Asset name** | Kinesis Silver |
| **Symbol** | KAG |
| **Category** | DIGITAL_COMMODITY — External |
| **Issuer** | KMS Labs AG (Kinesis ecosystem) |
| **Axiom issues** | No |
| **Axiom custodies underlying** | No |
| **Chain** | Ethereum mainnet |
| **Contract address** | `0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e` |
| **Status** | **LIVE** (EXTERNAL_SUPPORTED, read-only) |
| **Notes** | First external commodity integrated. Reference pattern for all future external asset admissions. Read-only: no swaps, deposits, withdrawals, banking rails. |

**Source files:**
- `lib/commodities/registry.ts`, `lib/commodities/kagService.ts`
- `lib/assets/registry.ts`
- `pages/api/commodities/kag/`
- `pages/commodities/kag`

---

### Asset 8 — NFT Suite

| Asset | Standard | Contract | Status |
| ----- | -------- | -------- | ------ |
| AxiomParticipation (Protocol badges) | ERC-1155 | `contracts/nft/AxiomParticipation.sol` | **UNKNOWN_NEEDS_REVIEW** |
| AxiomFounderBadge | ERC-721 | `contracts/nft/AxiomFounderBadge.sol` | **UNKNOWN_NEEDS_REVIEW** |
| AxiomLandReceipt | ERC-1155 | `contracts/nft/AxiomLandReceipt.sol` | **UNKNOWN_NEEDS_REVIEW** |
| Loan Receipt NFT (Fix & Flip) | ERC-721 | `0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9` | **LIVE** (deployed per shared/contracts.ts) |
| DSCR Loan Receipt NFT | ERC-721 | `0x66DB145A7ac0de369da88098E8F85467cFaD7674` | **LIVE** (deployed per shared/contracts.ts) |
| Fixed Loan NFT | ERC-721 | `0x511A0cD642532585dc87e41C84f7f499a9755511` | **LIVE** (activeContracts.generated.ts) |

**Investigation needed:** Determine whether AxiomParticipation, AxiomFounderBadge, and AxiomLandReceipt
have been deployed. Deploy script exists at `scripts/nft/deploy-nft.ts` but no deployment output
file is tracked in canonical config. Check `scripts/nft/deployment-output.json` if it exists locally.

**Source files:**
- `contracts/nft/AxiomParticipation.sol`, `AxiomFounderBadge.sol`, `AxiomLandReceipt.sol`
- `scripts/nft/deploy-nft.ts`
- `lib/nft/traitEngine.ts`
- `shared/contracts.ts` (REALESTATE_LENDING_CONTRACTS)
- `src/config/activeContracts.generated.ts`

---

## Summary Table

| # | Symbol | Name | Category | Axiom Issues | Status | Contract (primary) |
|---|--------|------|----------|:------------:|--------|-------------------|
| 1 | AXUSD | Axiom USD | Stablecoin | ✓ | **LIVE** | `0xD6110F59...Ade7` |
| 2 | AXAU | Axiom Gold Reserve | Reserve basket | ✓ | **LIVE** | `0xbcCA4D93...0Bb` |
| 3 | AXM | Axiom Governance Token | Governance/Utility | ✓ | **LIVE** | `0x864F9c6f...539D` |
| 4 | SEED | Vote-Escrowed AXM | Governance/Yield | ✓ | **LIVE** | `0xdfcdc9bB...046` |
| 5 | AXAG | Axiom Silver (not issued) | — | — | **NOT_LIVE_NOT_ISSUED** | None |
| 6 | LAND | AXAU Land Module | Reserve module | ✓ (via AXAU) | **DEPLOYED_INACTIVE** | `0x66Aadce6...49cf` |
| 7 | KAG | Kinesis Silver (external) | Commodity | ✗ | **LIVE** (read-only) | `0x56Ba8B58...1B8e` |
| 8a | — | AxiomParticipation | Badge NFT | ✓ | **UNKNOWN_NEEDS_REVIEW** | draft/unconfirmed |
| 8b | — | AxiomFounderBadge | Badge NFT | ✓ | **UNKNOWN_NEEDS_REVIEW** | draft/unconfirmed |
| 8c | — | AxiomLandReceipt | Land option NFT | ✓ | **UNKNOWN_NEEDS_REVIEW** | draft/unconfirmed |
| 8d | — | Loan Receipt NFT (Fix & Flip) | Loan receipt NFT | ✓ | **LIVE** | `0x6C4181A1...999265e9` |
| 8e | — | DSCR Loan Receipt NFT | Loan receipt NFT | ✓ | **LIVE** | `0x66DB145A...D7674` |
| 8f | — | Fixed Loan NFT | Loan receipt NFT | ✓ | **LIVE** | `0x511A0cD6...5511` |

---

## Operator Page

Read-only internal operator view: `/operator/assets/internal`  
Implementation: `pages/operator/assets/internal.tsx`  
Auth: `requireOperatorCookie` — same as all other operator pages  
Content: All assets above, status badges, source-of-truth references  

---

## Maintenance Notes

- To update this tracker, edit this file and the corresponding registry entries.
- Do not promote AXAG from NOT_LIVE_NOT_ISSUED without completing all gates in `documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md`.
- Do not modify the AXUSD canonical address without a coordinated migration across all surfaces.
- NFT status (8a–8c) should be resolved by checking `scripts/nft/deployment-output.json` or on-chain.
- The LAND module can be activated only through the governor role — no code change required; it is a governance action.

---

*End of Internal Asset Tracker v1.0*
