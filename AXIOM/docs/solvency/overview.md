# Solvency Page Overview

Date: 2026-02-11
Route: /solvency
API: /api/solvency/metrics (GET), /api/solvency/ingest-snapshot (POST)

## What /solvency Shows

The solvency page provides transparent visibility into the financial health of the Axiom Protocol treasury and reserve system. It displays:

- Treasury total and liquid balances
- Reserve levels and liabilities
- Reserve ratio and coverage ratio
- Loss buffer size
- Current policy mode and system state
- Asset composition breakdown
- Data sources and limitations

The page combines live metrics from a database-backed snapshot system with static institutional disclosure content including definitions, capital waterfall explanation, stabilization policy modes, FAQ, and verification instructions.

## How Metrics Are Sourced

Metrics flow through a layered system:

1. An administrator records a solvency snapshot via the ingestion endpoint
2. The snapshot is stored in the `solvency_snapshots` table with a SHA-256 checksum
3. The `/api/solvency/metrics` endpoint reads the latest snapshot and enriches it with live protocol metrics (active MIRDT setups, verified contracts)
4. The `/solvency` page fetches metrics via `getServerSideProps` for server-side rendering

If no snapshot exists, the API returns a safe empty state with `dataStatus: "empty"` and appropriate limitations messaging. The page never throws a 500 for missing data.

## Data Contract

The metrics API returns a versioned JSON payload:

```
{
  schemaVersion: "solvency-v1",
  dataStatus: "ok" | "empty" | "partial",
  asOfUtc: ISO string,
  snapshotId: string,
  checksum: string (first 16 chars of SHA-256),
  treasuryTotalUsd: number,
  treasuryLiquidUsd: number,
  reservesTotalUsd: number,
  liabilitiesTotalUsd: number,
  reserveRatio: number,
  coverageRatio: number,
  lossBufferUsd: number,
  policyMode: string,
  regimeState: string,
  hardBrake: string,
  gateStatus: string,
  composition: [{ label, valueUsd, pct }],
  limitations: string[],
  sources: [{ label, detail }]
}
```

## How to Ingest a Snapshot

The ingestion endpoint requires the `ADMIN_SOLVENCY_KEY` environment variable to be set.

```bash
curl -X POST https://your-domain/api/solvency/ingest-snapshot \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_SOLVENCY_KEY" \
  -d '{
    "asOfUtc": "2026-02-11T00:00:00Z",
    "notes": "Weekly solvency snapshot",
    "payloadJson": {
      "treasuryTotalUsd": 5000000,
      "treasuryLiquidUsd": 3500000,
      "reservesTotalUsd": 1750000,
      "liabilitiesTotalUsd": 500000,
      "lossBufferUsd": 250000,
      "policyMode": "NORMAL",
      "hardBrake": "OFF",
      "gateStatus": "OPEN",
      "composition": [
        { "label": "Stablecoin reserves", "valueUsd": 2000000, "pct": 40 },
        { "label": "Operating capital", "valueUsd": 1500000, "pct": 30 },
        { "label": "Growth allocation", "valueUsd": 1000000, "pct": 20 },
        { "label": "Distribution reserve", "valueUsd": 500000, "pct": 10 }
      ],
      "limitations": [],
      "sources": []
    }
  }'
```

The server computes the checksum automatically from the payload. You do not need to provide it.

## Database Table

Table: `solvency_snapshots`

| Column | Type | Description |
|---|---|---|
| id | UUID | Auto-generated primary key |
| created_at | timestamp | When the record was inserted |
| as_of_utc | timestamp | The point-in-time the snapshot represents |
| payload_json | jsonb | Full solvency metrics payload |
| checksum | text | SHA-256 hash (first 16 chars) of payload |
| notes | text | Optional admin notes |

## How to Extend Metrics

To add new fields to the solvency response:

1. Add the field to the `payloadJson` object when ingesting snapshots
2. Read the field in `pages/api/solvency/metrics.ts` from the snapshot payload
3. Add the field to the `SolvencyMetrics` interface
4. Display it in `pages/solvency.tsx`

No schema migration is needed because `payloadJson` is a flexible jsonb column. New fields can be added to the payload without database changes.

## Files

| File | Purpose |
|---|---|
| pages/solvency.tsx | Solvency disclosure page with live metrics |
| pages/api/solvency/metrics.ts | GET endpoint returning versioned solvency data |
| pages/api/solvency/ingest-snapshot.ts | POST endpoint for admin snapshot ingestion |
| shared/schema.ts | solvencySnapshots table definition |
| docs/solvency/overview.md | This document |
