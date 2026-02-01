# Storage Backends Documentation

**Version:** 1.0  
**Updated:** January 31, 2026  
**Classification:** Internal Operations

---

## Overview

Axiom Protocol uses a multi-backend storage architecture designed for:
- **Redundancy**: Data stored across multiple providers
- **Resilience**: Graceful fallback when backends are unavailable
- **Performance**: Primary writes never blocked by secondary backends
- **Security**: Credentials isolated in environment variables

---

## Storage Backends

### 1. DeNet Decentralized Storage (Primary)

**Type:** Primary  
**Provider:** DeNet Network  
**Purpose:** Decentralized, content-addressed storage for critical documents

**Features:**
- Content-addressed (CID-based)
- Automatic 3x replication
- Cryptographic verification
- Permanent, immutable storage
- Required for workflow approvals

**Configuration:**
| Variable | Purpose |
|----------|---------|
| `DENET_NODE_KEY` | Node license key (secret) |
| `DENET_ENDPOINT` | API endpoint (optional) |
| `DENET_TIMEOUT` | Request timeout in ms |
| `DENET_ENFORCEMENT_ENABLED` | Enable CID enforcement |

**Files:**
- `packages/denet/denetClient.ts`
- `packages/denet/denetUploader.ts`
- `packages/denet/denetVerifier.ts`
- `packages/denet/cidEnforcement.ts`

---

### 2. Replit Object Storage (Fallback)

**Type:** Fallback  
**Provider:** Replit / Google Cloud Storage  
**Purpose:** Fallback storage when DeNet is unavailable

**Features:**
- Integrated with Replit infrastructure
- Automatic credential management via sidecar
- Public and private object support
- ACL-based access control

**Configuration:**
| Variable | Purpose |
|----------|---------|
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Default bucket identifier |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Comma-separated public paths |
| `PRIVATE_OBJECT_DIR` | Private object directory |

**Files:**
- `server/replit_integrations/object_storage/objectStorage.ts`
- `server/replit_integrations/object_storage/routes.ts`

---

### 3. NFT.Storage / IPFS (Secondary)

**Type:** Redundant  
**Provider:** Protocol Labs / IPFS  
**Purpose:** Permanent, immutable content storage

**Features:**
- IPFS-based storage
- NFT metadata persistence
- Content-addressed retrieval

**Configuration:**
| Variable | Purpose |
|----------|---------|
| `NFT_STORAGE_API_KEY` | API key (secret) |

---

## Redundancy Strategy

### Write Path

```
Application Write Request
         │
         ▼
┌─────────────────────┐
│  Primary Backend    │ ◄─── Synchronous (blocking)
│  (DeNet Storage)    │
└─────────┬───────────┘
          │
          │ Success + CID
          ▼
┌─────────────────────┐
│  Return CID to App  │
└─────────────────────┘
          │
          │ If DeNet fails, fallback
          ▼
┌─────────────────────┐
│  Fallback Backend   │
│  (Replit Storage)   │
└─────────────────────┘
```

### Key Principles

1. **Primary First**: Primary backend write must succeed
2. **Non-Blocking Redundancy**: Secondary writes don't block response
3. **Graceful Degradation**: Missing backends don't cause failures
4. **Fire-and-Forget**: Redundant writes logged but not awaited

---

## Fallback Behavior

### Scenario: Primary Available, DeNet Unavailable

```
Write Request → Replit Storage ✓ → Return Success
                      │
                      └→ DeNet (fails silently)
```

**Result:** Write succeeds, redundancy logged as failed

### Scenario: Primary Unavailable

```
Write Request → Replit Storage ✗ → Return Error
```

**Result:** Write fails, no fallback to redundant backends for writes

### Scenario: Read from Redundant

```
Read Request → Replit Storage (not found)
                      │
                      └→ DeNet (found) → Return Data
```

**Result:** Fallback retrieval from redundant backend

---

## Health Monitoring

### API Endpoint

```
GET /api/storage/status
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-01-31T12:00:00.000Z",
  "overallHealthy": true,
  "backends": [
    {
      "name": "replit-object-storage",
      "type": "primary",
      "configured": true,
      "healthy": true,
      "lastCheck": 1738318800000
    },
    {
      "name": "denet-decentralized",
      "type": "redundant",
      "configured": true,
      "healthy": true,
      "lastCheck": 1738318800000
    }
  ],
  "summary": {
    "totalBackends": 3,
    "configuredBackends": 2,
    "healthyBackends": 2
  }
}
```

---

## Security Considerations

### Credential Management

1. All credentials stored as environment secrets
2. Never logged or exposed in responses
3. Accessed only via `process.env`

### Access Control

1. Primary storage uses ACL policies
2. DeNet uses node license authentication
3. IPFS uses API key authentication

### Audit Trail

1. All storage operations logged (without credentials)
2. Health checks recorded with timestamps
3. Failure events captured for monitoring

---

## Code References

| File | Purpose |
|------|---------|
| `packages/storage/index.ts` | Package exports |
| `packages/storage/providers/DeNetStore.ts` | DeNet provider |
| `packages/storage/ContentAddressedStoreRouter.ts` | Multi-backend router |
| `pages/api/storage/status.ts` | Health status API |
| `server/replit_integrations/object_storage/` | Replit storage |

---

## Troubleshooting

### DeNet Not Working

1. Verify `DENET_NODE_KEY` secret exists
2. Check node license validity
3. Confirm network connectivity to DeNet endpoints

### Primary Storage Errors

1. Check `DEFAULT_OBJECT_STORAGE_BUCKET_ID` is set
2. Verify Replit Object Storage tool is configured
3. Review storage quota limits

### Health Check Failures

1. Review `/api/storage/status` response
2. Check individual backend configurations
3. Verify environment secrets are set

---

**Contact:** DevOps Team  
**Last Audit:** January 31, 2026
