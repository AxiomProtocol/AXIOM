import { describe, expect, it } from 'vitest';
import {
  CAMELOT_USDC_AXUSD_V3_STRATEGY,
  classifyCamelotRoute,
  resolveCanonicalCamelotStrategyAddress,
} from './camelotStrategyRoutes';

describe('camelot strategy route classification', () => {
  it('resolves legacy route as deprecated position manager', () => {
    const result = classifyCamelotRoute('0x511441D31e629d7513004a692c2dB67438151696');
    expect(result.classification).toBe('legacy_position_manager');
    expect(result.deprecationCode).toBe('POSITION_MANAGER_NO_BYTECODE');
  });

  it('resolves v2 route as deprecated tick spacing', () => {
    const result = classifyCamelotRoute('0x2Ef29EA19f490bbC61959C29Eb1566e4a62fA29F');
    expect(result.classification).toBe('v2_tick_spacing');
    expect(result.deprecationCode).toBe('INVALID_TICK_SPACING');
  });

  it('maps deprecated routes to canonical v3 strategy', () => {
    expect(resolveCanonicalCamelotStrategyAddress('0x511441D31e629d7513004a692c2dB67438151696')).toBe(
      CAMELOT_USDC_AXUSD_V3_STRATEGY,
    );
    expect(resolveCanonicalCamelotStrategyAddress('0x2Ef29EA19f490bbC61959C29Eb1566e4a62fA29F')).toBe(CAMELOT_USDC_AXUSD_V3_STRATEGY);
  });
});
