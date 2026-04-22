import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { Pool } from 'pg';

// ────────────────────────────────────────────────────────────────────
// AXAU launch analytics — public POST endpoint.
// Records: page_view | cta_click | form_start | form_complete
// Auto-detects source attribution from referrer + utm params.
// No PII stored. IP+UA are sha256-hashed for visitor de-dup only.
// ────────────────────────────────────────────────────────────────────

// AXAU funnel events + general surface events (homepage, etc).
const ALLOWED_EVENTS = new Set([
  'page_view',
  'cta_click',
  'form_start',
  'form_complete',
  'section_view',
  'scroll_depth',
  'outbound_click',
]);
const ALLOWED_SURFACES = new Set(['axau', 'homepage']);

let _pool: Pool | null = null;
function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? true : undefined,
    max: 3,
    connectionTimeoutMillis: 6000,
    idleTimeoutMillis: 10_000,
  });
  return _pool;
}

function detectSource(opts: { referrer: string; utmSource: string; ref: string }): string {
  const utm = (opts.utmSource || '').toLowerCase().trim();
  if (utm) {
    if (/^(x|twitter)$/.test(utm))           return 'x';
    if (utm === 'linkedin')                  return 'linkedin';
    if (utm === 'discord')                   return 'discord';
    if (utm === 'email' || utm === 'mail')   return 'email';
    if (utm === 'direct')                    return 'direct';
    return utm.slice(0, 32);
  }
  const ref = (opts.ref || '').toLowerCase().trim();
  if (ref === 'discord') return 'discord';
  if (ref === 'email' || ref === 'newsletter') return 'email';

  const r = (opts.referrer || '').toLowerCase();
  if (!r) return 'direct';
  if (/(^https?:\/\/)?([a-z0-9-]+\.)*(twitter\.com|x\.com|t\.co)/.test(r)) return 'x';
  if (/(^https?:\/\/)?([a-z0-9-]+\.)*linkedin\.com/.test(r))               return 'linkedin';
  if (/(^https?:\/\/)?([a-z0-9-]+\.)*(discord\.com|discord\.gg)/.test(r))  return 'discord';
  if (/mail|gmail|outlook|yahoo|substack|beehiiv/.test(r))                 return 'email';
  return 'other';
}

function clientIp(req: NextApiRequest): string {
  const fwd = (req.headers['x-forwarded-for'] as string | undefined) || '';
  const first = fwd.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};
    const eventType = String(body.eventType || '').trim();
    if (!ALLOWED_EVENTS.has(eventType)) {
      return res.status(400).json({ success: false, error: 'invalid_event_type' });
    }

    const surfaceRaw = String(body.surface || 'axau').toLowerCase().trim();
    const surface = ALLOWED_SURFACES.has(surfaceRaw) ? surfaceRaw : 'axau';
    const visitorId = String(body.visitorId || '').slice(0, 64) || 'anon';
    const path      = String(body.path || '/axau-early-access').slice(0, 200);
    const referrer  = String(body.referrer || req.headers.referer || '').slice(0, 500);
    const utmSource = String(body.utmSource || '').slice(0, 64);
    const utmMedium = String(body.utmMedium || '').slice(0, 64);
    const utmCampaign = String(body.utmCampaign || '').slice(0, 128);
    const ref       = String(body.ref || '').slice(0, 64);
    const meta      = body.meta && typeof body.meta === 'object' ? body.meta : {};
    const ua        = String(req.headers['user-agent'] || '').slice(0, 300);

    const source = detectSource({ referrer, utmSource, ref });
    const ipHash = createHash('sha256').update(`${clientIp(req)}|${ua}`).digest('hex').slice(0, 32);

    await pool().query(
      `INSERT INTO axau_analytics_events
        (surface, event_type, visitor_id, source, utm_campaign, utm_medium, referrer, path, meta, ip_hash, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
      [surface, eventType, visitorId, source, utmCampaign, utmMedium, referrer, path, JSON.stringify(meta), ipHash, ua],
    );

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[axau-analytics] insert failed:', msg);
    // Tracking must never break the user flow — return 200 so beacon
    // calls and form completions never throw client-side.
    return res.status(200).json({ success: false, error: 'logged_only' });
  }
}
