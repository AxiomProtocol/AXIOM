import { getAddress, type Address } from 'viem';

export const CAMELOT_USDC_AXUSD_V3_STRATEGY = getAddress('0x958F533112cA68078Ba37aEb5ee977c289C81829');
export const CAMELOT_LEGACY_STRATEGY = getAddress('0x511441D31e629d7513004a692c2dB67438151696');
export const CAMELOT_V2_STRATEGY = getAddress('0x2Ef29EA19f490bbC61959C29Eb1566e4a62fA29F');
export const CAMELOT_V2_COMPACT_ADDRESS = CAMELOT_V2_STRATEGY;

export type CamelotRouteDeprecationCode =
  | 'POSITION_MANAGER_NO_BYTECODE'
  | 'INVALID_TICK_SPACING';

export type CamelotRouteClassification =
  | 'canonical_v3'
  | 'legacy_position_manager'
  | 'v2_tick_spacing'
  | 'custom_noncanonical'
  | 'invalid';

const V2_PREFIX = '0x2ef2';
const V2_SUFFIX = 'a29f';
const V2_COMPACT_REGEX = /^0x2ef2.*a29f$/i;

function parseAddress(value: string | undefined | null): Address | null {
  if (!value) return null;
  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

function matchesCompactV2Address(address: Address): boolean {
  const normalized = address.toLowerCase();
  return normalized.startsWith(V2_PREFIX) && normalized.endsWith(V2_SUFFIX);
}

function matchesCompactV2Input(value: string | undefined | null): boolean {
  if (!value) return false;
  return V2_COMPACT_REGEX.test(value.trim());
}

export function classifyCamelotRoute(address: string | undefined | null): {
  classification: CamelotRouteClassification;
  deprecationCode: CamelotRouteDeprecationCode | null;
  resolvedAddress: Address | null;
} {
  if (matchesCompactV2Input(address)) {
    return {
      classification: 'v2_tick_spacing',
      deprecationCode: 'INVALID_TICK_SPACING',
      resolvedAddress: null,
    };
  }

  const resolved = parseAddress(address);
  if (!resolved) {
    return {
      classification: 'invalid',
      deprecationCode: null,
      resolvedAddress: null,
    };
  }

  if (resolved.toLowerCase() === CAMELOT_USDC_AXUSD_V3_STRATEGY.toLowerCase()) {
    return {
      classification: 'canonical_v3',
      deprecationCode: null,
      resolvedAddress: resolved,
    };
  }

  if (resolved.toLowerCase() === CAMELOT_LEGACY_STRATEGY.toLowerCase()) {
    return {
      classification: 'legacy_position_manager',
      deprecationCode: 'POSITION_MANAGER_NO_BYTECODE',
      resolvedAddress: resolved,
    };
  }

  if (matchesCompactV2Address(resolved)) {
    return {
      classification: 'v2_tick_spacing',
      deprecationCode: 'INVALID_TICK_SPACING',
      resolvedAddress: resolved,
    };
  }

  return {
    classification: 'custom_noncanonical',
    deprecationCode: null,
    resolvedAddress: resolved,
  };
}

export function resolveCanonicalCamelotStrategyAddress(envValue: string | undefined): Address {
  const evaluated = classifyCamelotRoute(envValue);
  if (evaluated.classification === 'invalid') return CAMELOT_USDC_AXUSD_V3_STRATEGY;
  if (evaluated.deprecationCode) return CAMELOT_USDC_AXUSD_V3_STRATEGY;
  return evaluated.resolvedAddress ?? CAMELOT_USDC_AXUSD_V3_STRATEGY;
}
