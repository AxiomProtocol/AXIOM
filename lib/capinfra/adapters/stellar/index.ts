/**
 * Capital Infrastructure — Stellar adapter (Phase 3B.1a entry point).
 *
 * The settlement adapter registry imports ONLY this file; partner SDK
 * imports are walled off inside `./sdk.ts`. See §0.1 isolation rule.
 */

import type { SettlementAdapter, AdapterDispatchInput, AdapterWebhookVerifyInput } from '../types';
import { dispatchStellar } from './dispatcher';
import { stellarHealth } from './health';
import { verifyStellarWebhook } from './webhook';
import { loadStellarConfig } from './config';

export const stellarAdapter: SettlementAdapter = {
  kind: 'STELLAR',
  name: 'capinfra-stellar',
  async dispatch(input: AdapterDispatchInput) {
    return dispatchStellar(input);
  },
  async health() {
    return stellarHealth();
  },
  async verifyWebhook(input: AdapterWebhookVerifyInput) {
    const cfg = await loadStellarConfig();
    if (!cfg) {
      return {
        verified: false,
        reasonCode: 'ADAPTER_NOT_CONFIGURED',
        externalEventId: null,
        eventType: null,
      };
    }
    return verifyStellarWebhook(input, cfg);
  },
};

export { STELLAR_ADAPTER_KIND, loadStellarConfig, requireStellarConfig } from './config';
export { stellarHealth };
