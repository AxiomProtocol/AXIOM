export type FeatureFlag =
  | 'CIRCLE_COMPLIANCE'
  | 'CIRCLE_PAYMASTER'
  | 'CIRCLE_USER_WALLETS'
  | 'BITGO_SYNC'
  | 'RESERVE_AUTO_REFRESH'
  | 'DISCLOSURE_AUTO_SNAPSHOT';

export function isFeatureEnabled(flag: FeatureFlag): boolean {
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
