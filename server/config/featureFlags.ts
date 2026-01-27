/**
 * Feature Flags - Observation Mode Configuration
 * 
 * This module controls all feature flags for the observation window.
 * During observation mode, all external fund flows are blocked.
 */

export const featureFlags = {
  // Master observation gate
  observationMode: process.env.OBSERVATION_MODE !== 'false',
  
  // Internal modules (enabled during observation)
  treasuryInternalEnabled: process.env.TREASURY_INTERNAL_ENABLED !== 'false',
  privateCreditSelfFundedEnabled: process.env.PRIVATE_CREDIT_SELF_FUNDED_ENABLED !== 'false',
  
  // External modules (MUST remain disabled during observation)
  regCfEnabled: process.env.REG_CF_ENABLED === 'true',
  institutionalLpEnabled: process.env.INSTITUTIONAL_LP_ENABLED === 'true',
  externalDepositsEnabled: process.env.EXTERNAL_DEPOSITS_ENABLED === 'true',
  investorOnboardingEnabled: process.env.INVESTOR_ONBOARDING_ENABLED === 'true',
};

export function isInObservationMode(): boolean {
  return featureFlags.observationMode;
}

export function canAcceptExternalFunds(): boolean {
  return !featureFlags.observationMode && featureFlags.externalDepositsEnabled;
}

export function isTreasuryInternalEnabled(): boolean {
  return featureFlags.treasuryInternalEnabled;
}

export function isPrivateCreditSelfFundedEnabled(): boolean {
  return featureFlags.privateCreditSelfFundedEnabled;
}

export function isRegCfEnabled(): boolean {
  return !featureFlags.observationMode && featureFlags.regCfEnabled;
}

export function isInstitutionalLpEnabled(): boolean {
  return !featureFlags.observationMode && featureFlags.institutionalLpEnabled;
}

export function isInvestorOnboardingEnabled(): boolean {
  return !featureFlags.observationMode && featureFlags.investorOnboardingEnabled;
}

export function getObservationModeStatus() {
  return {
    active: featureFlags.observationMode,
    startDate: '2026-01-26',
    minEndDate: '2026-03-26',
    maxEndDate: '2026-07-26',
    enabledModules: {
      treasuryInternal: featureFlags.treasuryInternalEnabled,
      privateCreditSelfFunded: featureFlags.privateCreditSelfFundedEnabled,
    },
    blockedModules: {
      regCf: 'BLOCKED - Not active during observation',
      institutionalLp: 'BLOCKED - Not active during observation',
      externalDeposits: 'BLOCKED - Not active during observation',
      investorOnboarding: 'BLOCKED - Not active during observation',
    },
  };
}

export const BANNED_CTA_WORDS = [
  'invest',
  'deposit',
  'buy now',
  'contribute',
  'roi',
  'returns',
  'yield',
  'apy',
  'earn',
  'subscribe',
];

export function containsBannedCTA(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BANNED_CTA_WORDS.some(word => lowerText.includes(word));
}
