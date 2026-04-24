import type { ComplianceProvider, ScreeningResponse } from './types';

const CIRCLE_COMPLIANCE_BASE_URL = 'https://api.circle.com/v1/w3s';

export class CircleComplianceService implements ComplianceProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async screen(address: string, chain = 'ARB'): Promise<ScreeningResponse> {
    const response = await fetch(`${CIRCLE_COMPLIANCE_BASE_URL}/compliance/screening/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        chain,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Circle compliance API error ${response.status}: ${text}`);
    }

    const json = await response.json();
    const data = json?.data ?? json;

    const result = mapCircleDecision(data?.decision ?? data?.result ?? 'UNKNOWN');
    const riskScore = typeof data?.riskScore === 'number' ? data.riskScore : 0;
    const riskCategories: string[] = Array.isArray(data?.riskCategories) ? data.riskCategories : [];

    return {
      result,
      riskScore,
      riskCategories,
      source: 'circle',
      screenedAt: new Date().toISOString(),
    };
  }
}

function mapCircleDecision(decision: string): 'APPROVED' | 'DENIED' | 'REVIEW' {
  const d = String(decision).toUpperCase();
  if (d === 'APPROVED' || d === 'CLEAR') return 'APPROVED';
  if (d === 'DENIED' || d === 'BLOCKED' || d === 'HIT') return 'DENIED';
  return 'REVIEW';
}
