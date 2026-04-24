# Canton Network — API Surfaces

**Status:** Not yet reviewed. Participant agreement not in place.

---

## 1. Ledger API (gRPC — Primary)

The Canton Ledger API is a gRPC API used by applications to interact with DAML contracts on the Canton Network.

### Base protocol
- **Protocol:** gRPC (Protocol Buffers)
- **Endpoint:** Determined by participant node deployment (not a public endpoint)
- **Authentication:** TLS mutual authentication (mTLS) between application and participant node

### Key Services (approximate — verify against DAML docs)

| Service | Purpose |
|---------|---------|
| `CommandService` | Submit DAML contract commands (create, exercise) |
| `CommandCompletionService` | Track command completion status |
| `ActiveContractsService` | Stream all active DAML contracts visible to party |
| `TransactionService` | Stream transaction tree |
| `PartyManagementService` | Manage party allocation |
| `PackageService` | Upload DAML packages (compiled DAR files) |
| `LedgerIdentityService` | Identify ledger |

**Important:** Ledger API requires gRPC client, not REST. Node.js gRPC clients exist (`@grpc/grpc-js`) but this is a significant tooling shift from Axiom's current REST-based integrations.

---

## 2. Canton JSON API (REST Wrapper)

The JSON API is a REST/JSON wrapper over the gRPC Ledger API that simplifies application integration.

### Base URL (self-hosted participant)
```
https://{participant-node-host}:{port}/v1
```

### Key Endpoints (approximate)

| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/contracts/search` | POST | Query active contracts |
| `/command/create` | POST | Create a DAML contract |
| `/command/exercise` | POST | Exercise a DAML choice |
| `/transaction/by-event-id` | GET | Get transaction by event ID |
| `/parties` | GET | List known parties |
| `/packages` | GET | List uploaded DAML packages |
| `/packages/{id}` | POST | Upload a DAR (compiled DAML package) |

**Authentication:** JWT tokens issued by participant node.

---

## 3. Canton Admin API

For participant node management:

| Endpoint | Purpose |
|---------|---------|
| `domains connect` | Connect participant to Canton sync domain |
| `parties enable` | Enable a party on the participant |
| `packages upload-dar` | Upload compiled DAML package |

**Access model:** Admin API is gRPC or Canton CLI — not exposed externally.

---

## 4. DAML Hub (Cloud Option)

Digital Asset offers DAML Hub — a managed Canton participant environment. This could reduce operational burden of running own participant node.

- **Domain:** https://hub.daml.com/
- **Purpose:** Managed Canton participant as a service
- **Pricing:** Unknown — verify with Digital Asset

---

## API Keys / Env Variables Needed

| Variable | Purpose | Status |
|---------|---------|--------|
| `CANTON_PARTICIPANT_URL` | Participant node URL | Not configured |
| `CANTON_JSON_API_URL` | JSON API endpoint | Not configured |
| `CANTON_JWT_TOKEN` | API authentication token | Not configured — requires participant setup |
| `CANTON_PARTY_ID` | Axiom's party identifier on Canton | Not configured — requires participant setup |
| `CANTON_APPLICATION_ID` | Application identifier for command tracking | Not configured |
