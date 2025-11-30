import StakingHubABI from './abis/StakingHub.json';
import TreasuryHubABI from './abis/TreasuryHub.json';
import AXMTokenABI from './abis/AXMToken.json';

export { CONTRACTS, ARBITRUM_ONE, VAULT_IDS } from './config';
export * from './utils/contractHelpers';

export const ABIS = {
  StakingHub: StakingHubABI,
  TreasuryHub: TreasuryHubABI,
  AXMToken: AXMTokenABI,
} as const;
