import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { generateText } from '../../../../../lib/server/gemini';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../../server/services/real-estate/helpers';

export const config = {
  maxDuration: 120,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT analysis_data, saved_at FROM re_saved_analysis
         WHERE deal_id = $1 AND analysis_type = 'acquisition_memo'
         ORDER BY saved_at DESC LIMIT 1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({ data: null });
      }

      return successResponse(res, {
        memo: result.rows[0].analysis_data,
        savedAt: result.rows[0].saved_at,
      }, buildMeta(['internal_db'], 1.0));
    } catch (err: any) {
      return errorResponse(res, 500, 'INTERNAL_ERROR', err.message);
    }
  }

  if (req.method === 'POST') {
    try {
      const { scenarioId } = req.body;
      if (!scenarioId || typeof scenarioId !== 'string') {
        return errorResponse(res, 400, 'INVALID_PARAMS', 'scenarioId is required');
      }

      const dealResult = await pool.query(
        `SELECT d.id, d.strategy, d.deal_name, d.status, d.property_id, d.notes, d.meta as deal_meta,
                p.address_raw, p.address_normalized,
                p.bedrooms, p.bathrooms, p.sqft, p.year_built, p.property_type, p.lot_sqft,
                p.city, p.state, p.zip, p.county
         FROM re_deals d
         JOIN re_properties p ON d.property_id = p.id
         WHERE d.id = $1`,
        [id]
      );
      if (dealResult.rows.length === 0) {
        return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
      }
      const deal = dealResult.rows[0];

      const assumptionsResult = await pool.query(
        `SELECT * FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`,
        [scenarioId]
      );
      if (assumptionsResult.rows.length === 0) {
        return errorResponse(res, 400, 'NO_ASSUMPTIONS', 'No assumptions found. Run underwriting first.');
      }
      const a = assumptionsResult.rows[0];

      const metricsResult = await pool.query(
        `SELECT * FROM re_deal_metrics WHERE scenario_id = $1 LIMIT 1`,
        [scenarioId]
      );
      if (metricsResult.rows.length === 0) {
        return errorResponse(res, 400, 'NO_METRICS', 'No metrics found. Run underwriting first.');
      }
      const m = metricsResult.rows[0];

      const riskFlagsResult = await pool.query(
        `SELECT flag_type, severity, message FROM re_risk_flags WHERE scenario_id = $1`,
        [scenarioId]
      );

      const compsResult = await pool.query(
        `SELECT address, sale_price, price_per_sqft, sqft, bedrooms, bathrooms, distance_miles, sale_date
         FROM re_comparables WHERE deal_id = $1 AND sale_price > 0
         ORDER BY distance_miles ASC NULLS LAST LIMIT 15`,
        [id]
      );

      let ddStatus = { total: 0, complete: 0, inProgress: 0, blocked: 0, notStarted: 0, categories: [] as any[] };
      try {
        const ddResult = await pool.query(
          `SELECT cl.id as checklist_id
           FROM dd_checklists cl WHERE cl.deal_id = $1 LIMIT 1`,
          [id]
        );
        if (ddResult.rows.length > 0) {
          const checklistId = ddResult.rows[0].checklist_id;
          const itemsResult = await pool.query(
            `SELECT category, status, name FROM dd_checklist_items WHERE checklist_id = $1 ORDER BY sort_order`,
            [checklistId]
          );
          const items = itemsResult.rows;
          ddStatus.total = items.length;
          ddStatus.complete = items.filter((i: any) => i.status === 'complete').length;
          ddStatus.inProgress = items.filter((i: any) => i.status === 'inProgress').length;
          ddStatus.blocked = items.filter((i: any) => i.status === 'blocked').length;
          ddStatus.notStarted = items.filter((i: any) => i.status === 'notStarted').length;

          const catMap: Record<string, { total: number; complete: number }> = {};
          for (const item of items) {
            if (!catMap[item.category]) catMap[item.category] = { total: 0, complete: 0 };
            catMap[item.category].total++;
            if (item.status === 'complete') catMap[item.category].complete++;
          }
          ddStatus.categories = Object.entries(catMap).map(([cat, counts]) => ({
            category: cat,
            ...counts,
          }));
        }
      } catch {}

      let savedAnalysis: any = null;
      try {
        const analysisResult = await pool.query(
          `SELECT analysis_data FROM re_saved_analysis
           WHERE deal_id = $1 AND scenario_id = $2 AND (analysis_type = 'ai_advisory' OR analysis_type IS NULL)
           ORDER BY saved_at DESC LIMIT 1`,
          [id, scenarioId]
        );
        if (analysisResult.rows.length > 0) {
          savedAnalysis = analysisResult.rows[0].analysis_data;
        }
      } catch {}

      let documentExtractions: any[] = [];
      try {
        const docsResult = await pool.query(
          `SELECT file_name, doc_type, extracted_data FROM re_deal_documents
           WHERE deal_id = $1 AND extracted_data IS NOT NULL LIMIT 10`,
          [id]
        );
        documentExtractions = docsResult.rows;
      } catch {}

      const purchasePrice = parseNumeric(a.purchase_price);
      const rehabBudget = parseNumeric(a.rehab_budget);
      const downPaymentPct = parseNumeric(a.down_payment_pct);
      const closingCostPct = parseNumeric(a.closing_cost_pct, 3);
      const downPayment = purchasePrice * (downPaymentPct / 100);
      const closingCosts = purchasePrice * (closingCostPct / 100);
      const debtAmount = purchasePrice - downPayment;
      const totalCapitalRequired = purchasePrice + rehabBudget + closingCosts;
      const equityGap = totalCapitalRequired - debtAmount;
      const ltv = purchasePrice > 0 ? (debtAmount / purchasePrice) * 100 : 0;

      const propertyLine = [
        deal.bedrooms ? `${deal.bedrooms} bed` : null,
        deal.bathrooms ? `${deal.bathrooms} bath` : null,
        deal.sqft ? `${Number(deal.sqft).toLocaleString()} sqft` : null,
        deal.lot_sqft ? `${Number(deal.lot_sqft).toLocaleString()} sqft lot` : null,
        deal.year_built ? `built ${deal.year_built}` : null,
        deal.property_type || null,
      ].filter(Boolean).join(' | ');

      const compsSection = compsResult.rows.length > 0
        ? compsResult.rows.map((c: any) =>
            `- ${c.address}: $${Number(c.sale_price).toLocaleString()}${c.price_per_sqft ? ` ($${c.price_per_sqft}/sqft)` : ''}${c.distance_miles ? ` ${c.distance_miles}mi` : ''}`
          ).join('\n')
        : 'No comparable sales loaded';

      const riskSection = riskFlagsResult.rows.length > 0
        ? riskFlagsResult.rows.map((f: any) => `- [${f.severity.toUpperCase()}] ${f.message}`).join('\n')
        : 'No risk flags identified';

      const ddSection = ddStatus.total > 0
        ? `Progress: ${ddStatus.complete}/${ddStatus.total} items complete (${Math.round(ddStatus.complete / ddStatus.total * 100)}%)\n` +
          `In Progress: ${ddStatus.inProgress} | Blocked: ${ddStatus.blocked} | Not Started: ${ddStatus.notStarted}\n` +
          ddStatus.categories.map((c: any) => `  - ${c.category}: ${c.complete}/${c.total} complete`).join('\n')
        : 'Due diligence checklist not yet initialized';

      const analysisSection = savedAnalysis
        ? `Verdict: ${savedAnalysis.verdict} (${Math.round((savedAnalysis.confidence || 0) * 100)}% confidence)\n` +
          `Summary: ${savedAnalysis.summary || 'N/A'}\n` +
          `Max Offer: $${(savedAnalysis.offerStrategy?.maxOfferPrice || 0).toLocaleString()}\n` +
          `Strengths: ${(savedAnalysis.strengths || []).join('; ') || 'N/A'}\n` +
          `Weaknesses: ${(savedAnalysis.weaknesses || []).join('; ') || 'N/A'}`
        : 'No AI advisory analysis saved';

      const docSection = documentExtractions.length > 0
        ? documentExtractions.map((d: any) => `- ${d.file_name} (${d.doc_type}): ${JSON.stringify(d.extracted_data).substring(0, 200)}`).join('\n')
        : 'No documents with extracted data';

      const systemPrompt = `You are a senior real estate acquisitions analyst preparing an institutional-grade acquisition memorandum for the Axiom Protocol. Write a structured, professional memo that synthesizes all available data into a comprehensive document suitable for an investment committee review.

The memo must be thorough, data-driven, and actionable. Use specific dollar amounts and percentages throughout. Format the output as a JSON object with the following sections as string fields containing the narrative text.

Respond ONLY with valid JSON matching this schema:
{
  "executiveSummary": "2-3 paragraph executive summary covering the opportunity, key metrics, and recommendation",
  "propertySnapshot": "Detailed property description including location, physical characteristics, and market positioning",
  "financialOverview": "Comprehensive financial analysis covering acquisition costs, financing structure, operating projections, and return metrics",
  "strategyComparison": "Analysis of the current strategy and how it compares to alternatives. Discuss why the selected strategy is optimal or suggest alternatives",
  "riskSummary": "Detailed risk assessment organized by category (market, financial, physical, operational) with mitigation strategies",
  "dueDiligenceStatus": "Summary of due diligence progress, completed items, outstanding items, and any blockers",
  "capitalReadiness": "Analysis of capital requirements, funding structure, equity gap, and recommended funding channels",
  "recommendedNextSteps": "Prioritized list of 5-8 specific next steps with clear owners and timelines",
  "memoDate": "ISO date string",
  "dealGrade": "A+ through F based on overall analysis"
}`;

      const userPrompt = `Generate an institutional acquisition memorandum for the following deal:

DEAL: ${deal.deal_name}
STATUS: ${deal.status}
STRATEGY: ${deal.strategy?.toUpperCase()}

PROPERTY: ${deal.address_normalized || deal.address_raw}
${propertyLine}
Location: ${[deal.city, deal.state, deal.zip].filter(Boolean).join(', ')}${deal.county ? ` (${deal.county} County)` : ''}

FINANCIAL ASSUMPTIONS:
- Purchase Price: $${purchasePrice.toLocaleString()}
- ARV Estimate: $${parseNumeric(a.arv_estimate).toLocaleString()}
- Rehab Budget: $${rehabBudget.toLocaleString()}
- Down Payment: ${downPaymentPct}% ($${downPayment.toLocaleString()})
- Interest Rate: ${parseNumeric(a.interest_rate)}%
- Loan Term: ${parseNumeric(a.loan_term_years)} years
- Monthly Rent: $${parseNumeric(a.monthly_rent).toLocaleString()}
- Vacancy: ${parseNumeric(a.vacancy_pct)}%
- Management: ${parseNumeric(a.property_mgmt_pct)}%
- Annual Taxes: $${parseNumeric(a.annual_taxes).toLocaleString()}
- Annual Insurance: $${parseNumeric(a.annual_insurance).toLocaleString()}

COMPUTED METRICS:
- NOI: $${parseNumeric(m.noi).toLocaleString()}/year
- Cap Rate: ${parseNumeric(m.cap_rate).toFixed(2)}%
- Cash-on-Cash: ${parseNumeric(m.cash_on_cash).toFixed(2)}%
- DSCR: ${parseNumeric(m.dscr).toFixed(2)}
- Monthly Cash Flow: $${parseNumeric(m.monthly_cash_flow).toLocaleString()}
- Annual Cash Flow: $${parseNumeric(m.annual_cash_flow).toLocaleString()}
- GRM: ${parseNumeric(m.grm).toFixed(1)}
- Rent-to-Value: ${parseNumeric(m.rent_to_value).toFixed(2)}%
- Deal Grade: ${m.deal_grade || 'N/A'} (Score: ${m.deal_score || 'N/A'})

CAPITAL STRUCTURE:
- Total Capital Required: $${totalCapitalRequired.toLocaleString()}
- Sponsor Contribution: $${equityGap.toLocaleString()}
- Debt Amount: $${debtAmount.toLocaleString()}
- Equity Gap: $${equityGap.toLocaleString()}
- LTV: ${ltv.toFixed(1)}%

RISK FLAGS:
${riskSection}

COMPARABLE SALES (${compsResult.rows.length}):
${compsSection}

DUE DILIGENCE STATUS:
${ddSection}

AI ADVISORY ANALYSIS:
${analysisSection}

DOCUMENT EXTRACTIONS:
${docSection}

${deal.notes ? `DEAL NOTES: ${deal.notes}` : ''}

Generate a comprehensive, institutional-grade acquisition memorandum synthesizing all of the above data. Be specific with numbers and actionable with recommendations.`;

      let memoText: string;
      const startTime = Date.now();
      try {
        memoText = await generateText(userPrompt, {
          model: 'gemini-2.5-flash',
          systemPrompt,
          thinkingBudget: 4096,
        });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[memo] Gemini responded in ${elapsed}s, length=${memoText.length}`);
      } catch (err: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`[memo] Gemini failed after ${elapsed}s:`, err.message);
        return errorResponse(res, 500, 'AI_ERROR', `Memo generation failed: ${err.message}`);
      }

      let memo: any;
      try {
        const cleaned = memoText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found');
        memo = JSON.parse(jsonMatch[0]);
      } catch (parseErr: any) {
        console.error('[memo] JSON parse failed:', parseErr.message);
        memo = {
          executiveSummary: memoText.substring(0, 2000),
          propertySnapshot: 'Parse error — raw memo text stored in executive summary',
          financialOverview: '',
          strategyComparison: '',
          riskSummary: '',
          dueDiligenceStatus: '',
          capitalReadiness: '',
          recommendedNextSteps: '',
          memoDate: new Date().toISOString(),
          dealGrade: m.deal_grade || 'N/A',
        };
      }

      memo.memoDate = memo.memoDate || new Date().toISOString();
      memo.dealName = deal.deal_name;
      memo.propertyAddress = deal.address_normalized || deal.address_raw;
      memo.strategy = deal.strategy;
      memo.generatedAt = new Date().toISOString();

      await pool.query(
        `DELETE FROM re_saved_analysis WHERE deal_id = $1 AND analysis_type = 'acquisition_memo'`,
        [id]
      );

      await pool.query(
        `INSERT INTO re_saved_analysis (deal_id, scenario_id, analysis_type, analysis_data)
         VALUES ($1, $2, 'acquisition_memo', $3)`,
        [id, scenarioId, JSON.stringify(memo)]
      );

      return successResponse(res, { memo, generatedAt: memo.generatedAt }, buildMeta(['internal_db', 'ai_analysis'], 0.9));
    } catch (err: any) {
      console.error('Memo generation error:', err.message, err.stack);
      return errorResponse(res, 500, 'INTERNAL_ERROR', `Memo generation failed: ${err.message}`);
    }
  }

  return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'GET or POST only');
}
