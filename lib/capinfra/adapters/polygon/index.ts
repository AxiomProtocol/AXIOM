/**
 * Capital Infrastructure — Polygon PoS adapter entry point.
 *
 * The settlement adapter registry imports ONLY this file; all dispatch
 * logic is isolated in ./dispatcher.ts and config in ./config.ts.
 * See §0.1 isolation rule.
 *
 * Phase 5 status: LIVE dispatch implemented. Gate via POLYGON_ADAPTER_MODE=LIVE,
 * CHAIN_POLYGON_ENABLED=true, MULTICHAIN_ENABLED=true, and per-asset allowlist.
 * Default mode is DRY_RUN. See dispatcher.ts for full LIVE pre-conditions.
 */

import type { SettlementAdapter, AdapterDispatchInput } from '../types';
import { dispatchPolygon } from './dispatcher';

export const polygonAdapter: SettlementAdapter = {
  kind: 'POLYGON',
  name: 'capinfra-polygon',
  async dispatch(input: AdapterDispatchInput) {
    return dispatchPolygon(input);
  },
};

export { POLYGON_ADAPTER_KIND, resolveMode, resolveAllowlist } from './config';
