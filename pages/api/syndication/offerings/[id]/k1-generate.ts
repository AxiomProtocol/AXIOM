import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { generateText } from '../../../../../lib/server/gemini';

export const config = {
  maxDuration: 120,
};

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

const DIST_TYPE_LABELS: Record<string, string> = {
  preferred_return: 'Preferred Return',
  profit_share: 'Profit Share',
  return_of_capital: 'Return of Capital',
  refinance_proceeds: 'Refinance Proceeds',
  sale_proceeds: 'Sale Proceeds',
};

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
  const { taxYear, notifyInvestors } = req.body;

  if (!taxYear || isNaN(parseInt(taxYear))) {
    return res.status(400).json({ success: false, error: 'taxYear is required and must be a valid year.' });
  }

  const year = parseInt(taxYear);
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;

  try {
    const offeringRes = await pool.query(
      `SELECT id, name, entity_type, offering_type, preferred_return, promote_split
       FROM syn_offerings WHERE id = $1`,
      [id]
    );
    if (offeringRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offering not found.' });
    }
    const offering = offeringRes.rows[0];

    const investorsRes = await pool.query(
      `SELECT ip.id, ip.legal_name, ip.entity_name, ip.email, ip.tax_id,
              SUM(CAST(ct.ownership_pct AS numeric)) AS ownership_pct,
              SUM(CAST(ct.capital_contributed AS numeric)) AS capital_contributed,
              (ARRAY_AGG(ct.share_class))[1] AS share_class
       FROM syn_investor_profiles ip
       JOIN syn_cap_table ct ON ct.investor_profile_id = ip.id
       WHERE ct.offering_id = $1
       GROUP BY ip.id, ip.legal_name, ip.entity_name, ip.email, ip.tax_id
       ORDER BY ip.legal_name`,
      [id]
    );

    if (investorsRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No investors found in the cap table for this offering.' });
    }

    const distRes = await pool.query(
      `SELECT d.investor_profile_id, d.distribution_type, d.gross_amount, d.net_amount, d.status, d.paid_at
       FROM syn_distributions d
       WHERE d.offering_id = $1
         AND d.status = 'completed'
         AND d.paid_at >= $2 AND d.paid_at < $3
       ORDER BY d.investor_profile_id`,
      [id, yearStart, nextYearStart]
    );

    const subRes = await pool.query(
      `SELECT s.investor_profile_id, s.amount, s.status, s.funded_at
       FROM syn_subscriptions s
       WHERE s.offering_id = $1
         AND s.status = 'funded'
         AND s.funded_at >= $2 AND s.funded_at < $3
       ORDER BY s.investor_profile_id`,
      [id, yearStart, nextYearStart]
    );

    const distByInvestor: Record<string, any[]> = {};
    for (const d of distRes.rows) {
      const key = d.investor_profile_id;
      if (!distByInvestor[key]) distByInvestor[key] = [];
      distByInvestor[key].push(d);
    }

    const subByInvestor: Record<string, any[]> = {};
    for (const s of subRes.rows) {
      const key = s.investor_profile_id;
      if (!subByInvestor[key]) subByInvestor[key] = [];
      subByInvestor[key].push(s);
    }

    const generated: any[] = [];
    let emailsSent = 0;

    for (const investor of investorsRes.rows) {
      const investorDists = distByInvestor[investor.id] || [];
      const investorSubs = subByInvestor[investor.id] || [];

      const distByType: Record<string, number> = {};
      let totalDistributions = 0;
      for (const d of investorDists) {
        const type = d.distribution_type || 'other';
        const amount = parseFloat(d.net_amount || d.gross_amount || '0');
        distByType[type] = (distByType[type] || 0) + amount;
        totalDistributions += amount;
      }

      let totalContributed = 0;
      for (const s of investorSubs) {
        totalContributed += parseFloat(s.amount || '0');
      }

      if (totalContributed === 0) {
        totalContributed = parseFloat(investor.capital_contributed || '0');
      }

      const investorName = investor.legal_name || investor.entity_name || 'Unknown Investor';
      const entityName = investor.entity_name || '';

      const distBreakdown = Object.entries(distByType)
        .map(([type, amount]) => `  ${DIST_TYPE_LABELS[type] || type}: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join('\n');

      const prompt = `Generate a Schedule K-1 tax summary document for a limited partnership investor. This is an informational summary, not an official IRS filing. Use the following data:

OFFERING INFORMATION:
- Offering Name: ${offering.name}
- Entity Name: ${offering.name}
- Entity Type: ${offering.entity_type || 'LLC'}
- Registration Type: ${offering.offering_type || 'Reg D 506(c)'}
- Tax Year: ${year}

INVESTOR INFORMATION:
- Investor Name: ${investorName}
${entityName ? `- Entity Name: ${entityName}` : ''}
- Tax ID: [ON FILE - REDACTED]
- Ownership Percentage: ${investor.ownership_pct || '0'}%
- Share Class: ${investor.share_class || 'Class A'}

CAPITAL ACTIVITY (Tax Year ${year}):
- Total Capital Contributed: $${totalContributed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

DISTRIBUTION ACTIVITY (Tax Year ${year}):
- Total Distributions: $${totalDistributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${distBreakdown ? `Distribution Breakdown:\n${distBreakdown}` : '- No distributions in this period'}

FORMAT REQUIREMENTS:
1. Use a clean, professional format with clear section headers
2. Include the standard K-1 sections: Partner Information, Partner's Share of Income/Deductions/Credits, Capital Account Analysis
3. Use placeholder lines where specific tax data would need CPA review (e.g., ordinary business income allocation, rental income, interest income)
4. Include a Capital Account Analysis section showing beginning balance, contributions, distributions, and ending balance
5. End with a prominent disclaimer that this is an informational summary prepared by the fund manager for investor reference only, not an official IRS Schedule K-1, and the investor should consult their tax advisor
6. Do not include any markdown formatting - use plain text with clear headers and spacing`;

      let k1Content: string;
      try {
        k1Content = await generateText(prompt, {
          model: 'gemini-2.5-flash',
          temperature: 0.3,
          systemPrompt: 'You are a tax document preparation assistant for a real estate private equity fund. Generate clean, professional K-1 summary documents. Use plain text formatting only, no markdown. Be precise with numbers and include appropriate disclaimers.',
        });
      } catch (aiErr: any) {
        console.error(`[K1-Generate] Gemini error for ${investorName}:`, aiErr);
        k1Content = `K-1 SUMMARY — TAX YEAR ${year}\n\nOffering: ${offering.name}\nInvestor: ${investorName}\nOwnership: ${investor.ownership_pct || '0'}%\n\nCapital Contributed: $${totalContributed.toLocaleString('en-US', { minimumFractionDigits: 2 })}\nTotal Distributions: $${totalDistributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n${distBreakdown ? `\nDistribution Breakdown:\n${distBreakdown}` : ''}\n\nNOTE: AI generation unavailable. This is a basic summary only. Consult your tax advisor for official K-1 documentation.`;
      }

      const reportTitle = `K-1 Summary — ${investorName} — Tax Year ${year}`;

      const insertRes = await pool.query(
        `INSERT INTO syn_reports (offering_id, title, report_type, content, period_start, period_end, published_at, published_by, meta)
         VALUES ($1, $2, 'tax', $3, $4, $5, now(), $6, $7::jsonb) RETURNING id`,
        [
          id,
          reportTitle,
          k1Content,
          yearStart,
          `${year}-12-31`,
          wallet.toLowerCase(),
          JSON.stringify({
            k1: true,
            taxYear: year,
            investorProfileId: investor.id,
            investorName,
            totalContributed,
            totalDistributions,
            distributionBreakdown: distByType,
            ownershipPct: investor.ownership_pct,
          }),
        ]
      );

      let emailed = false;
      if (notifyInvestors && investor.email) {
        try {
          const { getResendClient } = await import('../../../../../lib/email/resend');
          const { client, fromEmail } = await getResendClient();

          const subject = `[Axiom Protocol] K-1 Tax Summary — ${offering.name} — Tax Year ${year}`;
          const platformUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'axiomprotocol.app'}`;
          const offeringUrl = `${platformUrl}/syndication/offerings/${id}`;

          const text = `K-1 Tax Summary — ${offering.name}\n\nDear ${investorName},\n\nYour K-1 tax summary for Tax Year ${year} has been generated and is available for your records.\n\n${k1Content}\n\nView your offering: ${offeringUrl}\n\nIMPORTANT: This document is an informational summary only and is not an official IRS Schedule K-1. Please consult your tax advisor for official tax filings.\n\nAxiom Protocol | Capital Formation`;

          await client.emails.send({
            from: fromEmail,
            to: [investor.email],
            subject,
            text,
          });

          emailed = true;
          emailsSent++;
        } catch (emailErr) {
          console.error(`[K1-Generate] Email failed for ${investor.email}:`, emailErr);
        }
      }

      generated.push({
        reportId: insertRes.rows[0].id,
        investorName,
        investorProfileId: investor.id,
        totalContributed,
        totalDistributions,
        emailed,
      });
    }

    return res.status(201).json({
      success: true,
      taxYear: year,
      offeringName: offering.name,
      generated,
      totalGenerated: generated.length,
      totalEmailed: emailsSent,
    });
  } catch (error: any) {
    console.error('[K1-Generate] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
