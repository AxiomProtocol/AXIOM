# Axiom Protocol Documentation

This directory contains all documentation for the Axiom Protocol ecosystem.

## Documentation Index

### Core Documentation

| Document | Description |
|----------|-------------|
| [Ecosystem Whitepaper](./AXIOM_ECOSYSTEM_WHITEPAPER.md) | Complete ecosystem documentation (60+ contracts) |
| [KeyGrow Whitepaper](./AXIOM_KEYGROW_WHITEPAPER.md) | Rent-to-Own program documentation |

### Operations Documentation

| Document | Description | Access |
|----------|-------------|--------|
| [Operations Index](./ops/README.md) | Operations documentation index | Internal |
| [SOP Operations Manual](./ops/sop-operations-manual.md) | Internal execution playbook | Gated |
| [Property Research SOP](./ops/property-research-sop.md) | Property research procedures | Internal |
| [DeNet SOP](./ops/denet-sop.md) | DeNet storage operations | Internal |

### Storage Documentation

| Document | Description |
|----------|-------------|
| [DeNet Architecture](./storage/denet-architecture.md) | Decentralized storage architecture |
| [DeNet Activation Status](./storage/denet-activation-status.md) | Activation checklist |
| [DeNet Enforcement Proof](./storage/denet-enforcement-proof.md) | CID enforcement evidence |

### Architecture Documentation

| Document | Description |
|----------|-------------|
| [Layer 5 Sublayers](./architecture/layer-5-sublayers.md) | Layer 5 sublayer architecture |
| [Module to Contract Map](./module-to-contract-map.md) | Module to contract address mapping |

### Internal Development

| Document | Description | Access |
|----------|-------------|--------|
| [Capital Bridge Analysis](./internal/CAPITAL-BRIDGE-MASTER-PROMPT-ANALYSIS.md) | Implementation plan analysis | Internal |
| [Development Roadmap 2026](./internal/DEVELOPMENT-ROADMAP-2026.md) | Internal development roadmap | Internal |

## Internal Manual Access

The SOP Operations Manual is available as an interactive web interface at `/ops/manual`.

**Access Gate:**
- Environment variable `OPS_MANUAL_ENABLED=true` must be set
- Without this flag, the route returns a 404 response
- This manual is for internal use only

To enable:
```bash
OPS_MANUAL_ENABLED=true
```

## Manual Export

To export the SOP Operations Manual as a standalone HTML file:

```bash
npx ts-node scripts/export-ops-manual.ts
```

Output: `artifacts/ops-manual.html`

---

**Last Updated:** January 31, 2026
