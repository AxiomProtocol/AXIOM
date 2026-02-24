import { generateText } from '../../../lib/server/gemini';

export interface DealAnalysisInput {
  property: {
    address: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    yearBuilt?: number;
    propertyType?: string;
    lotSize?: number;
  };
  strategy: string;
  assumptions: {
    purchasePrice: number;
    arvEstimate: number;
    rehabBudget: number;
    monthlyRent: number;
    vacancyPct: number;
    interestRate: number;
    downPaymentPct: number;
    loanTermYears: number;
    annualTaxes: number;
    annualInsurance: number;
    propertyMgmtPct: number;
  };
  metrics: {
    noi: number;
    capRate: number;
    cashOnCash: number;
    dscr: number;
    monthlyCashFlow: number;
    annualCashFlow: number;
    breakEvenMonths: number | null;
    rehabRoi: number;
    rentToValue: number;
    grm: number;
  };
  riskFlags: Array<{
    flagType: string;
    severity: string;
    message: string;
  }>;
  dataCompleteness: {
    hasPropertyFacts: boolean;
    hasComps: boolean;
    hasTaxHistory: boolean;
    hasSaleHistory: boolean;
    compsCount: number;
    taxYearsCount: number;
    missingFields: string[];
    score: number;
  };
}

export interface OfferStrategy {
  maxOfferPrice: number;
  offerRationale: string;
  negotiationPoints: string[];
  walkAwayPrice: number;
  walkAwayRationale: string;
}

export interface CreativeStrategy {
  name: string;
  description: string;
  projectedCashFlow: string;
  riskLevel: string;
  requirements: string[];
}

export interface RiskManagementPlan {
  reserveRequirement: number;
  reserveRationale: string;
  contingencies: string[];
  exitScenarios: Array<{
    scenario: string;
    timeline: string;
    projectedOutcome: string;
  }>;
  insuranceConsiderations: string[];
}

export interface DealAnalysisResult {
  verdict: 'DECLINE' | 'CONDITIONAL_PROCEED' | 'PROCEED' | 'STRONG_PROCEED';
  confidence: number;
  confidenceFactors: string[];
  summary: string;
  acquisitionRecommendation: string;
  offerStrategy: OfferStrategy;
  creativeStrategies: CreativeStrategy[];
  riskManagement: RiskManagementPlan;
  pathToViability: string[];
  strengths: string[];
  weaknesses: string[];
  marketContext: string;
  exitStrategyNotes: string;
}

export async function analyzeDeal(input: DealAnalysisInput): Promise<DealAnalysisResult> {
  const loanAmount = input.assumptions.purchasePrice * (1 - input.assumptions.downPaymentPct / 100);
  const totalCashNeeded = (input.assumptions.purchasePrice * input.assumptions.downPaymentPct / 100) +
    input.assumptions.rehabBudget + (input.assumptions.purchasePrice * 0.03);
  const annualDebtService = input.metrics.noi - input.metrics.annualCashFlow;

  const systemPrompt = `You are a senior acquisition advisor for the Axiom Protocol, a governance-first wealth infrastructure. Your role is to provide actionable acquisition intelligence — not just grades, but specific dollar amounts, negotiation tactics, and creative strategies that a buyer can execute immediately.

INSTITUTIONAL BENCHMARKS:
- Minimum acceptable cap rate: 6%
- Minimum acceptable DSCR: 1.25
- Target cash-on-cash return: 8%+
- Maximum acceptable GRM: 15
- Rent-to-value minimum: 0.8%

ANALYTICAL FRAMEWORK:
1. OFFER STRATEGY: Calculate maximum offer price using income approach (NOI / target cap rate), cost approach (ARV - rehab - profit margin), and comparable sales. Recommend the lowest of the three as the starting offer.
2. NEGOTIATION: Identify specific leverage points — days on market, seller motivation, market conditions, property condition issues.
3. CREATIVE ACQUISITION: When conventional financing produces negative cash flow, evaluate: seller financing, subject-to existing mortgage, lease-option, wraparound mortgage, partnership/JV structure, owner carryback with balloon.
4. RISK MANAGEMENT: Calculate specific reserve amounts (typically 6 months of total carrying costs), identify contingencies, and map exit scenarios with projected outcomes.
5. PATH TO VIABILITY: If the deal fails current metrics, show EXACTLY what changes (price, rent, terms) would make it viable.

VERDICT DEFINITIONS:
- STRONG_PROCEED: All metrics exceed institutional minimums. Proceed aggressively.
- PROCEED: Most metrics acceptable. Minor adjustments needed.
- CONDITIONAL_PROCEED: Deal has potential but requires specific conditions (price reduction, creative terms, higher rent). Specify exact conditions.
- DECLINE: Deal fails multiple critical metrics and no reasonable path to viability exists at any price point.

CONFIDENCE CALIBRATION:
Base confidence on data completeness score provided. Reduce confidence when:
- No comparable sales data available (-15%)
- No tax history available (-10%)
- Missing property facts (-5% per missing category)
- Default/estimated assumptions used (-10%)

All dollar amounts must be specific — no ranges wider than 10%. Use the actual property data and computed metrics to derive every number.

Respond ONLY with valid JSON matching this exact schema:
{
  "verdict": "DECLINE" | "CONDITIONAL_PROCEED" | "PROCEED" | "STRONG_PROCEED",
  "confidence": 0.0 to 1.0,
  "confidenceFactors": ["factor reducing or supporting confidence"],
  "summary": "3-4 sentence executive acquisition advisory",
  "acquisitionRecommendation": "2-3 sentence direct recommendation on whether and how to proceed with acquisition",
  "offerStrategy": {
    "maxOfferPrice": <number>,
    "offerRationale": "explanation of how max offer was calculated using income/cost/comparable approaches",
    "negotiationPoints": ["specific negotiation leverage point 1", "point 2", ...],
    "walkAwayPrice": <number>,
    "walkAwayRationale": "explanation of the floor below which the deal destroys value"
  },
  "creativeStrategies": [
    {
      "name": "Strategy Name",
      "description": "How this structure works for this specific deal",
      "projectedCashFlow": "Expected monthly/annual cash flow under this structure",
      "riskLevel": "LOW | MODERATE | HIGH",
      "requirements": ["what buyer needs to execute this"]
    }
  ],
  "riskManagement": {
    "reserveRequirement": <number in dollars>,
    "reserveRationale": "calculation basis for reserves",
    "contingencies": ["specific contingency 1", "contingency 2", ...],
    "exitScenarios": [
      {
        "scenario": "scenario name",
        "timeline": "expected timeline",
        "projectedOutcome": "expected financial outcome"
      }
    ],
    "insuranceConsiderations": ["specific insurance consideration"]
  },
  "pathToViability": ["specific change that would make deal viable with numbers"],
  "strengths": ["deal strength with specific numbers"],
  "weaknesses": ["deal weakness with specific numbers"],
  "marketContext": "2-3 sentences on market positioning and comparable context",
  "exitStrategyNotes": "2-3 sentences on exit viability with specific timelines and projected returns"
}`;

  const propertyLine = [
    input.property.bedrooms ? `${input.property.bedrooms} bed` : null,
    input.property.bathrooms ? `${input.property.bathrooms} bath` : null,
    input.property.squareFootage ? `${input.property.squareFootage.toLocaleString()} sqft` : null,
    input.property.lotSize ? `${input.property.lotSize.toLocaleString()} sqft lot` : null,
    input.property.yearBuilt ? `built ${input.property.yearBuilt}` : null,
    input.property.propertyType || null,
  ].filter(Boolean).join(' | ');

  const userPrompt = `Analyze this acquisition opportunity and provide a complete acquisition plan:

PROPERTY: ${input.property.address}
${propertyLine}

STRATEGY: ${input.strategy.toUpperCase()}

FINANCIAL ASSUMPTIONS:
- Purchase Price: $${input.assumptions.purchasePrice.toLocaleString()}
- After Repair Value (ARV): $${input.assumptions.arvEstimate.toLocaleString()}
- Rehab Budget: $${input.assumptions.rehabBudget.toLocaleString()}
- Total Cash Required: $${totalCashNeeded.toLocaleString()}
- Loan Amount: $${loanAmount.toLocaleString()}
- Down Payment: ${input.assumptions.downPaymentPct}% ($${(input.assumptions.purchasePrice * input.assumptions.downPaymentPct / 100).toLocaleString()})
- Interest Rate: ${input.assumptions.interestRate}%
- Loan Term: ${input.assumptions.loanTermYears} years
- Monthly Rent: $${input.assumptions.monthlyRent.toLocaleString()}
- Vacancy: ${input.assumptions.vacancyPct}%
- Annual Taxes: $${input.assumptions.annualTaxes.toLocaleString()}
- Annual Insurance: $${input.assumptions.annualInsurance.toLocaleString()}
- Management: ${input.assumptions.propertyMgmtPct}%

COMPUTED METRICS:
- NOI: $${input.metrics.noi.toLocaleString()}/year
- Cap Rate: ${input.metrics.capRate.toFixed(2)}%
- Cash-on-Cash Return: ${input.metrics.cashOnCash.toFixed(2)}%
- DSCR: ${input.metrics.dscr.toFixed(2)}
- Monthly Cash Flow: $${input.metrics.monthlyCashFlow.toLocaleString()}
- Annual Cash Flow: $${input.metrics.annualCashFlow.toLocaleString()}
- Annual Debt Service: $${annualDebtService.toLocaleString()}
- GRM: ${input.metrics.grm.toFixed(1)}
- Rent-to-Value: ${input.metrics.rentToValue.toFixed(2)}%
- Rehab ROI: ${input.metrics.rehabRoi.toFixed(1)}%
${input.metrics.breakEvenMonths ? `- Break-Even: ${input.metrics.breakEvenMonths} months` : '- Break-Even: N/A (negative cash flow)'}

RISK FLAGS (${input.riskFlags.length}):
${input.riskFlags.map(f => `- [${f.severity.toUpperCase()}] ${f.message}`).join('\n')}

DATA COMPLETENESS (${(input.dataCompleteness.score * 100).toFixed(0)}%):
- Property facts: ${input.dataCompleteness.hasPropertyFacts ? 'Available' : 'Missing'}
- Comparable sales: ${input.dataCompleteness.hasComps ? `${input.dataCompleteness.compsCount} loaded` : 'None loaded'}
- Tax history: ${input.dataCompleteness.hasTaxHistory ? `${input.dataCompleteness.taxYearsCount} years` : 'None available'}
- Sale history: ${input.dataCompleteness.hasSaleHistory ? 'Available' : 'None available'}
${input.dataCompleteness.missingFields.length > 0 ? `- Missing fields: ${input.dataCompleteness.missingFields.join(', ')}` : ''}

Provide a complete acquisition advisory with specific dollar amounts for offer price, reserves, and exit projections. If the deal fails at current terms, show exactly what price or terms would make it viable. Include at least 2 creative acquisition strategies if conventional financing produces negative cash flow.`;

  const responseText = await generateText(userPrompt, {
    model: 'gemini-2.5-flash',
    systemPrompt,
  });

  let parsed: DealAnalysisResult;
  try {
    const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }
    parsed = JSON.parse(jsonMatch[0]) as DealAnalysisResult;
  } catch (parseErr: any) {
    console.error('AI response parse failed:', parseErr.message, 'Raw response (first 500):', responseText.substring(0, 500));
    parsed = buildFallbackResult(input);
  }

  parsed = normalizeResult(parsed, input);

  return parsed;
}

function buildFallbackResult(input: DealAnalysisInput): DealAnalysisResult {
  const capRateOk = input.metrics.capRate >= 6;
  const dscrOk = input.metrics.dscr >= 1.25;
  const cocOk = input.metrics.cashOnCash >= 8;
  const passing = [capRateOk, dscrOk, cocOk].filter(Boolean).length;

  let verdict: DealAnalysisResult['verdict'] = 'CONDITIONAL_PROCEED';
  if (passing === 3) verdict = 'PROCEED';
  else if (passing === 0) verdict = 'DECLINE';

  return {
    verdict,
    confidence: Math.round(input.dataCompleteness.score * 0.6 * 100) / 100,
    confidenceFactors: ['Fallback analysis — AI response could not be parsed'],
    summary: `Deterministic fallback: ${passing}/3 institutional benchmarks pass (cap rate ${input.metrics.capRate.toFixed(1)}%, DSCR ${input.metrics.dscr.toFixed(2)}, CoC ${input.metrics.cashOnCash.toFixed(1)}%).`,
    acquisitionRecommendation: 'Re-run analysis for full acquisition advisory. Fallback provides metrics-only assessment.',
    offerStrategy: {
      maxOfferPrice: Math.round(input.metrics.noi / 0.08),
      offerRationale: 'Fallback: NOI / 8% target cap rate',
      negotiationPoints: [],
      walkAwayPrice: Math.round(input.metrics.noi / 0.10),
      walkAwayRationale: 'Fallback: NOI / 10% minimum acceptable cap rate',
    },
    creativeStrategies: [],
    riskManagement: {
      reserveRequirement: 0,
      reserveRationale: 'Not calculated in fallback mode',
      contingencies: [],
      exitScenarios: [],
      insuranceConsiderations: [],
    },
    pathToViability: [],
    strengths: [],
    weaknesses: [],
    marketContext: 'Unavailable in fallback mode. Re-run analysis for full market context.',
    exitStrategyNotes: 'Unavailable in fallback mode.',
  };
}

function normalizeResult(parsed: DealAnalysisResult, input: DealAnalysisInput): DealAnalysisResult {
  const validVerdicts: DealAnalysisResult['verdict'][] = ['DECLINE', 'CONDITIONAL_PROCEED', 'PROCEED', 'STRONG_PROCEED'];
  if (!validVerdicts.includes(parsed.verdict)) {
    const upperVerdict = String(parsed.verdict).toUpperCase();
    if (upperVerdict.includes('DECLINE') || upperVerdict.includes('PASS') || upperVerdict.includes('STRONG_PASS')) {
      parsed.verdict = 'DECLINE';
    } else if (upperVerdict.includes('CONDITIONAL') || upperVerdict.includes('HOLD')) {
      parsed.verdict = 'CONDITIONAL_PROCEED';
    } else if (upperVerdict.includes('STRONG') || upperVerdict.includes('BUY')) {
      parsed.verdict = 'STRONG_PROCEED';
    } else {
      parsed.verdict = 'CONDITIONAL_PROCEED';
    }
  }

  let adjustedConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
  adjustedConfidence = Math.min(adjustedConfidence, input.dataCompleteness.score + 0.15);
  adjustedConfidence = Math.max(0.1, Math.min(1.0, adjustedConfidence));
  parsed.confidence = Math.round(adjustedConfidence * 100) / 100;

  const backendFactors: string[] = [];
  if (!input.dataCompleteness.hasComps) backendFactors.push('No comparable sales loaded (-15%)');
  if (!input.dataCompleteness.hasTaxHistory) backendFactors.push('No tax history available (-10%)');
  if (!input.dataCompleteness.hasSaleHistory) backendFactors.push('No sale history available (-5%)');
  if (input.dataCompleteness.missingFields.length > 0) {
    backendFactors.push(`Missing property data: ${input.dataCompleteness.missingFields.join(', ')}`);
  }
  if (input.dataCompleteness.hasComps && input.dataCompleteness.compsCount >= 3) {
    backendFactors.push(`${input.dataCompleteness.compsCount} comparable sales support valuation`);
  }
  backendFactors.push(`Data completeness: ${(input.dataCompleteness.score * 100).toFixed(0)}%`);

  parsed.confidenceFactors = [
    ...(parsed.confidenceFactors || []),
    ...backendFactors,
  ];

  if (!parsed.offerStrategy || typeof parsed.offerStrategy.maxOfferPrice !== 'number') {
    parsed.offerStrategy = {
      maxOfferPrice: 0,
      offerRationale: 'Insufficient data to calculate offer',
      negotiationPoints: [],
      walkAwayPrice: 0,
      walkAwayRationale: 'Insufficient data',
    };
  }
  if (!Array.isArray(parsed.offerStrategy.negotiationPoints)) parsed.offerStrategy.negotiationPoints = [];

  if (!parsed.creativeStrategies || !Array.isArray(parsed.creativeStrategies)) parsed.creativeStrategies = [];

  if (!parsed.riskManagement || typeof parsed.riskManagement.reserveRequirement !== 'number') {
    parsed.riskManagement = {
      reserveRequirement: 0,
      reserveRationale: 'Not calculated',
      contingencies: [],
      exitScenarios: [],
      insuranceConsiderations: [],
    };
  }
  if (!Array.isArray(parsed.riskManagement.contingencies)) parsed.riskManagement.contingencies = [];
  if (!Array.isArray(parsed.riskManagement.exitScenarios)) parsed.riskManagement.exitScenarios = [];
  if (!Array.isArray(parsed.riskManagement.insuranceConsiderations)) parsed.riskManagement.insuranceConsiderations = [];

  if (!Array.isArray(parsed.pathToViability)) parsed.pathToViability = [];
  if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
  if (!Array.isArray(parsed.weaknesses)) parsed.weaknesses = [];
  if (!parsed.summary) parsed.summary = '';
  if (!parsed.acquisitionRecommendation) parsed.acquisitionRecommendation = '';
  if (!parsed.marketContext) parsed.marketContext = '';
  if (!parsed.exitStrategyNotes) parsed.exitStrategyNotes = '';

  return parsed;
}
