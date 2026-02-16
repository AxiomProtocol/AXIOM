export const GLOSSARY = {
  THE_WEALTH_PRACTICE: {
    canonical: 'The Wealth Practice',
    short: 'Wealth Practice',
    former: 'SUSU Savings Circle',
    definition: 'A structured group savings and allocation practice with transparent controls, scheduling, and audit trails.',
    whatItIsNot: 'Not an investment product. Not a yield claim. Not a guarantee of returns. Not FDIC insured.',
    tagline: 'Structured savings. Community discipline. On-chain verification.',
    institutionalDescription: 'A programmable group savings framework with deterministic scheduling, participant-level transparency, and cryptographic audit trails. Designed to support disciplined capital formation within community-governed parameters.',
    maturity: 'STAGED' as const,
  },

  AXIOM_PROTOCOL: {
    canonical: 'Axiom Protocol',
    positioning: 'Governance-first wealth infrastructure with disclosure-grade transparency',
    whatItIsNot: 'Not a bank. Not a broker-dealer. Not a registered investment advisor. Not FDIC insured.',
    maturity: 'BOOTSTRAP' as const,
  },

  AXM_TOKEN: {
    canonical: 'AXM',
    definition: 'ERC-20 governance and fee-routing token on Arbitrum One.',
    maturity: 'LIVE' as const,
  },

  AXUSD: {
    canonical: 'AXUSD',
    definition: 'Protocol stablecoin with dual-ecosystem segregation (Primary GENIUS and Euler Original).',
    maturity: 'LIVE' as const,
  },

  SOLVENCY_CONSOLE: {
    canonical: 'Solvency Console',
    definition: 'Three-mode institutional solvency disclosure interface (Allocator, Clearinghouse, Regulatory).',
    maturity: 'LIVE' as const,
  },

  ADAPTIVE_METRICS_ENGINE: {
    canonical: 'Adaptive Metrics Engine (AME)',
    definition: 'Deterministic financial computation engine for regime scoring, adaptive targets, and policy multipliers.',
    maturity: 'LIVE' as const,
  },

  MIRDT: {
    canonical: 'Market Intelligence and Risk Disclosure Terminal',
    short: 'MIRDT',
    definition: 'Probabilistic trend-following analysis with full audit trail. Paper trading only with human confirmation gates.',
    maturity: 'LIVE' as const,
  },

  AXIOM_SENTINEL: {
    canonical: 'Axiom Sentinel',
    definition: 'Unified capital decision and risk authorization layer with cryptographic audit trails.',
    maturity: 'LIVE' as const,
  },

  PHYSICAL_ASSET_PIPELINE: {
    canonical: 'Physical Asset Pipeline',
    definition: 'Framework for bridging digital capital to real-world assets including land acquisition, housing, and food distribution infrastructure.',
    whatItIsNot: 'Not a claim of current ownership. Not a guarantee of acquisition. Physical asset targets are subject to market conditions, regulatory requirements, and governance approval.',
    maturity: 'PLANNED' as const,
  },

  GENIUS_ACT: {
    canonical: 'GENIUS Act',
    safePhrase: 'designed to align with',
    forbiddenPhrases: ['compliant with', 'fully compliant', 'GENIUS Act compliant', 'meets GENIUS Act requirements'],
  },
} as const;

export const MATURITY_LABELS = {
  LIVE: 'Live',
  STAGED: 'Staged Rollout',
  BOOTSTRAP: 'Bootstrap Phase',
  PLANNED: 'Planned',
  CONFIGURED_INACTIVE: 'Configured (Inactive)',
} as const;

export const INSTITUTIONAL_VOCABULARY = {
  smartContracts: 'automated control layers',
  multiSig: 'multi-party authorization',
  defi: 'on-chain financial rails',
  tokenization: 'asset onboarding and issuance',
  staking: 'participation lockup',
  susu: 'The Wealth Practice',
  savingsCircle: 'The Wealth Practice',
  savingsCircles: 'Wealth Practice groups',
  rosca: 'structured group savings framework',
  makeWealthier: 'support disciplined savings and allocation behavior',
  guaranteedReturns: null,
  apy: null,
  profit: null,
  getRich: null,
} as const;

export const FORBIDDEN_PHRASES = [
  'only and sole platform',
  'sole platform',
  'the only platform',
  'become the standard for everyone',
  'people flock',
  'make them wealthier',
  'guaranteed returns',
  'guaranteed yield',
  'get rich',
  'GENIUS Act compliant',
  'fully compliant with GENIUS',
  'we own',
  'owned land',
] as const;

export const SAFE_REPLACEMENTS: Record<string, string[]> = {
  absolutistPositioning: [
    'reference architecture',
    'preferred infrastructure layer',
    'governance-first wealth infrastructure',
    'disclosure-first capital framework',
    'institutional-grade reporting standard',
  ],
  physicalAssetClaims: [
    'land acquisition and asset onboarding framework',
    'physical asset pipeline designed to bridge digital capital and real assets',
    'targeted land acquisition roadmap',
    'asset onboarding readiness framework',
  ],
  wealthOutcomes: [
    'improve capital efficiency',
    'increase financial resilience',
    'expand structural wealth-building capacity',
    'enhance transparency and risk-governed participation',
    'support disciplined savings and allocation behavior',
    'strengthen community capital formation',
  ],
} as const;

export type MaturityStage = keyof typeof MATURITY_LABELS;
