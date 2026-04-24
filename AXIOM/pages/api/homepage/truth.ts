import type { NextApiRequest, NextApiResponse } from 'next';
import { homepageTruthService, type HeroCtaVariant } from '../../../lib/services/HomepageTruthService';

const VALID_CTA: HeroCtaVariant[] = ['start_here', 'open_account', 'begin_verification'];

function parseCta(raw: unknown): HeroCtaVariant | undefined {
  if (typeof raw !== 'string') return undefined;
  return VALID_CTA.includes(raw as HeroCtaVariant) ? (raw as HeroCtaVariant) : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ctaOverride = parseCta(req.query.cta);
  const debug = req.query.debug === '1' || req.query.debug === 'true';

  try {
    if (debug) {
      // Debug payload is uncached so ops sees fresh state.
      const payload = await homepageTruthService.resolveDebug({ ctaOverride });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, debug: true, ...payload });
    }

    const truth = await homepageTruthService.resolve({ ctaOverride });
    // CTA override should never poison shared cache.
    res.setHeader('Cache-Control', ctaOverride ? 'no-store' : 'public, max-age=30, s-maxage=30');
    return res.status(200).json({ success: true, data: truth });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[api/homepage/truth]', message);
    return res.status(500).json({ success: false, error: 'Failed to resolve homepage truth' });
  }
}
