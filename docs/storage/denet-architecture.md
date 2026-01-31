# DeNet Storage Architecture

**Version:** 1.0  
**Updated:** January 31, 2026  
**Classification:** Technical Architecture

---

## Overview

DeNet serves as the primary decentralized storage layer for Axiom Protocol, providing content-addressed, verifiable, and replicated storage for critical documents. This architecture ensures institutional-grade document integrity for capital bridge, underwriting, and compliance workflows.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Axiom Application Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Capital   │  │  Property   │  │ Underwriting│  │  Compliance │ │
│  │   Bridge    │  │  Research   │  │   System    │  │   System    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                  │
│                    ┌──────────────┴──────────────┐                  │
│                    │   CID Enforcement Service   │                  │
│                    │   (packages/denet/)         │                  │
│                    └──────────────┬──────────────┘                  │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────┐
│                    DeNet Package Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ DeNetClient │  │DeNetUploader│  │DeNetVerifier│                  │
│  │   (Auth)    │  │  (Storage)  │  │  (Verify)   │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│         └────────────────┴────────────────┘                          │
│                          │                                           │
│                ┌─────────┴─────────┐                                │
│                │  DENET_NODE_KEY   │                                │
│                │    (Secret)       │                                │
│                └─────────┬─────────┘                                │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                    DeNet Network Layer                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   DeNet P2P Network                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │   │
│  │  │ Node 1  │  │ Node 2  │  │ Node 3  │  │ Node N  │         │   │
│  │  │(Primary)│  │(Replica)│  │(Replica)│  │(Replica)│         │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. DeNet Client (`denetClient.ts`)

**Purpose:** Authentication and connection management

**Responsibilities:**
- Initialize connection using `DENET_NODE_KEY`
- Manage API endpoints and timeouts
- Provide health checking
- Compute content hashes (SHA-256)
- Generate CIDs

**Security:**
- Credentials never logged
- Accessed only via `process.env`
- Health endpoints return no secrets

### 2. DeNet Uploader (`denetUploader.ts`)

**Purpose:** File upload and document management

**Responsibilities:**
- Upload files with automatic MIME detection
- Generate content-addressed CIDs
- Support specialized document types:
  - Property Research
  - Due Diligence
  - Attestations
  - Underwriting
- Queue management for concurrent uploads

**Document Types:**
```typescript
type DeNetDocumentType = 
  | 'property_research'
  | 'due_diligence'
  | 'attestation'
  | 'underwriting'
  | 'legal_document'
  | 'appraisal'
  | 'title_search'
  | 'environmental'
  | 'survey'
  | 'general';
```

### 3. DeNet Verifier (`denetVerifier.ts`)

**Purpose:** Content verification and integrity checking

**Responsibilities:**
- Verify CID existence
- Check content hash integrity
- Monitor replication health
- Batch verification support
- Cache verification results

**Verification Flow:**
```
CID → Exists Check → Content Hash Match → Replication Count → Result
```

### 4. CID Enforcement (`cidEnforcement.ts`)

**Purpose:** Ensure DeNet storage for approvals

**Responsibilities:**
- Validate CIDs before workflow approval
- Enforce minimum replication requirements
- Generate enforcement reports
- Support graceful fallback when disabled

---

## Storage Strategy

### Primary: DeNet (Decentralized)

- Content-addressed storage
- Automatic replication (3x minimum)
- Cryptographic verification
- Permanent, immutable storage

### Fallback: Replit Object Storage

- Used when DeNet unavailable
- Centralized backup
- Faster for development

### Secondary: IPFS (Storacha)

- NFT and metadata storage
- Public content distribution
- IPFS gateway compatibility

---

## CID Format

DeNet uses IPFS-compatible CIDv1 format:

```
bafy + <58 character base32 encoded multihash>
```

Example:
```
bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
```

### CID Components

| Part | Description |
|------|-------------|
| `bafy` | CIDv1 prefix (base32) |
| Multihash | SHA-256 hash of content |
| Version | CID version identifier |
| Codec | Content codec (raw, dag-pb) |

---

## Document Flow

### Property Research Upload

```
1. Research Data (JSON) → DeNet Uploader
2. Generate Content Hash (SHA-256)
3. Upload to DeNet Network
4. Receive CID
5. Store CID on-chain (CapitalBridgeHub)
6. Verify replication complete
```

### Capital Bridge Approval

```
1. Packet submitted with document CIDs
2. CID Enforcement validates each CID:
   - Property Data CID
   - Due Diligence CID
   - Attestation A CID
   - Attestation B CID
3. All CIDs must pass verification
4. Approval proceeds only if all pass
```

---

## API Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/denet/status` | GET | Node status | None |
| `/api/denet/metrics` | GET | Storage metrics | None |
| `/api/denet/files` | GET | List files | None |
| `/api/denet/upload` | POST | Upload file | Role-gated |
| `/api/denet/verify` | GET/POST | Verify CID(s) | None |
| `/api/denet/analytics` | GET | Analytics data | None |

---

## Replication & Durability

### Replication Factor

- **Minimum:** 3 nodes
- **Target:** 5 nodes
- **Geographic Distribution:** Multi-region

### Durability Guarantees

| Scenario | Recovery |
|----------|----------|
| Single node failure | No data loss |
| Multi-node failure | Recovery from replicas |
| Network partition | Eventual consistency |

---

## Security Model

### Authentication

- Node license key stored as secret
- API requests signed with key
- No public write access

### Content Integrity

- SHA-256 content hashing
- Immutable CIDs
- Verification on retrieval

### Access Control

- Upload requires authorized role
- Read is public (CID-based)
- Metrics are read-only

---

## Integration Points

### Smart Contracts

- `CapitalBridgeHub.sol` stores CID hashes
- `PropertyPacket` struct includes CID fields
- On-chain verification references DeNet CIDs

### Observer Dashboard

- `DeNetMetricsPanel` component
- Real-time metrics display
- Health monitoring

### Workflows

- Property research requires DeNet upload
- Attestations stored in DeNet
- Underwriting documents in DeNet

---

## Monitoring

### Health Metrics

| Metric | Description |
|--------|-------------|
| Node Status | Online/Offline/Syncing |
| Uptime | Time since last restart |
| Peer Count | Connected network peers |
| Replication Health | % of files at target replication |

### Performance Metrics

| Metric | Description |
|--------|-------------|
| Upload Latency | Time to upload and confirm |
| Verification Rate | % of successful verifications |
| Storage Usage | Bytes stored |

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DENET_NODE_KEY` | Yes | Node license key |
| `DENET_ENDPOINT` | No | API endpoint (default: https://api.denet.pro) |
| `DENET_TIMEOUT` | No | Request timeout in ms (default: 60000) |
| `DENET_ENFORCEMENT_ENABLED` | No | Enable CID enforcement (default: true) |

---

## Related Documentation

| Document | Location |
|----------|----------|
| Activation Status | `docs/storage/denet-activation-status.md` |
| Operations SOP | `docs/ops/denet-sop.md` |
| Setup Guide | `docs/ops/denet-setup.md` |
| Storage Backends | `docs/ops/storage-backends.md` |

---

**Contact:** Engineering Team  
**Last Updated:** January 31, 2026
