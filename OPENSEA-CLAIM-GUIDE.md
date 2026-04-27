# Axiom NFT — OpenSea Listing Guide

This guide walks the contract owner through claiming and configuring the three Axiom Protocol NFT collections on OpenSea. The collections are already deployed and verified on Arbitrum One; this is a one-time UI setup on OpenSea so the collections render correctly with banners, descriptions, royalties, and creator controls.

---

## Prerequisites

Before starting, confirm:

1. **Wallet**: You are connecting with the deployer wallet `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (this wallet holds `DEFAULT_ADMIN_ROLE` on all three contracts and is the one OpenSea will recognize as collection owner).
2. **Network**: Wallet is connected to **Arbitrum One** (chain ID 42161).
3. **Deployment**: The Axiom site is published and reachable at `https://axiom-nexus.replit.app` (the on-chain `baseMetadataURI` and `contractMetadataURI` point to this domain — OpenSea will fetch from it).
4. **Anchor mints**: Run `scripts/nft/check-and-mint-anchors.ts` once so each transferable collection has at least one minted token. OpenSea collection pages do not render until at least one token exists.

---

## Contract Addresses (Arbitrum One)

| Collection         | Address                                      | Standard            | Verified                                                                                              |
| ------------------ | -------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| Founder Badge      | `0x4A651D30097E2b7326A83CbB32c02913dB8b3572` | ERC-721 (soulbound) | [Blockscout](https://arbitrum.blockscout.com/address/0x4A651D30097E2b7326A83CbB32c02913dB8b3572#code) |
| Participation      | `0x67f8c7da647AbD50AFb1E2137553Be8c174342Ce` | ERC-1155            | [Blockscout](https://arbitrum.blockscout.com/address/0x67f8c7da647AbD50AFb1E2137553Be8c174342Ce#code) |
| Land Receipt       | `0x60f60aD6A2242Bc4Aab80233b4C25144368F88db` | ERC-1155            | [Blockscout](https://arbitrum.blockscout.com/address/0x60f60aD6A2242Bc4Aab80233b4C25144368F88db#code) |

Royalty: 7.5% (750 BPS) sent to treasury `0x3fD63728288546AC41dAe3bf25ca383061c3A929` via EIP-2981. OpenSea will read this automatically.

---

## Step 1 — Open each collection page on OpenSea

OpenSea auto-creates a collection page the first time it indexes a verified contract on a supported chain. Open the collection-level URL for each contract (this is where the **Edit collection** button lives), and the token-level URL for the anchor token (this is the fastest way to confirm OpenSea has actually indexed the contract):

| Collection         | Collection page (for claiming)                                                                  | Anchor token (for indexer check)                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Founder Badge      | <https://opensea.io/assets/arbitrum/0x4a651d30097e2b7326a83cbb32c02913db8b3572>                  | <https://opensea.io/assets/arbitrum/0x4a651d30097e2b7326a83cbb32c02913db8b3572/1>                  |
| Participation      | <https://opensea.io/assets/arbitrum/0x67f8c7da647abd50afb1e2137553be8c174342ce>                  | <https://opensea.io/assets/arbitrum/0x67f8c7da647abd50afb1e2137553be8c174342ce/1>                  |
| Land Receipt       | <https://opensea.io/assets/arbitrum/0x60f60ad6a2242bc4aab80233b4c25144368f88db>                  | (no anchor mint yet — see follow-up #379)                                                          |

If a page shows "We couldn't find that page" or an empty grid, wait 5–10 minutes after the anchor mint for OpenSea's indexer to pick up the contract, then refresh.

> **Note on production secrets**: the metadata endpoint is strict and returns 404 for any address that is not one of the three Axiom contracts. Before publishing, confirm `NFT_CONTRACT_FOUNDER`, `NFT_CONTRACT_PARTICIPATION`, and `NFT_CONTRACT_LAND` are all set in the production environment so OpenSea's indexer doesn't get a 404 for legitimate contracts.

---

## Step 2 — Connect & claim ownership

On each collection page:

1. Click **Connect wallet** (top right).
2. Choose the wallet that holds `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`.
3. Confirm the network is **Arbitrum One**.
4. OpenSea will detect that you are the contract admin (via `DEFAULT_ADMIN_ROLE` and the `contractURI()` `fee_recipient` field) and surface an **Edit collection** button.
5. Click **Edit collection** and approve the off-chain signature (no gas cost — just a wallet signature).

---

## Step 3 — Verify pre-filled fields

Once you enter the editor, OpenSea will have already populated most fields from the on-chain `contractURI()` JSON served by Axiom. Confirm the following are correct:

| Field                | Expected                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collection name      | `Axiom Founder Badge` / `Axiom Participation` / `Axiom Land Receipt`                                                                              |
| Description          | The institutional copy from `pages/api/nft/contract-metadata/[contract].ts` — already includes the Blockscout source-verification link            |
| Banner image         | Loaded from `https://axiom-nexus.replit.app/og/nft-{founder,participation,land}-collection.png` (16:9 institutional design)                        |
| Logo / featured      | Empty by default — see Step 4                                                                                                                     |
| Category             | Set to **Utility**                                                                                                                                |
| Royalties            | 7.5% to `0x3fD63728288546AC41dAe3bf25ca383061c3A929` (auto-detected from EIP-2981; do not override)                                               |
| External link        | `https://axiom-nexus.replit.app/nft`                                                                                                              |

If anything is missing, you can paste it manually in the editor.

---

## Step 4 — Upload logo & featured image

OpenSea wants three image slots that the on-chain `contractURI()` does not provide separately:

- **Logo image** — square, 350×350 minimum. Upload `public/og/nft-{name}-collection.png` cropped to a square, or generate a dedicated square logo.
- **Featured image** — 600×400. Reuse the banner cropped to the right ratio.
- **Banner image** — 1400×400. Already populated from `public/og/nft-{name}-collection.png`.

Save changes after uploading.

---

## Step 5 — Add socials & policies

Add the following links in the **Links** section of the editor:

- **Website**: `https://axiom-nexus.replit.app`
- **Discord** (optional): your server invite
- **Twitter / X** (optional): your handle

Save.

---

## Step 6 — Soulbound caveat (Founder Badge only)

The Founder Badge contract overrides `_update()` to revert on every transfer except mint:

```solidity
require(from == address(0), "AXFB: soulbound - non-transferable");
```

OpenSea will still **display** the badge and let owners list it, but any **transfer or sale will revert on-chain**, so listings cannot fill. To avoid confusion:

1. In the collection editor, set **"Sale type"** restrictions to disable secondary trading if the option appears.
2. Add a clear note at the top of the description: *"Soulbound — non-transferable. Transfer attempts will revert."*
3. The editor banner image already conveys "founder seal" visually to reinforce the non-transferable framing.

The Participation and Land Receipt collections are normal ERC-1155s and do not have this constraint.

---

## Step 7 — Verify metadata refresh

For each minted token (initially: Founder #1 and Participation #1):

1. Open the token detail page on OpenSea.
2. Click the three-dot menu → **Refresh metadata**.
3. Wait 30–60 seconds. Image, attributes, and description should populate from the Axiom metadata API.

If the image stays blank, check:

- `https://axiom-nexus.replit.app/api/nft/metadata/1?contract=<address>` returns valid JSON with an `image` field.
- The `image` URL itself is reachable (IPFS gateway or `/og/...` PNG).

---

## Step 8 — Verification badge (optional, gated)

OpenSea's blue verification checkmark requires:

- Confirmed creator email.
- Linked Twitter / Discord that match the website.
- Some minimum trading volume or unique holders (criteria vary).

Apply via **Settings → Verification** once the collection has held some real activity. Anchor mints alone will not qualify.

---

## Troubleshooting

| Symptom                                           | Likely cause                                                      | Fix                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Collection page shows raw address as the name    | OpenSea has not yet read `contractURI()`                          | Wait, then click **Refresh metadata** in the page menu                                                            |
| Banner is missing                                 | `axiom-nexus.replit.app` not deployed yet, or banner returned 404 | Publish the site, confirm `/og/nft-founder-collection.png` returns HTTP 200, then refresh                         |
| Royalties show 0%                                 | OpenSea didn't pick up EIP-2981                                   | In editor, manually re-enter 7.5% with treasury address; the on-chain value is the source of truth at fill time   |
| Token #1 shows broken image                       | Metadata route 404 or returned bad JSON                           | Curl `https://axiom-nexus.replit.app/api/nft/metadata/1?contract=<addr>` and confirm it returns OpenSea-shape JSON |
| Can't see **Edit collection** button              | Wrong wallet connected                                            | Disconnect and reconnect with `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`                                        |
| Soulbound badge showed up as listable             | Expected — frontend doesn't pre-filter                            | A buyer's purchase will revert on-chain; add the warning per Step 6                                                |

---

## What this guide does NOT change

- No changes to the deployed Solidity contracts (preserves Blockscout source verification).
- No changes to the metadata API contract (only descriptions and banner image paths).
- No changes to royalty configuration (already EIP-2981 on-chain at deploy).
- No new wallets, no new permissions — entire flow uses existing deployer wallet and Axiom production URL.

---

## Quick reference

**Run anchor mints (idempotent):**

```bash
DEPLOYER_PRIVATE_KEY=0x... ALCHEMY_API_KEY=... \
  npx ts-node scripts/nft/check-and-mint-anchors.ts
# Add --dry-run for a read-only preview.
```

**Smoke test public metadata after publish:**

```bash
curl -sS https://axiom-nexus.replit.app/api/nft/contract-metadata/0x4A651D30097E2b7326A83CbB32c02913dB8b3572 | jq
curl -sS "https://axiom-nexus.replit.app/api/nft/metadata/1?contract=0x4A651D30097E2b7326A83CbB32c02913dB8b3572" | jq
```

Both should return JSON with `name`, `description`, `image` (or `image` and `external_link` for the contract endpoint), and HTTP 200.
