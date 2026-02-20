import type { AmeThresholds } from './types';

export const AME_VERSION = 'AME-v2.0';

export const DEFAULT_THRESHOLDS: AmeThresholds = {
  crExpansion: parseFloat(process.env.AME_CR_EXPANSION || '1.50'),
  crNormal: parseFloat(process.env.AME_CR_NORMAL || '1.15'),
  crDefensive: parseFloat(process.env.AME_CR_DEFENSIVE || '1.00'),
  rrExpansion: parseFloat(process.env.AME_RR_EXPANSION || '0.25'),
  rrNormal: parseFloat(process.env.AME_RR_NORMAL || '0.10'),
  rrDefensive: parseFloat(process.env.AME_RR_DEFENSIVE || '0.05'),
  vpiDefensive: parseFloat(process.env.AME_VPI_DEFENSIVE || '0.30'),
  vpiShock: parseFloat(process.env.AME_VPI_SHOCK || '0.55'),
  rsrRun: parseFloat(process.env.AME_RSR_RUN || '0.85'),
  lsrFloor: parseFloat(process.env.AME_LSR_FLOOR || '1.00'),
};

export const VPI_WEIGHTS = {
  pegDeviation: 0.30,
  liquidityDepthDrop: 0.25,
  redemptionAcceleration: 0.25,
  correlationSpike: 0.20,
} as const;
// VPI_WEIGHTS must sum to 1.0: 0.30 + 0.25 + 0.25 + 0.20 = 1.00

export const STABILITY_PENALTIES = {
  crBreach: { threshold: 1.15, weight: 30 },
  rrBreach: { threshold: 0.10, weight: 20 },
  lsrBreach: { threshold: 1.00, weight: 20 },
  rsrBreach: { threshold: 0.85, weight: 15 },
  vpiBreach: { threshold: 0.30, weight: 15 },
} as const;

export const YIELD_CONFIG = {
  smfExponent: parseFloat(process.env.AME_SMF_EXPONENT || '1.5'),
  maxYieldPctNormal: 1.0,
  maxYieldPctDefensive: 0.3,
} as const;

export const HARD_BRAKE_RELEASE_CONSECUTIVE = parseInt(process.env.AME_BRAKE_RELEASE_CONSECUTIVE || '3', 10);
