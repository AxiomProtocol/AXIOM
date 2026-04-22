import { ethers } from 'ethers';
import { LAND_ACQUISITION_CONTRACTS } from '../../shared/contracts';
import { LandOptionRegistryABI, LandAcquisitionPoolABI, RegCFCrowdfundingABI } from './landAcquisitionAbi';

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

const OptionStatus = ['Draft', 'Active', 'OptionFeePaid', 'ExerciseReady', 'Exercised', 'Expired', 'Cancelled'];
const PoolStatus = ['Forming', 'Active', 'Funded', 'Distributed', 'Cancelled'];
const CampaignStatus = ['Draft', 'Live', 'Funded', 'Closed', 'Cancelled'];

export interface LandOption {
  optionId: number;
  parcelId: string;
  location: string;
  acreage: number;
  purchasePrice: string;
  optionFee: string;
  optionPeriodDays: number;
  status: string;
  totalShares: number;
  sharesSold: number;
  minInvestment: string;
  maxInvestment: string;
  regCFCompliant: boolean;
  expiresAt: number;
  createdAt: number;
  investorCount: number;
  fundingProgress: number;
}

export interface AcquisitionPool {
  poolId: number;
  landOptionId: number;
  name: string;
  targetAmount: string;
  monthlyContribution: string;
  memberLimit: number;
  memberCount: number;
  totalContributed: string;
  cycleCount: number;
  currentCycle: number;
  status: string;
  fundingProgress: number;
}

export interface CrowdfundingCampaign {
  campaignId: number;
  landOptionId: number;
  title: string;
  targetAmount: string;
  minInvestment: string;
  maxInvestment: string;
  raisedAmount: string;
  investorCount: number;
  startDate: number;
  endDate: number;
  status: string;
  fundingProgress: number;
}

function getProvider() {
  return new ethers.JsonRpcProvider(ARBITRUM_RPC);
}

// Land Option Registry Functions
export async function getLandOption(optionId: number): Promise<LandOption | null> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.LAND_OPTION_REGISTRY, LandOptionRegistryABI, provider);
    
    const [core, meta, investorCount] = await Promise.all([
      contract.getOptionCore(optionId),
      contract.getOptionMeta(optionId),
      contract.getInvestorCount(optionId)
    ]);

    if (!core || core.optionId === 0n) return null;

    const purchasePrice = ethers.formatEther(core.purchasePrice);
    const sharesSold = Number(meta.sharesSold);
    const totalShares = Number(meta.totalShares);
    const fundingProgress = totalShares > 0 ? (sharesSold / totalShares) * 100 : 0;

    return {
      optionId: Number(core.optionId),
      parcelId: meta.parcelId,
      location: meta.location,
      acreage: Number(core.acreage),
      purchasePrice,
      optionFee: ethers.formatEther(core.optionFee),
      optionPeriodDays: Number(core.optionPeriodDays),
      status: OptionStatus[Number(core.status)] || 'Unknown',
      totalShares: Number(meta.totalShares),
      sharesSold: Number(meta.sharesSold),
      minInvestment: ethers.formatEther(meta.minInvestment),
      maxInvestment: ethers.formatEther(meta.maxInvestment),
      regCFCompliant: meta.regCFCompliant,
      expiresAt: Number(core.expiresAt),
      createdAt: Number(core.createdAt),
      investorCount: Number(investorCount),
      fundingProgress
    };
  } catch (error) {
    console.error('Error fetching land option:', error);
    return null;
  }
}

export async function getAllLandOptions(): Promise<LandOption[]> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.LAND_OPTION_REGISTRY, LandOptionRegistryABI, provider);
    
    const nextId = await contract.nextOptionId();
    const options: LandOption[] = [];
    
    for (let i = 1; i < Number(nextId); i++) {
      const option = await getLandOption(i);
      if (option && option.status !== 'Draft') {
        options.push(option);
      }
    }
    
    return options;
  } catch (error) {
    console.error('Error fetching all land options:', error);
    return [];
  }
}

// Land Acquisition Pool Functions
export async function getPool(poolId: number): Promise<AcquisitionPool | null> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.LAND_ACQUISITION_POOL, LandAcquisitionPoolABI, provider);
    
    const pool = await contract.getPool(poolId);
    if (!pool || pool.poolId === 0n) return null;

    const targetAmount = ethers.formatEther(pool.targetAmount);
    const totalContributed = ethers.formatEther(pool.totalContributed);
    const fundingProgress = parseFloat(targetAmount) > 0 
      ? (parseFloat(totalContributed) / parseFloat(targetAmount)) * 100 
      : 0;

    return {
      poolId: Number(pool.poolId),
      landOptionId: Number(pool.landOptionId),
      name: pool.name,
      targetAmount,
      monthlyContribution: ethers.formatEther(pool.monthlyContribution),
      memberLimit: Number(pool.memberLimit),
      memberCount: Number(pool.memberCount),
      totalContributed,
      cycleCount: Number(pool.cycleCount),
      currentCycle: Number(pool.currentCycle),
      status: PoolStatus[Number(pool.status)] || 'Unknown',
      fundingProgress
    };
  } catch (error) {
    console.error('Error fetching pool:', error);
    return null;
  }
}

export async function getAllPools(): Promise<AcquisitionPool[]> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.LAND_ACQUISITION_POOL, LandAcquisitionPoolABI, provider);
    
    const nextId = await contract.nextPoolId();
    const pools: AcquisitionPool[] = [];
    
    for (let i = 1; i < Number(nextId); i++) {
      const pool = await getPool(i);
      if (pool) pools.push(pool);
    }
    
    return pools;
  } catch (error) {
    console.error('Error fetching all pools:', error);
    return [];
  }
}

// Crowdfunding Campaign Functions
export async function getCampaign(campaignId: number): Promise<CrowdfundingCampaign | null> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING, RegCFCrowdfundingABI, provider);
    
    const campaign = await contract.getCampaign(campaignId);
    if (!campaign || campaign.campaignId === 0n) return null;

    const targetAmount = ethers.formatEther(campaign.targetAmount);
    const raisedAmount = ethers.formatEther(campaign.raisedAmount);
    const fundingProgress = parseFloat(targetAmount) > 0 
      ? (parseFloat(raisedAmount) / parseFloat(targetAmount)) * 100 
      : 0;

    return {
      campaignId: Number(campaign.campaignId),
      landOptionId: Number(campaign.landOptionId),
      title: campaign.title,
      targetAmount,
      minInvestment: ethers.formatEther(campaign.minInvestment),
      maxInvestment: ethers.formatEther(campaign.maxInvestment),
      raisedAmount,
      investorCount: Number(campaign.investorCount),
      startDate: Number(campaign.startDate),
      endDate: Number(campaign.endDate),
      status: CampaignStatus[Number(campaign.status)] || 'Unknown',
      fundingProgress
    };
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return null;
  }
}

export async function getAllCampaigns(): Promise<CrowdfundingCampaign[]> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING, RegCFCrowdfundingABI, provider);
    
    const nextId = await contract.nextCampaignId();
    const campaigns: CrowdfundingCampaign[] = [];
    
    for (let i = 1; i < Number(nextId); i++) {
      const campaign = await getCampaign(i);
      if (campaign && campaign.status !== 'Draft') {
        campaigns.push(campaign);
      }
    }
    
    return campaigns;
  } catch (error) {
    console.error('Error fetching all campaigns:', error);
    return [];
  }
}

export async function getPlatformStats() {
  try {
    const provider = getProvider();
    const crowdfundingContract = new ethers.Contract(
      LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING, 
      RegCFCrowdfundingABI, 
      provider
    );
    
    const totalRaised = await crowdfundingContract.totalPlatformRaised();
    
    return {
      totalRaised: ethers.formatEther(totalRaised)
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return { totalRaised: '0' };
  }
}

// Land Acquisition Contract connectivity test
export async function testLandContractConnectivity(): Promise<{
  landOptionRegistry: boolean;
  landAcquisitionPool: boolean;
  regCFCrowdfunding: boolean;
}> {
  const provider = getProvider();
  const results = {
    landOptionRegistry: false,
    landAcquisitionPool: false,
    regCFCrowdfunding: false
  };
  
  try {
    const landRegistry = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.LAND_OPTION_REGISTRY, LandOptionRegistryABI, provider);
    await landRegistry.nextOptionId();
    results.landOptionRegistry = true;
  } catch (e) {
    console.error('LandOptionRegistry connection failed:', e);
  }
  
  try {
    const pool = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.LAND_ACQUISITION_POOL, LandAcquisitionPoolABI, provider);
    await pool.nextPoolId();
    results.landAcquisitionPool = true;
  } catch (e) {
    console.error('LandAcquisitionPool connection failed:', e);
  }
  
  try {
    const crowdfunding = new ethers.Contract(LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING, RegCFCrowdfundingABI, provider);
    await crowdfunding.nextCampaignId();
    results.regCFCrowdfunding = true;
  } catch (e) {
    console.error('RegCFCrowdfunding connection failed:', e);
  }
  
  return results;
}
