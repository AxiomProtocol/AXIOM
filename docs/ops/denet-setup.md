# DeNet Storage Setup Guide

**Version:** 1.0  
**Updated:** January 31, 2026  
**Classification:** Internal Operations

---

## Overview

DeNet is a decentralized storage network that provides content-addressed storage for Axiom Protocol. This guide explains how to configure DeNet as an optional, redundant storage backend.

---

## Prerequisites

Before setting up DeNet:

1. **Node License**: Active DeNet node license
2. **Hardware** (if running own node):
   - Minimum 4 CPU cores
   - 8GB RAM
   - 1TB+ storage
   - 100Mbps+ network connection
3. **Environment Access**: Ability to set secrets in Replit

---

## Configuration via Environment Variables

### Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `DENET_NODE_KEY` | Secret | Node license key from DeNet |

### Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DENET_ENDPOINT` | Env | `https://api.denet.io` | DeNet API endpoint |
| `DENET_TIMEOUT` | Env | `30000` | Request timeout (ms) |

---

## Setup Steps

### Step 1: Obtain Node License

1. Visit the DeNet portal
2. Create or access your account
3. Generate a new node license
4. Copy the license key (do NOT share or commit this value)

### Step 2: Configure Secret in Replit

1. Open Replit Secrets panel
2. Add new secret:
   - **Key:** `DENET_NODE_KEY`
   - **Value:** Your license key (paste directly, no quotes)
3. Save the secret

### Step 3: Verify Configuration

After adding the secret:

1. Restart the application workflow
2. Call the health endpoint:
   ```
   GET /api/storage/status
   ```
3. Verify DeNet shows as `configured: true`

---

## Hardware Requirements (Self-Hosted Node)

If running your own DeNet node:

### Minimum Specifications

| Component | Requirement |
|-----------|-------------|
| CPU | 4 cores (modern x86_64) |
| RAM | 8 GB |
| Storage | 1 TB NVMe SSD |
| Network | 100 Mbps symmetric |
| OS | Linux (Ubuntu 22.04+) |

### Recommended Specifications

| Component | Requirement |
|-----------|-------------|
| CPU | 8+ cores |
| RAM | 32 GB |
| Storage | 4+ TB NVMe RAID |
| Network | 1 Gbps symmetric |
| UPS | Battery backup |

### Network Requirements

| Port | Protocol | Purpose |
|------|----------|---------|
| 4001 | TCP/UDP | IPFS swarm |
| 8080 | TCP | HTTP gateway |
| 5001 | TCP | API (local only) |

---

## License Activation

### Overview

DeNet node licenses are cryptographically signed credentials that:

1. Authenticate your node to the network
2. Enable earning storage rewards
3. Grant access to the DeNet API

### Activation Process

1. License is automatically activated on first use
2. Node registers with DeNet network
3. Storage capacity is verified
4. Node begins accepting storage requests

### License States

| State | Description |
|-------|-------------|
| `inactive` | License not yet used |
| `active` | Node online and operational |
| `suspended` | Temporarily disabled (check requirements) |
| `expired` | License term ended |

---

## Integration Architecture

### How DeNet Fits Into Axiom Storage

```
┌─────────────────────────────────────────────┐
│            Application Layer                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│     ContentAddressedStoreRouter             │
│  (packages/storage/ContentAddressedStoreRouter.ts) │
└───────┬─────────────────────────┬───────────┘
        │                         │
        ▼                         ▼
┌───────────────────┐   ┌───────────────────┐
│  Replit Storage   │   │    DeNet Store    │
│    (Primary)      │   │   (Redundant)     │
└───────────────────┘   └───────────────────┘
```

### Non-Blocking Writes

DeNet writes are non-blocking by default:

```typescript
// Primary write completes immediately
const result = await router.put(data);

// DeNet write happens in background
// Application doesn't wait for it
```

---

## Verification

### Check Configuration Status

```bash
curl https://your-domain/api/storage/status
```

Expected response (DeNet configured):

```json
{
  "backends": [
    {
      "name": "denet-decentralized",
      "type": "redundant",
      "configured": true,
      "healthy": true
    }
  ]
}
```

### Test Storage Write

Use the admin interface or API to upload a test file and verify it's stored to DeNet.

---

## Troubleshooting

### "DeNet is not configured"

**Cause:** `DENET_NODE_KEY` secret is missing or empty

**Solution:**
1. Verify secret exists in Replit Secrets
2. Restart the workflow after adding secret
3. Check for typos in variable name

### "Health check failed"

**Cause:** Network connectivity or license issues

**Solution:**
1. Verify network connectivity to DeNet endpoints
2. Check license validity
3. Review node status in DeNet portal

### "Configuration detected but writes fail"

**Cause:** License suspended or expired

**Solution:**
1. Check license status in DeNet portal
2. Verify hardware meets minimum requirements
3. Contact DeNet support if license is valid

---

## Security Best Practices

### Do

- Store `DENET_NODE_KEY` as a Replit Secret
- Access credentials only via `process.env`
- Monitor storage health regularly
- Keep node software updated

### Do NOT

- Commit credentials to version control
- Log or print credential values
- Share license keys across environments
- Expose API endpoints without authentication

---

## Related Documentation

| Document | Location |
|----------|----------|
| Storage Backends Overview | `docs/ops/storage-backends.md` |
| Discovery Report | `docs/ops/denet-discovery-report.md` |
| Build Report | `docs/build-report.md` |

---

**Contact:** DevOps Team  
**Last Updated:** January 31, 2026
