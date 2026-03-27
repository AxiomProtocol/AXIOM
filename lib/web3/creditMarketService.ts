import { ethers } from 'ethers';
import { CREDIT_MARKET_ADDRESS, ACTIVE_AXUSD } from '../../src/config/activeContracts.generated';
import { CREDIT_MARKET_ABI } from '../../src/config/creditMarket.generated';

const AXUSD_DECIMALS = 18;
const AXUSD_SCALE = BigInt(10 ** AXUSD_DECIMALS);

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
];

function getEthereum() {
  if (typeof window === 'undefined') return null;
  return (window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum ?? null;
}

async function getProvider() {
  const eth = getEthereum();
  if (!eth) throw new Error('No Web3 wallet detected');
  return new ethers.BrowserProvider(eth);
}

async function getSigner() {
  const provider = await getProvider();
  return provider.getSigner();
}

export interface CreditMarketPosition {
  shares: string;
  totalPoolValueUsd: string;
  positionValueUsd: string;
  pendingInterestUsd: string;
  axusdBalanceUsd: string;
  isVerified: boolean;
  sharePrice: string;
  allowanceUsd: string;
}

export async function getCreditMarketPosition(walletAddress: string): Promise<CreditMarketPosition> {
  const provider = await getProvider();

  const market = new ethers.Contract(CREDIT_MARKET_ADDRESS, [...CREDIT_MARKET_ABI], provider);
  const axusd  = new ethers.Contract(ACTIVE_AXUSD, ERC20_ABI, provider);

  const [
    lpSharesRaw,
    totalPoolValueRaw,
    totalLpSharesRaw,
    pendingInterestRaw,
    isVerified,
    axusdBalanceRaw,
    allowanceRaw,
  ] = await Promise.all([
    market.lpShares(walletAddress) as Promise<bigint>,
    market.totalPoolValue()        as Promise<bigint>,
    market.totalLpShares()         as Promise<bigint>,
    market.pendingInterest(walletAddress) as Promise<bigint>,
    market.isLpVerified(walletAddress)    as Promise<boolean>,
    axusd.balanceOf(walletAddress)        as Promise<bigint>,
    axusd.allowance(walletAddress, CREDIT_MARKET_ADDRESS) as Promise<bigint>,
  ]);

  const positionValueRaw =
    totalLpSharesRaw > 0n
      ? (lpSharesRaw * totalPoolValueRaw) / totalLpSharesRaw
      : 0n;

  const sharePriceRaw =
    totalLpSharesRaw > 0n
      ? (totalPoolValueRaw * AXUSD_SCALE) / totalLpSharesRaw
      : AXUSD_SCALE;

  const toUsd = (raw: bigint) => (Number(raw) / 10 ** AXUSD_DECIMALS).toFixed(6);

  return {
    shares:            ethers.formatUnits(lpSharesRaw, AXUSD_DECIMALS),
    totalPoolValueUsd: toUsd(totalPoolValueRaw),
    positionValueUsd:  toUsd(positionValueRaw),
    pendingInterestUsd: toUsd(pendingInterestRaw),
    axusdBalanceUsd:   toUsd(axusdBalanceRaw),
    isVerified,
    sharePrice:        toUsd(sharePriceRaw),
    allowanceUsd:      toUsd(allowanceRaw),
  };
}

export async function approveCreditMarket(amountUsd: string): Promise<{ txHash: string }> {
  const signer = await getSigner();
  const axusd  = new ethers.Contract(ACTIVE_AXUSD, ERC20_ABI, signer);

  const amountRaw = ethers.parseUnits(amountUsd, AXUSD_DECIMALS);
  const tx = await axusd.approve(CREDIT_MARKET_ADDRESS, amountRaw);
  const receipt = await tx.wait(1);
  return { txHash: receipt.hash };
}

export async function depositToCreditMarket(
  amountUsd: string,
  walletAddress: string,
): Promise<{ txHash: string }> {
  const signer = await getSigner();
  const market  = new ethers.Contract(CREDIT_MARKET_ADDRESS, [...CREDIT_MARKET_ABI], signer);

  const amountRaw = ethers.parseUnits(amountUsd, AXUSD_DECIMALS);
  const tx = await market.depositLiquidity(amountRaw);
  const receipt = await tx.wait(1);

  return { txHash: receipt.hash };
}

export async function claimInterestFromCreditMarket(): Promise<{ txHash: string }> {
  const signer = await getSigner();
  const market  = new ethers.Contract(CREDIT_MARKET_ADDRESS, [...CREDIT_MARKET_ABI], signer);

  const tx = await market.claimInterest();
  const receipt = await tx.wait(1);
  return { txHash: receipt.hash };
}

export async function withdrawFromCreditMarket(sharesToBurn: string): Promise<{ txHash: string }> {
  const signer = await getSigner();
  const market  = new ethers.Contract(CREDIT_MARKET_ADDRESS, [...CREDIT_MARKET_ABI], signer);

  const sharesRaw = ethers.parseUnits(sharesToBurn, AXUSD_DECIMALS);
  const tx = await market.withdrawLiquidity(sharesRaw);
  const receipt = await tx.wait(1);
  return { txHash: receipt.hash };
}
