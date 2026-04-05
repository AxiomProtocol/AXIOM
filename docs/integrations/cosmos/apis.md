# Cosmos — API Surfaces

**Status:** Not yet reviewed. Architecture decision not yet made.

---

## 1. CometBFT RPC (Consensus Layer)

CometBFT (previously Tendermint) is the consensus engine. Its RPC API exposes chain state.

### Base URL (per node)
```
https://{node-rpc-endpoint}:26657
```

### Key Endpoints

| Endpoint | Purpose |
|---------|---------|
| `GET /status` | Node status, latest block |
| `GET /block?height={h}` | Block at height |
| `GET /tx?hash={h}` | Transaction by hash |
| `GET /broadcast_tx_sync` | Broadcast transaction (sync) |
| `GET /broadcast_tx_commit` | Broadcast and wait for commit |
| `GET /validators` | Current validator set |
| `WS /websocket` | Subscribe to block/tx events via WebSocket |

---

## 2. Cosmos REST API (LCD / Light Client Daemon)

The Cosmos REST API (formerly LCD) provides human-readable access to chain state.

### Base URL
```
https://{node-api-endpoint}:1317
```

### Key Endpoints

| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/cosmos/bank/v1beta1/balances/{address}` | GET | Account balances |
| `/cosmos/staking/v1beta1/validators` | GET | Validator list |
| `/cosmos/staking/v1beta1/delegations/{address}` | GET | Delegations |
| `/cosmos/tx/v1beta1/txs` | POST | Broadcast transaction |
| `/cosmos/tx/v1beta1/txs/{hash}` | GET | Transaction detail |
| `/cosmos/gov/v1beta1/proposals` | GET | Governance proposals |
| `/ibc/core/channel/v1/channels` | GET | IBC channels |

---

## 3. Cosmos SDK gRPC API

The Cosmos SDK exposes all modules via gRPC. Proto files define the API.

### Key Services (approximate)

| Service | Purpose |
|---------|---------|
| `cosmos.bank.v1beta1.Query` | Balance queries |
| `cosmos.staking.v1beta1.Query` | Staking / validator queries |
| `cosmos.gov.v1beta1.Query` | Governance queries |
| `cosmos.tx.v1beta1.Service` | Transaction broadcast |
| `ibc.core.channel.v1.Query` | IBC channel queries |
| `ibc.applications.transfer.v1.Query` | IBC transfer queries |

---

## 4. CosmJS (TypeScript Client Library)

CosmJS is the primary TypeScript/JavaScript client for Cosmos chains.

### Packages

| Package | Purpose |
|---------|---------|
| `@cosmjs/stargate` | Full Cosmos SDK client (Stargate-era+) |
| `@cosmjs/proto-signing` | Transaction signing |
| `@cosmjs/amino` | Amino encoding (legacy) |
| `@cosmjs/encoding` | Bech32, base64 utilities |
| `@cosmjs/tendermint-rpc` | CometBFT RPC client |

### Key Operations

```typescript
// Approximate — verify against cosmjs docs
import { SigningStargateClient } from '@cosmjs/stargate';

const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, signer);
const result = await client.sendTokens(from, to, [{ denom: 'uaxm', amount: '1000000' }], fee);
```

---

## 5. IBC Relayer APIs

IBC requires relayers to pass packets between chains. Relayer software (Hermes, Go Relayer) exposes status APIs.

**Axiom use:** If launching appchain, need to connect IBC relayers to other chains. This is an operational infrastructure concern.

---

## API Keys / Env Variables Needed

| Variable | Purpose | Status |
|---------|---------|--------|
| `COSMOS_RPC_URL` | Axiom appchain or hub RPC endpoint | Not configured — chain doesn't exist yet |
| `COSMOS_REST_URL` | LCD endpoint | Not configured |
| `COSMOS_CHAIN_ID` | Axiom appchain chain ID | Not configured — to be assigned |
| `COSMOS_VALIDATOR_MNEMONIC` | Validator key | Not configured |
| `COSMOS_RELAYER_KEY` | IBC relayer signing key | Not configured |
