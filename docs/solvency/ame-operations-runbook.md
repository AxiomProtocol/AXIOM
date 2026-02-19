# AME Operations Runbook

## Scheduled Job Configuration

The Adaptive Metrics Engine requires periodic execution to maintain up-to-date solvency metrics and stress projections. This document defines the operational cadence, configuration, and verification procedures.

---

## Evaluation Cadence

| Job | Frequency | Endpoint | Method |
|-----|-----------|----------|--------|
| Metric Snapshot | Every 15 minutes | `/api/solvency/ame/run-v2` | POST |
| Stress Projections | Daily at 06:00 UTC | `/api/solvency/ame/stress-v2` | POST |
| Oracle Full Briefing | Daily at 07:00 UTC | `/api/solvency/ame/oracle` | POST |

---

## Cron Configuration (Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/ame-snapshot",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/ame-stress",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/ame-oracle-briefing",
      "schedule": "0 7 * * *"
    }
  ]
}
```

Each cron endpoint should:
1. Verify the `CRON_SECRET` header matches the configured secret
2. Call the corresponding AME API with admin authorization
3. Return 200 on success, 500 on failure with error details

---

## Cron Handler Template

Create `pages/api/cron/ame-snapshot.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/solvency/ame/run-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': process.env.ADMIN_SOLVENCY_KEY || '',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    return res.status(200).json({ success: true, evaluationId: data.evaluationId });
  } catch (error) {
    return res.status(500).json({ error: 'Snapshot failed' });
  }
}
```

---

## Authorization

All AME write endpoints require the `x-admin-key` header matching `ADMIN_SOLVENCY_KEY`:

| Endpoint | Auth Required | Method |
|----------|---------------|--------|
| `run-v2` | Yes | POST |
| `stress-v2` | Yes | POST |
| `hard-brake` | Yes | POST |
| `oracle` | No (read-only interpretation) | POST |
| `latest` | No | GET |
| `history` | No | GET |
| `enforcement` | No | GET |

---

## Data Persistence

Each execution creates immutable records:

| Table | Created By | Purpose |
|-------|-----------|---------|
| `ame_metric_snapshot` | `run-v2` | Full metric state per evaluation |
| `ame_stress_run` | `stress-v2` | Scenario projections with results |
| `ame_policy_state` | `run-v2` | Current policy mode and regime |
| `ame_enforcement_event` | `run-v2` | Breach actions and policy transitions |
| `ame_data_snapshot` | `run-v2` | Raw input checksums for audit |

---

## Verification Checklist

After enabling scheduled jobs, verify:

- [ ] `GET /api/solvency/ame/latest` returns a recent snapshot (< 20 minutes old)
- [ ] `GET /api/solvency/ame/history?limit=10` returns multiple snapshots
- [ ] `GET /api/solvency/ame/enforcement` shows current policy state
- [ ] Solvency page Regulatory view displays historical metrics table with data
- [ ] Stress simulator returns projections when run
- [ ] Oracle responds to all 5 query types
- [ ] Lexicon guard passes: `npx tsx tests/mirdt-lexicon.test.ts`
- [ ] No prohibited terms in solvency UI strings

---

## Monitoring

Watch for:

1. **Stale snapshots**: If `latest` timestamp is older than 30 minutes during business hours, investigate cron execution
2. **Policy mode transitions**: Unexpected transitions from GROWTH to CONSERVATION or CRISIS should trigger manual review
3. **Hard brake events**: Any hard brake activation requires immediate founder attention
4. **Oracle failures**: If oracle returns fallback text, check Gemini API availability and quota

---

## Manual Execution

For ad-hoc evaluations outside the scheduled cadence:

```bash
# Run metric snapshot
curl -X POST https://your-domain.com/api/solvency/ame/run-v2 \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY"

# Run all stress scenarios
curl -X POST https://your-domain.com/api/solvency/ame/stress-v2 \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{}'

# Get oracle briefing
curl -X POST https://your-domain.com/api/solvency/ame/oracle \
  -H "Content-Type: application/json" \
  -d '{"queryType": "full_briefing", "includeStress": true}'
```
