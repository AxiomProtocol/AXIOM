import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { propertyReports } from '../../../../shared/propertySchema';
import { desc, and, sql, inArray } from 'drizzle-orm';

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Statuses where a buyer "owns" the report (a payment was confirmed or the
// report was delivered). We deliberately exclude `pending` and `expired` so
// the listing only shows real receipts.
const VISIBLE_STATUSES = ['paid', 'generating', 'ready', 'failed'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, wallet, page = '1', limit = '10' } = req.query;

    if (!email && !wallet) {
      return res.status(400).json({ error: 'email or wallet parameter required' });
    }

    let condition;
    if (wallet) {
      const w = String(wallet).trim();
      if (!WALLET_RE.test(w)) {
        return res.status(400).json({ error: 'Invalid wallet address. Expected 0x followed by 40 hex chars.' });
      }
      // Wallet matches are case-insensitive — addresses are stored lowercased
      // by confirm-payment but legacy rows may differ.
      condition = sql`lower(${propertyReports.buyerWallet}) = ${w.toLowerCase()}`;
    } else {
      const e = String(email).trim();
      if (!EMAIL_RE.test(e)) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
      condition = sql`lower(${propertyReports.buyerEmail}) = ${e.toLowerCase()}`;
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereExpr = and(
      condition,
      inArray(propertyReports.status, [...VISIBLE_STATUSES]),
    );

    const reports = await db.select({
      id: propertyReports.id,
      createdAt: propertyReports.createdAt,
      tier: propertyReports.tier,
      status: propertyReports.status,
      addressRaw: propertyReports.addressRaw,
      addressNormalized: propertyReports.addressNormalized,
      city: propertyReports.city,
      state: propertyReports.state,
      valueMid: propertyReports.valueMid,
      rentMid: propertyReports.rentMid,
      confidenceScore: propertyReports.confidenceScore,
      dealGrade: propertyReports.dealGrade,
      // On-chain receipt fields (task #247).
      paymentTxHash: propertyReports.paymentTxHash,
      paymentChainId: propertyReports.paymentChainId,
      paymentFromAddress: propertyReports.paymentFromAddress,
      paymentConfirmedAt: propertyReports.paymentConfirmedAt,
      amountPaidCents: propertyReports.amountPaidCents,
      buyerWallet: propertyReports.buyerWallet,
    })
      .from(propertyReports)
      .where(whereExpr)
      .orderBy(desc(propertyReports.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(propertyReports)
      .where(whereExpr);

    // Mark repeat purchases — a row is a duplicate if the buyer has an earlier
    // report for the same normalized address. This makes accidental
    // double-pays easy to spot in the UI and discourages new payment intents
    // for an address the buyer already owns a report for.
    //
    // We compute the canonical "first purchase" id across the buyer's *full*
    // matching set (not just the current page) so a duplicate on page 2 is
    // still flagged when the original sits on page 1 — earlier the detection
    // was page-local, which silently under-warned heavy buyers.
    const firstByAddress = await db.select({
      key: sql<string>`lower(coalesce(${propertyReports.addressNormalized}, ${propertyReports.addressRaw}))`,
      firstId: sql<string>`(array_agg(${propertyReports.id}::text order by ${propertyReports.createdAt} asc))[1]`,
    })
      .from(propertyReports)
      .where(whereExpr)
      .groupBy(sql`lower(coalesce(${propertyReports.addressNormalized}, ${propertyReports.addressRaw}))`);

    const firstIdByKey = new Map<string, string>();
    for (const row of firstByAddress) {
      if (row.key && row.firstId) firstIdByKey.set(row.key, row.firstId);
    }

    const annotated = reports.map((r) => {
      const key = (r.addressNormalized || r.addressRaw || '').trim().toLowerCase();
      const firstId = key ? firstIdByKey.get(key) : null;
      return {
        ...r,
        isRepeatPurchase: !!firstId && firstId !== r.id,
      };
    });

    return res.status(200).json({
      reports: annotated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limitNum),
      },
    });
  } catch (err: any) {
    console.error('Reports list error:', err.message);
    return res.status(500).json({ error: 'Could not fetch reports' });
  }
}
