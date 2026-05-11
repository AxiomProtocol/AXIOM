# Axiom Protocol — Avalanche Fuji Environment Variables

**Network:** Avalanche Fuji Testnet (chainId 43113)  
**Created:** 2026-05-11

---

## Required for Deployment

| Variable | Description | Where to get |
|---|---|---|
| `AVALANCHE_RPC_URL` | Fuji or mainnet C-Chain RPC endpoint | [Alchemy](https://dashboard.alchemy.com), [Infura](https://infura.io), or public endpoint |
| `AVALANCHE_FUJI_RPC_URL` | Fuji-specific RPC (overrides `AVALANCHE_RPC_URL` for testnet) | Optional override |
| `DEPLOYER_PK` | 0x-prefixed private key for the deployer wallet | Local keystore / Replit secret |
| `SNOWTRACE_API_KEY` | Routescan/Snowtrace API key for contract verification | [routescan.io](https://routescan.io) |

## Required for Capinfra LIVE Mode

| Variable | Description |
|---|---|
| `AVALANCHE_ADAPTER_MODE` | `DRY_RUN` (default), `LIVE`, or `DISABLED` |
| `AVALANCHE_RPC_URL` | C-Chain RPC endpoint (public or private) |
| `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` | Comma-separated asset symbols enabled for LIVE dispatch (e.g. `AXUSD,AXAU`) |
| `DEPLOYER_PRIVATE_KEY` | Deployer/relayer private key (same as main deployment key) |

## GitHub Actions Secrets

These secrets must be configured in the `AxiomProtocol/AXIOM` repository for the
`avalanche-integration` CI workflow:

| Secret Name | Purpose |
|---|---|
| `AVALANCHE_RPC_URL` | Fork and compile RPC endpoint |
| `SNOWTRACE_API_KEY` | Contract verification (optional for CI) |
| `DEPLOYER_PK` | Deploy script signing (only if using the deploy job) |

### Adding Secrets

1. Go to **Settings → Secrets and variables → Actions** in the GitHub repository.
2. Click **New repository secret**.
3. Add each secret listed above.

## Public Fuji Endpoints (No Key Required)

```
https://api.avax-test.network/ext/bc/C/rpc
```

These rate-limit heavily. Use a private RPC for CI fork tests.

## Useful Fuji Links

| Resource | URL |
|---|---|
| Fuji Faucet | https://faucet.avax.network |
| Testnet Explorer | https://testnet.snowtrace.io |
| Fuji C-Chain RPC | https://api.avax-test.network/ext/bc/C/rpc |
