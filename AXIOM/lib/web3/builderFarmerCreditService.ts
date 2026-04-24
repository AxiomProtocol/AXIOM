import { ethers } from 'ethers';
import { LAND_ACQUISITION_CONTRACTS } from '../../shared/contracts';
import { BuilderFarmerCreditABI } from './landAcquisitionAbi';

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

const CreditType = ['Builder', 'Farmer'];
const ApplicationStatus = ['Pending', 'UnderReview', 'Approved', 'Rejected', 'Funded', 'Repaying', 'PaidOff', 'Defaulted'];

export interface CreditTier {
  type: string;
  maxLTV: number;
  interestRateBps: number;
  interestRatePercent: number;
  maxTermMonths: number;
  minCollateralValue: string;
}

export interface CreditApplication {
  applicationId: number;
  borrower: string;
  creditType: string;
  requestedAmount: string;
  approvedAmount: string;
  interestRateBps: number;
  termMonths: number;
  collateralValue: string;
  status: string;
  createdAt: number;
  approvedAt: number;
  fundedAt: number;
}

export interface CreditLoan {
  loanId: number;
  applicationId: number;
  borrower: string;
  principal: string;
  interestRateBps: number;
  termMonths: number;
  monthlyPayment: string;
  totalRepaid: string;
  paymentsCompleted: number;
  nextPaymentDue: number;
  active: boolean;
}

function getProvider() {
  return new ethers.JsonRpcProvider(ARBITRUM_RPC);
}

export async function getCreditTiers(): Promise<CreditTier[]> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT, BuilderFarmerCreditABI, provider);
    
    const tiers: CreditTier[] = [];
    
    for (let i = 0; i < 2; i++) {
      const tier = await contract.getCreditTier(i);
      tiers.push({
        type: CreditType[i],
        maxLTV: Number(tier.maxLTV) / 100,
        interestRateBps: Number(tier.interestRateBps),
        interestRatePercent: Number(tier.interestRateBps) / 100,
        maxTermMonths: Number(tier.maxTermMonths),
        minCollateralValue: ethers.formatEther(tier.minCollateralValue)
      });
    }
    
    return tiers;
  } catch (error) {
    console.error('Error fetching credit tiers:', error);
    return [];
  }
}

export async function getCreditApplication(applicationId: number): Promise<CreditApplication | null> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT, BuilderFarmerCreditABI, provider);
    
    const app = await contract.getApplication(applicationId);
    if (!app || app.applicationId === 0n) return null;

    return {
      applicationId: Number(app.applicationId),
      borrower: app.borrower,
      creditType: CreditType[Number(app.creditType)] || 'Unknown',
      requestedAmount: ethers.formatEther(app.requestedAmount),
      approvedAmount: ethers.formatEther(app.approvedAmount),
      interestRateBps: Number(app.interestRateBps),
      termMonths: Number(app.termMonths),
      collateralValue: ethers.formatEther(app.collateralValue),
      status: ApplicationStatus[Number(app.status)] || 'Unknown',
      createdAt: Number(app.createdAt),
      approvedAt: Number(app.approvedAt),
      fundedAt: Number(app.fundedAt)
    };
  } catch (error) {
    console.error('Error fetching credit application:', error);
    return null;
  }
}

export async function getCreditLoan(loanId: number): Promise<CreditLoan | null> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT, BuilderFarmerCreditABI, provider);
    
    const loan = await contract.getLoan(loanId);
    if (!loan || loan.loanId === 0n) return null;

    return {
      loanId: Number(loan.loanId),
      applicationId: Number(loan.applicationId),
      borrower: loan.borrower,
      principal: ethers.formatEther(loan.principal),
      interestRateBps: Number(loan.interestRateBps),
      termMonths: Number(loan.termMonths),
      monthlyPayment: ethers.formatEther(loan.monthlyPayment),
      totalRepaid: ethers.formatEther(loan.totalRepaid),
      paymentsCompleted: Number(loan.paymentsCompleted),
      nextPaymentDue: Number(loan.nextPaymentDue),
      active: loan.active
    };
  } catch (error) {
    console.error('Error fetching credit loan:', error);
    return null;
  }
}

export async function getCreditStats() {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT, BuilderFarmerCreditABI, provider);
    
    const [nextAppId, nextLoanId, tiers] = await Promise.all([
      contract.nextApplicationId(),
      contract.nextLoanId(),
      getCreditTiers()
    ]);
    
    return {
      totalApplications: Number(nextAppId) - 1,
      totalLoans: Number(nextLoanId) - 1,
      creditTiers: tiers
    };
  } catch (error) {
    console.error('Error fetching credit stats:', error);
    return { totalApplications: 0, totalLoans: 0, creditTiers: [] };
  }
}

export async function testCreditContractConnectivity(): Promise<boolean> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT, BuilderFarmerCreditABI, provider);
    await contract.nextApplicationId();
    return true;
  } catch (error) {
    console.error('BuilderFarmerCredit connection failed:', error);
    return false;
  }
}
