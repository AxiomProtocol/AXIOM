import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

const OPERATOR_WALLETS = [
  '0xb0cefc7e3f1c7de3b98e8c39384e9e084c9eb75c',
];

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(cookie => {
        const [key, ...val] = cookie.trim().split('=');
        const sanitizedKey = key.replace(/[^\w\-_.]/g, '');
        const sanitizedVal = val.join('=').replace(/[^\w\-_.=]/g, '');
        return [sanitizedKey, sanitizedVal];
      })
      .filter(([key]) => key.length > 0)
  );
}

async function getAuthenticatedWallet(req: NextApiRequest): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (!sessionToken) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    return result.rows.length > 0 ? result.rows[0].wallet_address : null;
  } catch {
    return null;
  }
}

function isOperator(wallet: string): boolean {
  return OPERATOR_WALLETS.includes(wallet.toLowerCase());
}

interface WaterfallTranche {
  name: string;
  lpAmount: number;
  gpAmount: number;
  total: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!isOperator(wallet)) {
    return res.status(403).json({ success: false, error: 'Operator access required.' });
  }

  const { id } = req.query;

  try {
    const { grossAmount, periodStart, periodEnd, capitalDeployed, preferredRate: overrideRate } = req.body;

    const gross = parseFloat(grossAmount);
    if (!grossAmount || !isFinite(gross) || gross <= 0) {
      return res.status(400).json({ success: false, error: 'grossAmount must be a positive number.' });
    }

    if (periodStart && periodEnd) {
      const s = new Date(periodStart);
      const e = new Date(periodEnd);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid date format for periodStart or periodEnd.' });
      }
      if (e < s) {
        return res.status(400).json({ success: false, error: 'periodEnd must be on or after periodStart.' });
      }
    }

    if (capitalDeployed && (!isFinite(parseFloat(capitalDeployed)) || parseFloat(capitalDeployed) < 0)) {
      return res.status(400).json({ success: false, error: 'capitalDeployed must be a non-negative number.' });
    }

    if (overrideRate && (!isFinite(parseFloat(overrideRate)) || parseFloat(overrideRate) < 0)) {
      return res.status(400).json({ success: false, error: 'preferredRate must be a non-negative number.' });
    }

    const offeringRes = await pool.query(
      `SELECT preferred_return, promote_split, waterfall_terms FROM syn_offerings WHERE id = $1`,
      [id]
    );

    if (offeringRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offering not found.' });
    }

    const offering = offeringRes.rows[0];
    const preferredRate = overrideRate && parseFloat(overrideRate) >= 0
      ? parseFloat(overrideRate) / 100
      : parseFloat(offering.preferred_return || '0') / 100;
    const gpPromotePct = parseFloat(offering.promote_split || '20') / 100;
    const lpSplitPct = 1 - gpPromotePct;

    let capital = capitalDeployed ? parseFloat(capitalDeployed) : 0;
    if (!capital || capital <= 0) {
      const capRes = await pool.query(
        `SELECT COALESCE(SUM(capital_contributed), 0) AS total_capital FROM syn_cap_table WHERE offering_id = $1`,
        [id]
      );
      capital = parseFloat(capRes.rows[0].total_capital || '0');
    }

    let fractionOfYear = 1;
    if (periodStart && periodEnd) {
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.max(diffMs / (1000 * 60 * 60 * 24), 0);
      fractionOfYear = diffDays / 365;
    }

    const tranches: WaterfallTranche[] = [];
    let remaining = gross;

    let prefReturnAmount = 0;
    if (preferredRate > 0 && capital > 0) {
      prefReturnAmount = round2(preferredRate * capital * fractionOfYear);
      const prefTranche = Math.min(prefReturnAmount, remaining);
      tranches.push({
        name: 'Preferred Return',
        lpAmount: round2(prefTranche),
        gpAmount: 0,
        total: round2(prefTranche),
      });
      remaining = round2(remaining - prefTranche);
    }

    if (remaining > 0 && gpPromotePct > 0.5 && prefReturnAmount > 0) {
      const targetGpShare = (gpPromotePct / lpSplitPct) * prefReturnAmount;
      const catchUp = Math.min(targetGpShare, remaining);
      if (catchUp > 0) {
        tranches.push({
          name: 'GP Catch-Up',
          lpAmount: 0,
          gpAmount: round2(catchUp),
          total: round2(catchUp),
        });
        remaining = round2(remaining - catchUp);
      }
    }

    if (remaining > 0) {
      const lpResidual = round2(remaining * lpSplitPct);
      const gpResidual = round2(remaining - lpResidual);
      tranches.push({
        name: 'Residual Split',
        lpAmount: lpResidual,
        gpAmount: gpResidual,
        total: round2(remaining),
      });
      remaining = 0;
    }

    if (tranches.length === 0) {
      tranches.push({
        name: 'Straight Split',
        lpAmount: round2(gross * lpSplitPct),
        gpAmount: round2(gross * gpPromotePct),
        total: gross,
      });
    }

    const totalLp = round2(tranches.reduce((s, t) => s + t.lpAmount, 0));
    const totalGp = round2(tranches.reduce((s, t) => s + t.gpAmount, 0));

    return res.status(200).json({
      success: true,
      waterfall: {
        grossAmount: gross,
        capitalDeployed: capital,
        preferredRate: preferredRate * 100,
        gpPromotePct: gpPromotePct * 100,
        lpSplitPct: lpSplitPct * 100,
        fractionOfYear: round4(fractionOfYear),
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        tranches,
        totals: {
          lpAmount: totalLp,
          gpAmount: totalGp,
          total: round2(totalLp + totalGp),
        },
      },
    });
  } catch (error: any) {
    console.error('[Waterfall] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
