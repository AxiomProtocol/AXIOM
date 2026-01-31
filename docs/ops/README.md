# Operations Documentation

This directory contains all operational documentation for Axiom Protocol.

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| [SOP Operations Manual](./sop-operations-manual.md) | Internal execution playbook and capital roadmap | Active |
| [Property Research SOP](./property-research-sop.md) | Standard operating procedure for property research | Active |
| [DeNet SOP](./denet-sop.md) | DeNet storage operations procedures | Active |
| [DeNet Setup](./denet-setup.md) | DeNet integration setup guide | Active |
| [Storage Backends](./storage-backends.md) | Storage backend configuration | Active |
| [Release Process](./RELEASE_PROCESS.md) | Release management procedures | Active |

## Internal Manual Access

The SOP Operations Manual is available as an interactive web interface at `/ops/manual`.

**Access Requirements:**
- Environment variable `OPS_MANUAL_ENABLED=true` must be set
- Without this flag, the route returns a 404 response

To enable the manual route:

```bash
# In .env or environment configuration
OPS_MANUAL_ENABLED=true
```

## Navigation

See `_nav.json` for the navigation structure used by the manual UI.

## Export

To export the manual as a standalone HTML file:

```bash
npx ts-node scripts/export-ops-manual.ts
```

Output: `artifacts/ops-manual.html`

---

**Last Updated:** January 31, 2026
