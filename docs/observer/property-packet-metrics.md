# Property Packet Metrics - Observer Dashboard

**Version:** 1.0.0  
**Last Updated:** 2026-01-31  
**Classification:** Internal Use Only  
**Data Source:** Property Packet Workflow System

---

## Overview

This document defines the data shape for property packet metrics displayed on the Observer Dashboard. These metrics provide transparency into the Capital Bridge packet workflow for institutional observers.

---

## Metrics Definition

### Core Metrics

| Metric | Type | Description | Update Frequency |
|--------|------|-------------|------------------|
| `packetsCreated` | integer | Total packets created across all tracks | Real-time |
| `packetsTrackA` | integer | Packets in Track A (Performing) | Real-time |
| `packetsTrackB` | integer | Packets in Track B (Light NPL) | Real-time |
| `underwritingFinalized` | integer | Packets with completed underwriting | Real-time |
| `artifactsReady` | integer | Packets with all required artifacts validated | Real-time |
| `pendingAttestation` | integer | Packets awaiting dual attestation | Real-time |
| `settledCount` | integer | Packets successfully settled on-chain | Real-time |
| `rejectedCount` | integer | Packets rejected (failed validation) | Real-time |

### Value Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `totalUPB` | number | Sum of unpaid principal balances | 
| `totalPurchasePrice` | number | Sum of underwritten purchase prices |
| `totalParticipation` | number | Sum of participation amounts |
| `avgYieldRangeLow` | number | Average low-end yield estimate |
| `avgYieldRangeHigh` | number | Average high-end yield estimate |

### Risk Distribution

| Metric | Type | Description |
|--------|------|-------------|
| `riskTierLow` | integer | Packets classified as LOW risk |
| `riskTierMedium` | integer | Packets classified as MEDIUM risk |
| `riskTierHigh` | integer | Packets classified as HIGH risk |

### Timestamps

| Field | Type | Description |
|-------|------|-------------|
| `lastPacketCreated` | ISO8601 | Timestamp of most recent packet creation |
| `lastUnderwritingFinalized` | ISO8601 | Timestamp of most recent underwriting |
| `lastSettlement` | ISO8601 | Timestamp of most recent settlement |
| `metricsUpdatedAt` | ISO8601 | When metrics were last computed |

---

## Data Shape (TypeScript)

```typescript
interface PropertyPacketMetrics {
  // Core counts
  packetsCreated: number;
  packetsTrackA: number;
  packetsTrackB: number;
  underwritingFinalized: number;
  artifactsReady: number;
  pendingAttestation: number;
  settledCount: number;
  rejectedCount: number;
  
  // Value aggregates
  totalUPB: number;
  totalPurchasePrice: number;
  totalParticipation: number;
  avgYieldRangeLow: number;
  avgYieldRangeHigh: number;
  
  // Risk distribution
  riskTierLow: number;
  riskTierMedium: number;
  riskTierHigh: number;
  
  // Track breakdown
  trackBreakdown: {
    trackA: TrackMetrics;
    trackB: TrackMetrics;
  };
  
  // Timestamps
  lastPacketCreated: string | null;
  lastUnderwritingFinalized: string | null;
  lastSettlement: string | null;
  metricsUpdatedAt: string;
}

interface TrackMetrics {
  count: number;
  totalUPB: number;
  totalPurchasePrice: number;
  avgLTV: number;
  statusBreakdown: {
    draft: number;
    underwriting: number;
    artifactsPending: number;
    ready: number;
    submitted: number;
    attested: number;
    settled: number;
    rejected: number;
  };
}
```

---

## JSON Example

```json
{
  "packetsCreated": 12,
  "packetsTrackA": 8,
  "packetsTrackB": 4,
  "underwritingFinalized": 10,
  "artifactsReady": 7,
  "pendingAttestation": 2,
  "settledCount": 3,
  "rejectedCount": 1,
  
  "totalUPB": 2450000.00,
  "totalPurchasePrice": 2156000.00,
  "totalParticipation": 646800.00,
  "avgYieldRangeLow": 9.2,
  "avgYieldRangeHigh": 12.8,
  
  "riskTierLow": 5,
  "riskTierMedium": 6,
  "riskTierHigh": 1,
  
  "trackBreakdown": {
    "trackA": {
      "count": 8,
      "totalUPB": 1680000.00,
      "totalPurchasePrice": 1545600.00,
      "avgLTV": 82.5,
      "statusBreakdown": {
        "draft": 1,
        "underwriting": 1,
        "artifactsPending": 2,
        "ready": 1,
        "submitted": 0,
        "attested": 1,
        "settled": 2,
        "rejected": 0
      }
    },
    "trackB": {
      "count": 4,
      "totalUPB": 770000.00,
      "totalPurchasePrice": 610400.00,
      "avgLTV": 78.3,
      "statusBreakdown": {
        "draft": 0,
        "underwriting": 1,
        "artifactsPending": 1,
        "ready": 0,
        "submitted": 0,
        "attested": 0,
        "settled": 1,
        "rejected": 1
      }
    }
  },
  
  "lastPacketCreated": "2026-01-31T14:30:00Z",
  "lastUnderwritingFinalized": "2026-01-31T15:45:00Z",
  "lastSettlement": "2026-01-30T11:20:00Z",
  "metricsUpdatedAt": "2026-01-31T16:00:00Z"
}
```

---

## API Endpoint (Proposed)

```
GET /api/observer/property-packet-metrics
```

**Response:** `PropertyPacketMetrics` object as defined above

**Access Control:** Read-only, Observer role required

---

## Dashboard Widget Specification

### Packet Pipeline Widget

Display a funnel visualization showing:

```
Created → Underwriting → Artifacts Ready → Attested → Settled
   12   →      10      →        7        →     3    →    3
```

### Track Distribution Widget

Pie chart showing:
- Track A (Performing): 66%
- Track B (Light NPL): 34%

### Risk Distribution Widget

Bar chart showing:
- LOW: 5 packets
- MEDIUM: 6 packets
- HIGH: 1 packet

### Value Summary Widget

Cards showing:
- Total UPB: $2.45M
- Total Participation: $646.8K
- Avg Yield Range: 9.2% - 12.8%

---

## Data Sources

Metrics are computed from:
1. `data/property-packets/*.packet.json` files
2. On-chain CapitalBridgeHub events (for settled packets)
3. Attestation records

---

## Related Documents

- [Observer Dashboard](/observer)
- [Capital Bridge Metrics](/observer/capital-bridge)
- [Property Packet Operator SOP](../ops/property-packet-operator-sop.md)
- [Property Packet Schema](../ops/schemas/property-packet.schema.json)
