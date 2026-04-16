import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// ────────────────────────────────────────────────────────────────────
// AXAU growth stats — admin only.
// Auth: x-admin-key header OR ?key= query, must equal ADMIN_SOLVENCY_KEY.
// Returns: today/total counts, conversion %, top source, daily series,
//          source breakdown, funnel dropoff, spots claimed.
// ────────────────────────────────────────────────────────────────────

let _pool: Pool | null = null;
function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? true : undefined,
    max: 3,
    connectionTimeoutMillis: 6000,
  });
  return _pool;
}

function authorized(req: NextApiRequest): boolean {
  const expected = process.env.ADMIN_SOLVENCY_KEY;
  if (!expected) return false;
  const provided =
    (req.headers['x-admin-key'] as string | undefined) ||
    (typeof req.query.key === 'string' ? req.query.key : '');
  return !!provided && provided === expected;
}

interface DayBucket { day: string; visitors: number; cta_clicks: number; form_starts: number; form_completes: number; }
interface SourceRow { source: string; visitors: number; completes: number; conversion: number; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }
  if (!authorized(req)) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }

  try {
    const days = Math.max(1, Math.min(60, Number(req.query.days) || 14));
    const p = pool();

    // Today (UTC) totals
    const today = await p.query<{ event_type: string; count: string; visitors: string }>(
      `SELECT event_type,
              COUNT(*)                      AS count,
              COUNT(DISTINCT visitor_id)    AS visitors
         FROM axau_analytics_events
        WHERE created_at >= date_trunc('day', now())
        GROUP BY event_type`,
    );
    const todayMap: Record<string, { count: number; visitors: number }> = {};
    today.rows.forEach((r) => { todayMap[r.event_type] = { count: Number(r.count), visitors: Number(r.visitors) }; });

    const visitorsToday   = todayMap.page_view?.visitors      ?? 0;
    const ctaClicksToday  = todayMap.cta_click?.count         ?? 0;
    const startsToday     = todayMap.form_start?.visitors     ?? 0;
    const completesToday  = todayMap.form_complete?.visitors  ?? 0;

    // All-time totals
    const totals = await p.query<{ event_type: string; visitors: string }>(
      `SELECT event_type, COUNT(DISTINCT visitor_id) AS visitors
         FROM axau_analytics_events
        GROUP BY event_type`,
    );
    const totalMap: Record<string, number> = {};
    totals.rows.forEach((r) => { totalMap[r.event_type] = Number(r.visitors); });

    const visitorsAll  = totalMap.page_view     ?? 0;
    const ctaAll       = totalMap.cta_click     ?? 0;
    const startsAll    = totalMap.form_start    ?? 0;
    const completesAll = totalMap.form_complete ?? 0;

    // Daily series (last N days)
    const series = await p.query<{ day: string; event_type: string; visitors: string }>(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              event_type,
              COUNT(DISTINCT visitor_id)                            AS visitors
         FROM axau_analytics_events
        WHERE created_at >= now() - ($1 || ' days')::interval
        GROUP BY 1, 2
        ORDER BY 1 ASC`,
      [String(days)],
    );
    const seriesMap = new Map<string, DayBucket>();
    for (const row of series.rows) {
      const day = row.day;
      if (!seriesMap.has(day)) seriesMap.set(day, { day, visitors: 0, cta_clicks: 0, form_starts: 0, form_completes: 0 });
      const b = seriesMap.get(day)!;
      const v = Number(row.visitors);
      if (row.event_type === 'page_view')     b.visitors        = v;
      if (row.event_type === 'cta_click')     b.cta_clicks      = v;
      if (row.event_type === 'form_start')    b.form_starts     = v;
      if (row.event_type === 'form_complete') b.form_completes  = v;
    }
    const dailySeries: DayBucket[] = Array.from(seriesMap.values());

    // Source breakdown (last N days)
    const sources = await p.query<{ source: string; event_type: string; visitors: string }>(
      `SELECT COALESCE(source, 'direct') AS source,
              event_type,
              COUNT(DISTINCT visitor_id) AS visitors
         FROM axau_analytics_events
        WHERE created_at >= now() - ($1 || ' days')::interval
        GROUP BY 1, 2`,
      [String(days)],
    );
    const sourceMap = new Map<string, { visitors: number; completes: number }>();
    for (const r of sources.rows) {
      if (!sourceMap.has(r.source)) sourceMap.set(r.source, { visitors: 0, completes: 0 });
      const s = sourceMap.get(r.source)!;
      const v = Number(r.visitors);
      if (r.event_type === 'page_view')     s.visitors  = v;
      if (r.event_type === 'form_complete') s.completes = v;
    }
    const sourceRows: SourceRow[] = Array.from(sourceMap.entries())
      .map(([source, s]) => ({
        source,
        visitors: s.visitors,
        completes: s.completes,
        conversion: s.visitors > 0 ? Number(((s.completes / s.visitors) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    const topSource = sourceRows[0]?.source ?? null;

    // Spots claimed — best-effort join to access-slots state. We read the
    // identity_users table's submitted count if present; otherwise fall
    // back to form_complete distinct visitors as the proxy.
    let spotsClaimed: number | null = null;
    let spotsTotal: number | null = null;
    try {
      const slotRes = await p.query<{ submitted: string }>(
        `SELECT COUNT(*) AS submitted FROM identity_users WHERE access_status IN ('approved','pending')`,
      );
      spotsClaimed = Number(slotRes.rows[0]?.submitted ?? 0);
    } catch {
      spotsClaimed = completesAll;
    }
    spotsTotal = Number(process.env.AXAU_TOTAL_SPOTS || '500');

    const conversionToday = visitorsToday > 0 ? Number(((completesToday / visitorsToday) * 100).toFixed(2)) : 0;
    const conversionAll   = visitorsAll   > 0 ? Number(((completesAll   / visitorsAll)   * 100).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        today: {
          visitors: visitorsToday,
          ctaClicks: ctaClicksToday,
          formStarts: startsToday,
          formCompletes: completesToday,
          conversionPct: conversionToday,
        },
        allTime: {
          visitors: visitorsAll,
          ctaClicks: ctaAll,
          formStarts: startsAll,
          formCompletes: completesAll,
          conversionPct: conversionAll,
        },
        funnel: {
          visitors: visitorsAll,
          ctaClicks: ctaAll,
          formStarts: startsAll,
          formCompletes: completesAll,
          dropoff: {
            visitorToCta:    visitorsAll > 0 ? Number((((visitorsAll - ctaAll)       / visitorsAll) * 100).toFixed(1)) : 0,
            ctaToStart:      ctaAll      > 0 ? Number((((ctaAll      - startsAll)    / ctaAll)      * 100).toFixed(1)) : 0,
            startToComplete: startsAll   > 0 ? Number((((startsAll   - completesAll) / startsAll)   * 100).toFixed(1)) : 0,
          },
        },
        topSource,
        sources: sourceRows,
        dailySeries,
        spots: { claimed: spotsClaimed, total: spotsTotal, remaining: spotsTotal - (spotsClaimed ?? 0) },
        windowDays: days,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[axau-stats] failed:', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
