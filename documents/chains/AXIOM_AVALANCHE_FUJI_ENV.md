# Axiom Protocol — Avalanche Fuji Environment Variables

**Network:** Avalanche Fuji Testnet (chainId 43113)  
**Updated:** 2026-05-12 (Phase 2 — 8-contract ERC-3643 deploy)

---

## Required for Phase 2 Real Deploy

| Variable | Description | Where to get |
|---|---|---|
| `AVALANCHE_DEPLOYER_PRIVATE_KEY` | 0x-prefixed Fuji-only deployer key — **separate from `DEPLOYER_PRIVATE_KEY`** | Fund via https://faucet.avax.network |
| `MULTICHAIN_ENABLED` | Must be `true` to activate the Fuji deployment shell | Set in environment |
| `CHAIN_AVALANCHE_ENABLED` | Must be `true` to activate Avalanche chain context | Set in environment |
| `AVALANCHE_PHASE2_REAL_DEPLOY` | Must be `true` to broadcast real transactions (default: dry-run) | Set when ready |
| `AVALANCHE_RPC_URL` | Fuji or mainnet C-Chain RPC endpoint | [Alchemy](https://dashboard.alchemy.com), [Infura](https://infura.io), or public fallback |
| `AVALANCHE_FUJI_RPC_URL` | Fuji-specific RPC override (takes priority over `AVALANCHE_RPC_URL`) | Optional |
| `SNOWTRACE_API_KEY` | Routescan/Snowtrace API key for post-deploy verification | [routescan.io](https://routescan.io) |

### Deploy command (real broadcast)

```bash
export AVALANCHE_DEPLOYER_PRIVATE_KEY=<funded-fuji-key>
export MULTICHAIN_ENABLED=true
export CHAIN_AVALANCHE_ENABLED=true
AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji
```

### Dry-run (safe default — no transactions broadcast)

```bash
npm run deploy:avalanche:fuji
```

---

## Required for Capinfra LIVE Mode

| Variable | Description |
|---|---|
| `AVALANCHE_ADAPTER_MODE` | `DRY_RUN` (default), `LIVE`, or `DISABLED` |
| `AVALANCHE_RPC_URL` | C-Chain RPC endpoint (public or private) |
| `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` | Comma-separated asset symbols enabled for LIVE dispatch (e.g. `AXUSD`) |
| `AVALANCHE_DEPLOYER_PRIVATE_KEY` | Deployer/relayer private key for Avalanche (separate from `DEPLOYER_PRIVATE_KEY`) |

---

## GitHub Actions Secrets

These secrets must be configured in the `AxiomProtocol/AXIOM` repository
for the `avalanche-integration` CI workflow:

| Secret Name | Purpose |
|---|---|
| `AVALANCHE_RPC_URL` | Compile and fork RPC endpoint |
| `SNOWTRACE_API_KEY` | Contract verification (optional for CI) |
| `AVALANCHE_DEPLOYER_PRIVATE_KEY` | Deploy signing key (only if the CI deploy job is enabled) |

### Adding Secrets

1. Go to **Settings → Secrets and variables → Actions** in the GitHub repository.
2. Click **New repository secret**.
3. Add each secret listed above.

---

## Public Fuji Endpoints (No Key Required)

```
https://api.avax-test.network/ext/bc/C/rpc
```

These rate-limit under load. Use a private RPC for CI fork tests and real deploys.

---

## Useful Fuji Links

| Resource | URL |
|---|---|
| Fuji Faucet | https://faucet.avax.network |
| Testnet Explorer | https://testnet.snowtrace.io |
| Fuji C-Chain RPC | https://api.avax-test.network/ext/bc/C/rpc |

---

## Security Notes

- `AVALANCHE_DEPLOYER_PRIVATE_KEY` must be a **Fuji-only** funded key.
  Never reuse a mainnet or Arbitrum deployer key for Fuji.
- `AVALANCHE_PHASE2_REAL_DEPLOY=true` is the explicit broadcast opt-in.
  Without it, all deploy scripts default to dry-run and never broadcast.
- Avalanche is disabled in the production runtime by default.
  `CHAIN_AVALANCHE_ENABLED` must be set to `true` explicitly.
