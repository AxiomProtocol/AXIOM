/**
 * INTERNAL settlement adapter — books a settlement against the canonical
 * spine without touching any external rail. Used for treasury-managed
 * positions, internal transfers, and the Phase 2 smoke harness.
 */

import { generateId } from '../ids';
import type { AdapterDispatchInput, AdapterDispatchResult, SettlementAdapter } from './types';

export const internalAdapter: SettlementAdapter = {
  kind: 'INTERNAL',
  name: 'capinfra-internal',
  async dispatch(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
    const externalRef = `internal:${input.instruction.id}:${generateId('inst').slice(-8)}`;
    return {
      externalRef,
      settledAt: new Date(),
      receiptJson: {
        kind: 'INTERNAL',
        instructionId: input.instruction.id,
        assetSymbol: input.asset.symbol,
        amount: input.instruction.amount,
      },
    };
  },
};
