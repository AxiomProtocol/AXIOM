/**
 * Capital Infrastructure — ACH adapter entry point.
 *
 * The settlement adapter registry imports ONLY this file; partner HTTP
 * client calls are walled off inside ./sdk.ts. See §0.1 isolation rule.
 */

import type { SettlementAdapter, AdapterDispatchInput, AdapterWebhookVerifyInput } from '../types';
import { dispatchAch, dispatchAchAfterOperatorApproval } from './dispatcher';
import { achHealth } from './health';
import { verifyAchWebhook } from './webhook';
import { loadAchConfig } from './config';

export const achAdapter: SettlementAdapter = {
  kind: 'ACH',
  name: 'capinfra-ach',
  async dispatch(input: AdapterDispatchInput) {
    return dispatchAch(input);
  },
  async dispatchAfterApproval(input: AdapterDispatchInput) {
    return dispatchAchAfterOperatorApproval(input);
  },
  async health() {
    return achHealth();
  },
  async verifyWebhook(input: AdapterWebhookVerifyInput) {
    const cfg = await loadAchConfig();
    if (!cfg) {
      return {
        verified: false,
        reasonCode: 'ADAPTER_NOT_CONFIGURED',
        externalEventId: null,
        eventType: null,
      };
    }
    return verifyAchWebhook(input, cfg);
  },
};

export { ACH_ADAPTER_KIND, loadAchConfig, requireAchConfig } from './config';
export { achHealth };
