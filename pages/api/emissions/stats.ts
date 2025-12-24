import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CORE_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const STAKING_ABI = [
  "function totalStaked() external view returns (uint256)",
  "function rewardRate() external view returns (uint256)",
  "function getAPR() external view returns (uint256)",
  "function emissionSchedule() external view returns (uint256 startTime, uint256 endTime, uint256 totalEmissions)",
  "function emittedToDate() external view returns (uint256)",
  "function remainingEmissions() external view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const stakingContract = new ethers.Contract(
      CORE_CONTRACTS.STAKING_EMISSIONS,
      STAKING_ABI,
      provider
    );

    const [totalStaked, rewardRate] = await Promise.all([
      stakingContract.totalStaked().catch(() => BigInt(0)),
      stakingContract.rewardRate().catch(() => BigInt(0))
    ]);

    let apr = 0;
    try {
      const aprValue = await stakingContract.getAPR();
      apr = Number(aprValue) / 100;
    } catch {
      if (totalStaked > 0 && rewardRate > 0) {
        const annualRewards = rewardRate * BigInt(365 * 24 * 60 * 60);
        apr = Number((annualRewards * BigInt(10000)) / totalStaked) / 100;
      }
    }

    let emissionData = {
      startTime: Date.now() - (90 * 24 * 60 * 60 * 1000),
      endTime: Date.now() + (275 * 24 * 60 * 60 * 1000),
      totalEmissions: '750000000',
      emittedToDate: '0',
      remainingEmissions: '750000000'
    };

    try {
      const [schedule, emitted, remaining] = await Promise.all([
        stakingContract.emissionSchedule().catch(() => null),
        stakingContract.emittedToDate().catch(() => BigInt(0)),
        stakingContract.remainingEmissions().catch(() => BigInt(0))
      ]);

      if (schedule) {
        emissionData.startTime = Number(schedule.startTime) * 1000;
        emissionData.endTime = Number(schedule.endTime) * 1000;
        emissionData.totalEmissions = ethers.formatEther(schedule.totalEmissions);
      }
      emissionData.emittedToDate = ethers.formatEther(emitted);
      emissionData.remainingEmissions = ethers.formatEther(remaining);
    } catch (e) {
      console.log('Using estimated emission data');
    }

    const now = Date.now();
    const elapsedTime = now - emissionData.startTime;
    const totalDuration = emissionData.endTime - emissionData.startTime;
    const progress = Math.min(100, Math.max(0, (elapsedTime / totalDuration) * 100));

    res.status(200).json({
      success: true,
      staking: {
        totalStaked: ethers.formatEther(totalStaked),
        rewardRate: ethers.formatEther(rewardRate),
        apr: apr.toFixed(2),
        stakersCount: 0
      },
      emissions: {
        ...emissionData,
        progress: progress.toFixed(2),
        dailyEmission: (parseFloat(emissionData.totalEmissions) / (totalDuration / (24 * 60 * 60 * 1000))).toFixed(2)
      },
      contractAddress: CORE_CONTRACTS.STAKING_EMISSIONS,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Emissions stats error:', error);
    res.status(200).json({
      success: false,
      staking: {
        totalStaked: '0',
        rewardRate: '0',
        apr: '8.00',
        stakersCount: 0
      },
      emissions: {
        startTime: Date.now() - (90 * 24 * 60 * 60 * 1000),
        endTime: Date.now() + (275 * 24 * 60 * 60 * 1000),
        totalEmissions: '750000000',
        emittedToDate: '0',
        remainingEmissions: '750000000',
        progress: '25.00',
        dailyEmission: '2054794.52'
      },
      error: 'Failed to fetch live data'
    });
  }
}
