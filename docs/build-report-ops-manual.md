# Build Report: SOP Operations Manual

**Date:** January 31, 2026  
**Status:** Complete  
**Build Type:** Documentation and UI Route

---

## Summary

Implementation of the internal SOP Operations Manual system, converting the execution playbook into a permanent, navigable, and versioned documentation artifact with UI access.

---

## Files Created

### Documentation Files

| File | Purpose | Lines |
|------|---------|-------|
| `docs/ops/sop-operations-manual.md` | Main operations manual content | ~500 |
| `docs/ops/README.md` | Operations documentation index | ~40 |
| `docs/ops/_nav.json` | Navigation structure for manual UI | ~70 |
| `docs/README.md` | Main documentation index | ~70 |
| `docs/build-report-ops-manual.md` | This build report | ~100 |

### UI Files

| File | Purpose |
|------|---------|
| `pages/ops/manual.tsx` | Manual UI route with access gate |

### Script Files

| File | Purpose |
|------|---------|
| `scripts/export-ops-manual.ts` | HTML export script |

### Output Directories

| Directory | Purpose |
|-----------|---------|
| `artifacts/` | Export output directory (ops-manual.html) |

---

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `react-markdown` | 10.1.0 | Markdown rendering |
| `remark-gfm` | 4.0.1 | GitHub Flavored Markdown support |

---

## File Tree (New Files Only)

```
/home/runner/workspace/
├── docs/
│   ├── README.md                          (NEW)
│   ├── build-report-ops-manual.md         (NEW)
│   └── ops/
│       ├── README.md                      (NEW)
│       ├── sop-operations-manual.md       (NEW)
│       └── _nav.json                      (NEW)
├── pages/
│   └── ops/
│       └── manual.tsx                     (NEW)
├── scripts/
│   └── export-ops-manual.ts               (NEW)
└── artifacts/
    └── (ops-manual.html after export)
```

---

## Access Control

### UI Route Gate

The `/ops/manual` route is protected by an environment variable gate:

```typescript
const isEnabled = process.env.OPS_MANUAL_ENABLED === 'true';

if (!isEnabled) {
  return { notFound: true };
}
```

- **Default:** Route returns 404 (disabled)
- **Enabled:** Set `OPS_MANUAL_ENABLED=true` in environment

### Classification

- Document classification: Internal Use Only
- No authentication required beyond environment gate
- Route marked with `noindex, nofollow` for search engines

---

## Features Implemented

### Manual UI (`/ops/manual`)

- [x] Markdown rendering from `docs/ops/sop-operations-manual.md`
- [x] Left sidebar navigation from `docs/ops/_nav.json`
- [x] Client-side search within manual content
- [x] Print button (`window.print()`)
- [x] Last updated timestamp from file metadata
- [x] Responsive design with mobile support
- [x] Print-friendly CSS
- [x] Access gate via `OPS_MANUAL_ENABLED` environment variable
- [x] Returns 404 when disabled

### Export Script (`scripts/export-ops-manual.ts`)

- [x] Reads markdown from `docs/ops/sop-operations-manual.md`
- [x] Reads navigation from `docs/ops/_nav.json`
- [x] Converts markdown to HTML
- [x] Generates standalone HTML file
- [x] Outputs to `artifacts/ops-manual.html`
- [x] Includes embedded CSS (no external dependencies)
- [x] Print-friendly output

---

## Verification Commands

### View Manual in Development

```bash
# Enable manual access
export OPS_MANUAL_ENABLED=true

# Start development server (already running via workflow)
# Access: http://localhost:5000/ops/manual
```

### Export HTML

```bash
npx ts-node scripts/export-ops-manual.ts
# Output: artifacts/ops-manual.html
```

### Verify Route Disabled

```bash
# Unset or set to false
unset OPS_MANUAL_ENABLED
# or
export OPS_MANUAL_ENABLED=false

# Access /ops/manual should return 404
```

---

## Non-Negotiables Checklist

- [x] Additive changes only - No modifications to deployed contracts
- [x] No new privileged surfaces - Uses existing Next.js routing
- [x] SOP is internal - Gated by environment variable
- [x] Source of truth in `/docs` - All content lives in `docs/ops/`
- [x] Rendered in app - UI route at `/ops/manual`
- [x] Navigable - Left sidebar with section links
- [x] Printable - Print button and print CSS included
- [x] Versioned - Version tracked in `_nav.json` and document header

---

## Manual Content Sections

1. Purpose and Scope
2. System Status Baseline
3. Execution Phases Overview
4. Phase A: System Activation (0-30 Days)
5. Phase B: Infrastructure Revenue (30-90 Days)
6. Phase C: Capital Light Deployment (90-180 Days)
7. Phase D: Scale and Institutionalization (6-24 Months)
8. Capital Discipline Principles
9. Recommended Next Steps Selector
10. Operating Cadence
11. Roles and Responsibilities
12. Artifact List
13. Change Control and Versioning

---

**Build completed successfully.**
