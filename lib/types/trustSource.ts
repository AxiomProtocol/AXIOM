export const TrustSource = {
  ONCHAIN_VERIFIED: 'onchain_verified',
  BANK_REPORTED: 'bank_reported',
  CUSTODIAN_REPORTED: 'custodian_reported',
  PROVIDER_API_REPORTED: 'provider_api_reported',
  FOUNDER_ATTESTED: 'founder_attested',
  MANUALLY_ENTERED: 'manually_entered',
  UNAVAILABLE: 'unavailable',
} as const;

export type TrustSource = typeof TrustSource[keyof typeof TrustSource];

export interface TrustClassification {
  source: TrustSource;
  confidence: 'high' | 'medium' | 'low';
  lastVerifiedAt: string | null;
  note?: string;
}

export const TRUST_CONFIDENCE: Record<TrustSource, 'high' | 'medium' | 'low'> = {
  onchain_verified: 'high',
  bank_reported: 'high',
  custodian_reported: 'medium',
  provider_api_reported: 'medium',
  founder_attested: 'low',
  manually_entered: 'low',
  unavailable: 'low',
};

export function classify(
  source: TrustSource,
  lastVerifiedAt: Date | string | null = null,
  note?: string,
): TrustClassification {
  return {
    source,
    confidence: TRUST_CONFIDENCE[source],
    lastVerifiedAt: lastVerifiedAt ? new Date(lastVerifiedAt).toISOString() : null,
    note,
  };
}
