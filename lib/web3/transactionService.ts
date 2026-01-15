import { ethers } from 'ethers';
import { LAND_ACQUISITION_CONTRACTS } from '../../shared/contracts';

const AXUSD_ADDRESS = '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F';
const MIN_INVESTMENT = ethers.parseEther('100');

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

const LAND_OPTION_REGISTRY_ABI = [
  'function purchaseShares(uint256 optionId, uint256 shareAmount) external',
  'function getShareHolder(uint256 optionId, address investor) view returns (tuple(uint256 shares, uint256 investedAmount, bool kycVerified, uint256 purchaseDate))'
];

const REG_CF_CROWDFUNDING_ABI = [
  'function invest(uint256 campaignId, uint256 amount) external',
  'function getCampaign(uint256 campaignId) view returns (tuple(uint256 campaignId, uint256 landOptionId, string title, uint256 targetAmount, uint256 minInvestment, uint256 maxInvestment, uint256 raisedAmount, uint256 investorCount, uint256 startDate, uint256 endDate, uint8 status, address issuer))'
];

const LAND_ACQUISITION_POOL_ABI = [
  'function joinPool(uint256 poolId) external',
  'function contribute(uint256 poolId) external',
  'function getMember(uint256 poolId, address user) view returns (tuple(uint256 totalContributed, uint256 cyclesCompleted, uint256 joinDate, bool active))'
];

const BUILDER_FARMER_CREDIT_ABI = [
  'function submitApplication(uint8 creditType, uint256 requestedAmount, uint256 collateralValue, uint256 termMonths) external returns (uint256)',
  'function makePayment(uint256 loanId) external',
  'function getApplication(uint256 applicationId) view returns (tuple(uint256 applicationId, address borrower, uint8 creditType, uint256 requestedAmount, uint256 approvedAmount, uint256 interestRateBps, uint256 termMonths, uint256 collateralValue, uint8 status, uint256 createdAt, uint256 approvedAt, uint256 fundedAt))',
  'function getLoan(uint256 loanId) view returns (tuple(uint256 loanId, uint256 applicationId, address borrower, uint256 principal, uint256 interestRateBps, uint256 termMonths, uint256 monthlyPayment, uint256 totalRepaid, uint256 paymentsCompleted, uint256 nextPaymentDue, bool active))',
  'function getBorrowerApplications(address borrower) view returns (uint256[])',
  'function getBorrowerLoans(address borrower) view returns (uint256[])'
];

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  receipt?: ethers.TransactionReceipt;
}

export async function getAXUSDBalance(signer: ethers.Signer): Promise<string> {
  try {
    const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, signer);
    const balance = await axusd.balanceOf(await signer.getAddress());
    return ethers.formatEther(balance);
  } catch (e) {
    console.error('Error getting AXUSD balance:', e);
    return '0';
  }
}

export async function getAXUSDAllowance(signer: ethers.Signer, spender: string): Promise<string> {
  try {
    const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, signer);
    const allowance = await axusd.allowance(await signer.getAddress(), spender);
    return ethers.formatEther(allowance);
  } catch (e) {
    console.error('Error getting allowance:', e);
    return '0';
  }
}

export async function approveAXUSD(signer: ethers.Signer, spender: string, amount: string): Promise<TransactionResult> {
  try {
    const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, signer);
    const amountWei = ethers.parseEther(amount);
    
    const tx = await axusd.approve(spender, amountWei);
    const receipt = await tx.wait();
    
    return { success: true, hash: tx.hash, receipt };
  } catch (e: any) {
    console.error('Error approving AXUSD:', e);
    return { success: false, error: e.message || 'Approval failed' };
  }
}

export async function investInCampaign(
  signer: ethers.Signer,
  campaignId: number,
  amount: string
): Promise<TransactionResult> {
  try {
    const amountWei = ethers.parseEther(amount);
    
    if (amountWei < MIN_INVESTMENT) {
      return { success: false, error: 'Minimum investment is 100 AXUSD' };
    }

    const allowance = await getAXUSDAllowance(signer, LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING);
    if (ethers.parseEther(allowance) < amountWei) {
      const approvalResult = await approveAXUSD(signer, LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING, amount);
      if (!approvalResult.success) {
        return { success: false, error: 'AXUSD approval failed: ' + approvalResult.error };
      }
    }

    const contract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING,
      REG_CF_CROWDFUNDING_ABI,
      signer
    );

    const tx = await contract.invest(campaignId, amountWei);
    const receipt = await tx.wait();

    return { success: true, hash: tx.hash, receipt };
  } catch (e: any) {
    console.error('Error investing in campaign:', e);
    return { success: false, error: e.reason || e.message || 'Investment failed' };
  }
}

export async function purchaseLandShares(
  signer: ethers.Signer,
  optionId: number,
  shareAmount: number
): Promise<TransactionResult> {
  try {
    const contract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.LAND_OPTION_REGISTRY,
      LAND_OPTION_REGISTRY_ABI,
      signer
    );

    const tx = await contract.purchaseShares(optionId, shareAmount);
    const receipt = await tx.wait();

    return { success: true, hash: tx.hash, receipt };
  } catch (e: any) {
    console.error('Error purchasing shares:', e);
    return { success: false, error: e.reason || e.message || 'Share purchase failed' };
  }
}

export async function joinAcquisitionPool(
  signer: ethers.Signer,
  poolId: number
): Promise<TransactionResult> {
  try {
    const contract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.LAND_ACQUISITION_POOL,
      LAND_ACQUISITION_POOL_ABI,
      signer
    );

    const tx = await contract.joinPool(poolId);
    const receipt = await tx.wait();

    return { success: true, hash: tx.hash, receipt };
  } catch (e: any) {
    console.error('Error joining pool:', e);
    return { success: false, error: e.reason || e.message || 'Failed to join pool' };
  }
}

export async function contributeToPool(
  signer: ethers.Signer,
  poolId: number
): Promise<TransactionResult> {
  try {
    const contract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.LAND_ACQUISITION_POOL,
      LAND_ACQUISITION_POOL_ABI,
      signer
    );

    const tx = await contract.contribute(poolId);
    const receipt = await tx.wait();

    return { success: true, hash: tx.hash, receipt };
  } catch (e: any) {
    console.error('Error contributing to pool:', e);
    return { success: false, error: e.reason || e.message || 'Contribution failed' };
  }
}

export async function submitCreditApplication(
  signer: ethers.Signer,
  creditType: 'builder' | 'farmer',
  requestedAmount: string,
  collateralValue: string,
  termMonths: number
): Promise<TransactionResult> {
  try {
    const creditTypeNum = creditType === 'builder' ? 0 : 1;
    const requestedWei = ethers.parseEther(requestedAmount);
    const collateralWei = ethers.parseEther(collateralValue);

    const contract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT,
      BUILDER_FARMER_CREDIT_ABI,
      signer
    );

    const tx = await contract.submitApplication(creditTypeNum, requestedWei, collateralWei, termMonths);
    const receipt = await tx.wait();

    return { success: true, hash: tx.hash, receipt };
  } catch (e: any) {
    console.error('Error submitting credit application:', e);
    return { success: false, error: e.reason || e.message || 'Application failed' };
  }
}

export async function makeLoanPayment(
  signer: ethers.Signer,
  loanId: number
): Promise<TransactionResult> {
  try {
    const contract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT,
      BUILDER_FARMER_CREDIT_ABI,
      signer
    );

    const tx = await contract.makePayment(loanId);
    const receipt = await tx.wait();

    return { success: true, hash: tx.hash, receipt };
  } catch (e: any) {
    console.error('Error making payment:', e);
    return { success: false, error: e.reason || e.message || 'Payment failed' };
  }
}

export async function getBorrowerApplications(signer: ethers.Signer): Promise<number[]> {
  try {
    const contract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT,
      BUILDER_FARMER_CREDIT_ABI,
      signer
    );

    const apps = await contract.getBorrowerApplications(await signer.getAddress());
    return apps.map((id: bigint) => Number(id));
  } catch (e) {
    console.error('Error getting borrower applications:', e);
    return [];
  }
}

export async function getBorrowerLoans(signer: ethers.Signer): Promise<number[]> {
  try {
    const contract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT,
      BUILDER_FARMER_CREDIT_ABI,
      signer
    );

    const loans = await contract.getBorrowerLoans(await signer.getAddress());
    return loans.map((id: bigint) => Number(id));
  } catch (e) {
    console.error('Error getting borrower loans:', e);
    return [];
  }
}

export function getExplorerTxUrl(hash: string): string {
  return `https://arbiscan.io/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `https://arbiscan.io/address/${address}`;
}
