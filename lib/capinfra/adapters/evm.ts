/**
 * EVM settlement adapter — Phase 2 stub.
 *
 * Wired into the registry so settlement instructions targeting
 * `settlementType=EVM` can resolve an adapter, but dispatch throws
 * NotImplementedAdapterError. Phase 3 will integrate ethers + the
 * canonical contract registry to broadcast the actual transactions.
 */

import { NotImplementedAdapterError, type SettlementAdapter } from './types';

export const evmAdapter: SettlementAdapter = {
  kind: 'EVM',
  name: 'capinfra-evm-stub',
  async dispatch() {
    throw new NotImplementedAdapterError('EVM');
  },
};
