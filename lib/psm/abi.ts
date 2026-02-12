import { ACTIVE_AXUSD, ACTIVE_PSM, EULER_AXUSD, EULER_PSM } from '../../src/config/activeContracts.generated';

export const PSM_ABI = [
  'function axusd() view returns (address)',
  'function collateral() view returns (address)',
  'function debtCeiling() view returns (uint256)',
  'function mintFee() view returns (uint256)',
  'function redeemFee() view returns (uint256)',
  'function paused() view returns (bool)',
  'function mint(uint256 usdcAmount) external returns (uint256)',
  'function redeem(uint256 axusdAmount) external returns (uint256)',
] as const;

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

export const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;
export const USDC_DECIMALS = 6;
export const AXUSD_DECIMALS = 18;

export const PRIMARY_AXUSD = ACTIVE_AXUSD;
export const PRIMARY_PSM = ACTIVE_PSM;
export { EULER_AXUSD, EULER_PSM };
