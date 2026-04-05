# Avalanche — API Surfaces

**Status:** Not yet reviewed or integrated.

---

## 1. C-Chain RPC (EVM Standard JSON-RPC)

Avalanche C-Chain is EVM-compatible. Standard Ethereum JSON-RPC applies.

### Alchemy Endpoint
```
https://avax-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}
```

**Key methods (same as all EVM chains):**
- `eth_getBalance` — AVAX balance
- `eth_call` — Read contract state
- `eth_sendRawTransaction` — Submit transactions
- `eth_getLogs` — Event log queries

**Axiom action:** Add `avax-mainnet` as a supported network in `lib/config.ts` once Avalanche integration is active.

---

## 2. P-Chain API (Subnet and Validator Management)

The P-Chain is the Platform Chain — used for subnet creation, validator management, and staking.

### Endpoint
```
https://api.avax.network/ext/bc/P
```

### Key Methods

| Method | Purpose |
|--------|---------|
| `platform.createSubnet` | Create a new subnet |
| `platform.addSubnetValidator` | Add validator to subnet |
| `platform.getSubnets` | List subnets |
| `platform.getValidatorsAt` | Get validator set at block |
| `platform.importAVAX` | Import AVAX from another chain |

**Note:** P-Chain operations are NOT EVM — they use Avalanche's native API format and require AvalancheJS or AvalancheGo node.

---

## 3. Glacier API (Data Indexing)

REST API for indexed Avalanche data.

### Base URL
```
https://glacier-api.avax.network/v1
```

### Key Endpoints

| Endpoint | Purpose |
|---------|---------|
| `GET /chains/{chainId}/addresses/{address}/balances` | Token balances |
| `GET /chains/{chainId}/transactions/{txHash}` | Transaction detail |
| `GET /subnets/{subnetId}/validators` | Subnet validator list |
| `GET /networks/{networkId}/subnets` | All subnets for network |

**Axiom use:** Monitor subnet state, validator participation, capital deployment activity.

---

## 4. AvalancheJS — Node API Wrappers

AvalancheJS wraps both C-Chain EVM RPC and P-Chain native API.

### Key packages
- `@avalabs/avalanchejs` — Core SDK (P-Chain, X-Chain, C-Chain)
- `@avalabs/core-eth-provider` — ethers.js-compatible provider for C-Chain

---

## 5. Subnet-EVM Admin API (if running own subnet)

If Axiom creates a custom subnet, the Subnet-EVM node exposes:

| API | Purpose |
|-----|---------|
| `eth_getTransactionByHash` | Standard EVM |
| `avax.getAtomicTx` | Cross-chain atomic transactions |
| Admin precompile endpoints | AllowList, NativeMinter, FeeManager |

---

## API Keys / Env Variables Needed

| Variable | Purpose | Status |
|---------|---------|--------|
| `ALCHEMY_API_KEY` | Already configured — works for Avax C-Chain | Available |
| `AVAX_RPC_URL` | Optional override | Not configured |
| `AVAX_SUBNET_RPC_URL` | Subnet-specific RPC | Not configured |
| `AVAX_VALIDATOR_KEY` | P-Chain validator signing key | Not configured |
| `AVAX_GAS_WALLET_KEY` | AVAX-funded wallet for gas | Not configured |
