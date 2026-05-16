# Axiom Protocol — Polygon PoS Phase 2 Architecture
**Generated:** May 16, 2026
**Status:** Implementation complete — Amoy testnet deployment pending
**Operator Dashboard:** `/operator/chains/polygon-phase2`

---

## Strategic Role

Polygon PoS serves as Axiom Protocol's **payments and enterprise settlement layer**.

| Chain | Role |
|---|---|
| Arbitrum One | Core execution — all live contracts, AXUSD canonical settlement |
| Avalanche C-Chain | Capital zone — ERC-3643 AXUSD live (May 2026) |
| **Polygon PoS** | **Payments / enterprise settlement / treasury routing** |
| Sui | Community distribution (Move contracts, not yet on mainnet) |

---

## What Is Built

### Smart Contracts (`contracts/polygon/`)

8-contract ERC-3643 suite — identical audit hardening to the Avalanche mainnet deployment:

| Contract | File | Purpose |
|---|---|---|
| AxiomStable3643 | `AxiomStable3643.sol` | ERC-3643 AXUSD stablecoin on Polygon |
| CountryAllowModule | `CountryAllowModule.sol` | Geo-fencing compliance module |
| TransferLimitModule | `TransferLimitModule.sol` | Per-wallet daily velocity limits |
| AbstractModule | `AbstractModule.sol` | Base module (Ownable, plug-and-play) |
| IIdentityRegistry | `interfaces/IIdentityRegistry.sol` | Identity registry interface |
| IModularCompliance | `interfaces/IModularCompliance.sol` | Compliance engine interface |
| IModule | `interfaces/IModule.sol` | ERC-3643 module interface |

T-REX official contracts (IdentityRegistryStorage, TrustedIssuersRegistry, ClaimTopicsRegistry, IdentityRegistry, ModularCompliance) are loaded from `@tokenysolutions/t-rex` at deploy time.

**Audit hardening inherited from Avalanche:**
- A1/A2: `nonReentrant` on `forcedTransfer()` and `recoveryAddress()`
- A3: Constructor grants only `DEFAULT_ADMIN_ROLE` — no operational roles at deploy
- A5: `CountryAllowModule.allowAll` operator-controlled (true for testnet, false recommended for mainnet)
- A6: Module ownership should be transferred to multisig post-deploy

---

### Hardhat Workspace (`hardhat-polygon/`)

Isolated ESM Hardhat 3 workspace — mirrors `hardhat-avalanche/`.

| File | Purpose |
|---|---|
| `hardhat.config.mts` | Network config (hardhat, polygonAmoy, polygon) |
| `package.json` | ESM package with T-REX + OpenZeppelin dependencies |

Networks configured:
- `hardhat` — in-process EDR simulation (chainId 80002)
- `polygonAmoy` — Polygon Amoy testnet (chainId 80002)
- `polygon` — Polygon PoS mainnet (chainId 137)

Verification configured for Polygonscan (Amoy + mainnet).

---

### Deploy Scripts (`scripts/deploy/polygon/`)

| Script | Purpose |
|---|---|
| `deploy-amoy.mts` | Amoy testnet deploy (requires `POLYGON_AMOY_REAL_DEPLOY=true`) |
| `deploy-mainnet.mts` | Polygon mainnet deploy (requires `POLYGON_MAINNET_REAL_DEPLOY=true`) |

Both scripts:
1. Deploy all 8 contracts in sequence
2. Wire contracts post-deploy (init, bind, addModule, setAllowAll, addAgent, registerIdentity)
3. Save manifest to `deployments/polygon/`
4. Update `shared/contracts-polygon.ts` with deployed addresses

Safety gates (mainnet):
- Chain ID verification (must be 137)
- `MULTICHAIN_ENABLED=true` required
- `CHAIN_POLYGON_ENABLED=true` required
- Minimum 5 POL balance required

---

### Contract Address Registry (`shared/contracts-polygon.ts`)

Typed address registry for all Polygon contract addresses. Pattern mirrors `shared/contracts-avalanche.ts`.

```typescript
import { POLYGON_CONTRACTS, AMOY_CONTRACTS } from 'shared/contracts-polygon';
```

Both `POLYGON_CONTRACTS` and `AMOY_CONTRACTS` are empty until their respective deploy scripts run.

---

### Identity Bridge (`lib/multichain/adapters/PolygonIdentityAdapter.ts`)

Concrete implementation of `PolygonIdentityAdapterInterface` using `onchainid_mirror` mode.

**Bridge mode: `onchainid_mirror`**
- No ZK proof generation (avoids Polygon ID SDK dependency at Phase 2 launch)
- Arbitrum ERC-3643 identity registry is the canonical source of truth
- Polygon side maintains a lightweight allowlist entry derived from the Arbitrum claim
- Revocations on Arbitrum propagate to Polygon via `revokeCredential()`

Key methods:
```typescript
polygonIdentityAdapter.bridgeCredential(walletAddress)   // Mirror Arbitrum → Polygon
polygonIdentityAdapter.getBridgeState(walletAddress)      // Check sync status
polygonIdentityAdapter.revokeCredential(walletAddress)    // Propagate revocation
polygonIdentityAdapter.verifyCredential(walletAddress)    // Check credential validity
polygonIdentityAdapter.syncAll()                          // Reconcile all wallets
```

**Note:** The current adapter uses an in-memory credential store. For production, replace with a database-backed store (use the `expansion_identity_bridges` table in `cap_assets` schema area, or add a `polygon_identity_credentials` table).

---

### Polygon Proof Toolchain (`lib/polygon/`)

| File | Purpose |
|---|---|
| `chainHealth.ts` | RPC connectivity, block freshness, contract deployment status |
| `proofs/buildMerkleTree.ts` | keccak256 Merkle tree builder (OZ-compatible) |
| `proofs/verifyProof.ts` | Off-chain proof verification before on-chain submission |
| `index.ts` | Library entry point |

The Merkle tree uses double-keccak256 hashing (leaf = keccak256(keccak256(encodedLeaf))) compatible with OpenZeppelin's `MerkleProof.verify()`.

---

### API Endpoints (`pages/api/polygon/`)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/polygon/status` | Integration phase, flags, deployment status |
| GET | `/api/polygon/chain-health` | RPC connectivity, block number, contract status |
| GET | `/api/polygon/contracts` | All deployed contract addresses (mainnet + Amoy) |
| GET | `/api/polygon/identity/[wallet]` | Credential bridge state for a wallet |
| POST | `/api/polygon/identity/bridge` | Bridge Arbitrum credential to Polygon |
| POST | `/api/polygon/proofs/verify` | Off-chain Merkle proof verification |

---

### Operator Dashboard (`pages/operator/chains/polygon-phase2.tsx`)

Full-page operator console at `/operator/chains/polygon-phase2` showing:
- Integration phase and next action
- Feature flag and RPC status
- Live chain health (block number, age, chain ID)
- Contract deployment status for both mainnet and Amoy
- Interactive deploy runbook
- API endpoint reference table

---

## Chain Feature Flags

| Env Var | Value | Effect |
|---|---|---|
| `MULTICHAIN_ENABLED` | `true` | Global gate — must be true for any expansion chain |
| `CHAIN_POLYGON_ENABLED` | `true` | Enables Polygon RPC, API routes, and identity bridge |
| `POLYGON_RPC_URL` | Polygon RPC URL | Override default public RPC (`https://polygon-rpc.com`) |
| `POLYGON_AMOY_RPC_URL` | Amoy RPC URL | Override Amoy testnet RPC |
| `POLYGONSCAN_API_KEY` | API key | Required for contract verification on Polygonscan |

---

## Chain Registry Status

Updated in `lib/multichain/chainRegistry.ts`:
- Status changed from `researching` → `configured`
- `sourceFilesStatus`: `missing` → `attached`
- `sdkStatus`: `not_reviewed` → `reviewed`
- `docsStatus`: `missing` → `attached`
- `implementationReady`: `false` → `true`

---

## Deployment Sequence

### Phase 2A — Amoy Testnet

```bash
# 1. Get Amoy test POL
# Faucet: https://faucet.polygon.technology

# 2. Install dependencies
npm run install:polygon

# 3. Compile contracts
npm run compile:polygon

# 4. Deploy (dry-run first)
npm run deploy:polygon:amoy

# 5. Deploy (real broadcast)
export MULTICHAIN_ENABLED=true
export CHAIN_POLYGON_ENABLED=true
POLYGON_AMOY_REAL_DEPLOY=true npm run deploy:polygon:amoy

# 6. Verify on Amoy Polygonscan
# https://amoy.polygonscan.com
```

### Phase 2B — Polygon Mainnet

```bash
# 1. Ensure wallet has >= 5 POL

# 2. Set production env vars
export POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/<ALCHEMY_KEY>
export MULTICHAIN_ENABLED=true
export CHAIN_POLYGON_ENABLED=true

# 3. Deploy (dry-run first)
npm run deploy:polygon:mainnet

# 4. Deploy (real broadcast)
POLYGON_MAINNET_REAL_DEPLOY=true npm run deploy:polygon:mainnet

# 5. Post-deploy
# - Verify all 8 contracts on https://polygonscan.com
# - Update cap_assets DB with mainnet AXUSD address
# - Transfer admin roles to multisig
# - Set country allowlist (disable allowAll for mainnet)
```

---

## Multi-Chain Isolation Guarantee

Polygon operations cannot affect Arbitrum or Avalanche state unless explicitly synced:

- Polygon contracts are standalone ERC-3643 deployments with no cross-chain calls
- The identity bridge is one-directional: Arbitrum → Polygon (reads only)
- `CHAIN_POLYGON_ENABLED` is a hard gate — all Polygon API routes check `isChainEnabled('polygon')` before proceeding
- Feature flag `MULTICHAIN_ENABLED` must also be set to true
- Polygon chainId checks in deploy scripts (137 / 80002) prevent accidental deployment to wrong network

---

## Monitoring and Alerting

`GET /api/polygon/chain-health` returns:
- `rpcReachable` — boolean (HTTP 503 if false)
- `blockAgeSeconds` — seconds since last block (alert if > 30s on mainnet)
- `chainId` — verify matches expected (137 mainnet, 80002 Amoy)
- `mainnetContracts.deployed` — boolean — alert if false after mainnet deploy
- `errors[]` — array of error strings — alert on any non-empty errors

Recommended monitoring cadence: every 60 seconds via cron or external uptime service.

---

## Dependency Map

```
Polygon PoS
  ├── Arbitrum One (identity source — read only, no on-chain dependency)
  ├── @tokenysolutions/t-rex (T-REX official registry contracts)
  ├── @openzeppelin/contracts (ERC20, AccessControl, Pausable, ReentrancyGuard)
  ├── Alchemy API (Polygon RPC via polygon-mainnet network slug)
  └── Polygonscan API (contract verification only)
```

No dependency on Unit Banking. No dependency on ACH or wire rails. No dependency on Stellar or Coinbase Onramp.

---

*This document was auto-generated from the Phase 2 build on May 16, 2026.*
