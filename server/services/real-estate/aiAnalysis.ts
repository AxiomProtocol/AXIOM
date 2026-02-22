import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

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
}

export interface DealAnalysisResult {
  verdict: 'strong_buy' | 'buy' | 'hold' | 'pass' | 'strong_pass';
  confidence: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  marketContext: string;
  riskAssessment: string;
  exitStrategyNotes: string;
}

export async function analyzeDeal(input: DealAnalysisInput): Promise<DealAnalysisResult> {
  const systemPrompt = `You are an institutional-grade real estate underwriting analyst for the Axiom Protocol. 
Your role is to provide rigorous, data-driven analysis of investment deals.

Rules:
- Be direct and quantitative. No fluff.
- Reference specific numbers from the deal metrics.
- Compare against institutional benchmarks (cap rate > 6%, DSCR > 1.25, cash-on-cash > 8%).
- Consider the specific strategy (BRRRR, flip, hold, note, multifamily) in your analysis.
- Flag any metric that falls below institutional minimums.
- Your verdict must be justified by the numbers.

Respond ONLY with valid JSON matching this exact schema:
{
  "verdict": "strong_buy" | "buy" | "hold" | "pass" | "strong_pass",
  "confidence": 0.0 to 1.0,
  "summary": "2-3 sentence executive summary",
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "marketContext": "1-2 sentences on market positioning",
  "riskAssessment": "1-2 sentences on overall risk profile",
  "exitStrategyNotes": "1-2 sentences on exit viability for the chosen strategy"
}`;

  const userPrompt = `Analyze this real estate deal:

PROPERTY: ${input.property.address}
${input.property.bedrooms ? `Beds: ${input.property.bedrooms}` : ''} ${input.property.bathrooms ? `Baths: ${input.property.bathrooms}` : ''} ${input.property.squareFootage ? `SF: ${input.property.squareFootage}` : ''}
${input.property.yearBuilt ? `Year Built: ${input.property.yearBuilt}` : ''} ${input.property.propertyType ? `Type: ${input.property.propertyType}` : ''}

STRATEGY: ${input.strategy.toUpperCase()}

ASSUMPTIONS:
- Purchase Price: $${input.assumptions.purchasePrice.toLocaleString()}
- ARV: $${input.assumptions.arvEstimate.toLocaleString()}
- Rehab Budget: $${input.assumptions.rehabBudget.toLocaleString()}
- Monthly Rent: $${input.assumptions.monthlyRent.toLocaleString()}
- Vacancy: ${input.assumptions.vacancyPct}%
- Interest Rate: ${input.assumptions.interestRate}%
- Down Payment: ${input.assumptions.downPaymentPct}%
- Loan Term: ${input.assumptions.loanTermYears} years
- Annual Taxes: $${input.assumptions.annualTaxes.toLocaleString()}
- Annual Insurance: $${input.assumptions.annualInsurance.toLocaleString()}
- Management: ${input.assumptions.propertyMgmtPct}%

COMPUTED METRICS:
- NOI: $${input.metrics.noi.toLocaleString()}
- Cap Rate: ${input.metrics.capRate.toFixed(2)}%
- Cash-on-Cash: ${input.metrics.cashOnCash.toFixed(2)}%
- DSCR: ${input.metrics.dscr.toFixed(2)}
- Monthly Cash Flow: $${input.metrics.monthlyCashFlow.toLocaleString()}
- Annual Cash Flow: $${input.metrics.annualCashFlow.toLocaleString()}
- GRM: ${input.metrics.grm.toFixed(1)}
- Rent-to-Value: ${input.metrics.rentToValue.toFixed(2)}%
- Rehab ROI: ${input.metrics.rehabRoi.toFixed(1)}%
${input.metrics.breakEvenMonths ? `- Break-Even: ${input.metrics.breakEvenMonths} months` : ''}

RISK FLAGS (${input.riskFlags.length}):
${input.riskFlags.map(f => `- [${f.severity.toUpperCase()}] ${f.message}`).join('\n')}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      { role: 'user', content: userPrompt }
    ],
    system: systemPrompt,
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]) as DealAnalysisResult;

  const validVerdicts = ['strong_buy', 'buy', 'hold', 'pass', 'strong_pass'];
  if (!validVerdicts.includes(parsed.verdict)) {
    parsed.verdict = 'hold';
  }
  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
    parsed.confidence = 0.5;
  }

  return parsed;
}
