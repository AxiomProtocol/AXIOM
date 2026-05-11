/**
 * Capital Infrastructure — Avalanche C-Chain adapter entry point.
 *
 * The settlement adapter registry imports ONLY this file; all dispatch
 * logic is isolated in ./dispatcher.ts and config in ./config.ts.
 * See §0.1 isolation rule.
 */

import type { SettlementAdapter, AdapterDispatchInput } from '../types';
import { dispatchAvalanche } from './dispatcher';

export const avalancheAdapter: SettlementAdapter = {
  kind: 'AVALANCHE',
  name: 'capinfra-avalanche',
  async dispatch(input: AdapterDispatchInput) {
    return dispatchAvalanche(input);
  },
};

export { AVALANCHE_ADAPTER_KIND, resolveMode, resolveAllowlist } from './config';
