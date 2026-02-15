export const SIGNAL_MIN_Z = 1.5;
export const SIGNAL_REJECT_Z = 0.5;
export const INVALIDATION_MIN_ATR_MULT = 1.2;
export const DEFAULT_RISK_FRACTION_BPS = 50;
export const RISK_FRACTION_MIN_BPS = 25;
export const RISK_FRACTION_MAX_BPS = 100;

export const VOL_MULT: Record<string, number> = {
  LOW: 0.6,
  NORMAL: 1.0,
  EXPANDING: 1.2,
  EXTREME: 0.3,
};

export const CONF_MULT: { threshold: number; mult: number }[] = [
  { threshold: 80, mult: 1.4 },
  { threshold: 60, mult: 1.2 },
  { threshold: 40, mult: 1.0 },
  { threshold: 0, mult: 0.5 },
];

export const LIQ_MULT: Record<string, number> = {
  HIGH: 1.0,
  MODERATE: 0.75,
  LOW: 0.50,
  FRAGILE: 0.0,
};

export const MAX_CONCURRENT_TRADES = 5;
export const DRAWDOWN_BRAKE_BPS = 500;
export const ALLOW_SHORTS = true;
export const PAPER_TRADES_ONLY = true;
export const HUMAN_CONFIRMATION_REQUIRED = true;
export const ATR_MULT_FALLBACK = 2.0;
export const MODEL_VERSION = 'mirdt-exec-v1.0.0';
