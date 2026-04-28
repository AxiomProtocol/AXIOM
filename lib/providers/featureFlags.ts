export type FeatureFlag =
  | 'CIRCLE_COMPLIANCE'
  | 'CIRCLE_PAYMASTER'
  | 'CIRCLE_USER_WALLETS'
  | 'BITGO_SYNC'
  | 'INCREASE_SYNC'
  | 'RESERVE_AUTO_REFRESH'
  | 'DISCLOSURE_AUTO_SNAPSHOT';

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Increase kill switch (account cancelled 2026-04-28): when the provider is
  // disabled, INCREASE_SYNC must always report disabled regardless of any
  // residual FEATURE_INCREASE_SYNC=true setting in the environment.
  if (flag === 'INCREASE_SYNC' && process.env.INCREASE_DISABLED === 'true') {
    return false;
  }
  return process.env[`FEATURE_${flag}`] === 'true';
}

export function getBitGoMode(): 'express' | 'direct' {
  return process.env.BITGO_USE_EXPRESS === 'true' ? 'express' : 'direct';
}

export function getBitGoApiUrl(): string {
  const configured = process.env.BITGO_API_URL;
  if (configured) return configured;
  return getBitGoMode() === 'express'
    ? 'http://localhost:3080'
    : 'https://app.bitgo.com';
}
