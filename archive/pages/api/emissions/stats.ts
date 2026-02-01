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

    let emissionData: {
      startTime: number;
      endTime: number;
      totalEmissions: string;
      emittedToDate: string;
      remainingEmissions: string;
      hasSchedule: boolean;
    } = {
      startTime: 0,
      endTime: 0,
      totalEmissions: '0',
      emittedToDate: '0',
      remainingEmissions: '0',
      hasSchedule: false
    };

    try {
      const [schedule, emitted, remaining] = await Promise.all([
        stakingContract.emissionSchedule().catch(() => null),
        stakingContract.emittedToDate().catch(() => BigInt(0)),
        stakingContract.remainingEmissions().catch(() => BigInt(0))
      ]);

      if (schedule && schedule.totalEmissions > 0) {
        emissionData.startTime = Number(schedule.startTime) * 1000;
        emissionData.endTime = Number(schedule.endTime) * 1000;
        emissionData.totalEmissions = ethers.formatEther(schedule.totalEmissions);
        emissionData.hasSchedule = true;
      }
      emissionData.emittedToDate = ethers.formatEther(emitted);
      emissionData.remainingEmissions = ethers.formatEther(remaining);
    } catch (e) {
      console.log('Emission schedule not available from contract');
    }

    let progress = 0;
    let dailyEmission = '0';
    if (emissionData.hasSchedule && emissionData.endTime > emissionData.startTime) {
      const now = Date.now();
      const elapsedTime = now - emissionData.startTime;
      const totalDuration = emissionData.endTime - emissionData.startTime;
      progress = Math.min(100, Math.max(0, (elapsedTime / totalDuration) * 100));
      dailyEmission = (parseFloat(emissionData.totalEmissions) / (totalDuration / (24 * 60 * 60 * 1000))).toFixed(2);
    }

    res.status(200).json({
      success: true,
      staking: {
        totalStaked: ethers.formatEther(totalStaked),
        rewardRate: ethers.formatEther(rewardRate),
        apr: apr.toFixed(2),
        stakersCount: 0
      },
      emissions: {
        startTime: emissionData.startTime,
        endTime: emissionData.endTime,
        totalEmissions: emissionData.totalEmissions,
        emittedToDate: emissionData.emittedToDate,
        remainingEmissions: emissionData.remainingEmissions,
        progress: progress.toFixed(2),
        dailyEmission,
        hasSchedule: emissionData.hasSchedule
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
        apr: '0',
        stakersCount: 0
      },
      emissions: {
        startTime: 0,
        endTime: 0,
        totalEmissions: '0',
        emittedToDate: '0',
        remainingEmissions: '0',
        progress: '0',
        dailyEmission: '0',
        hasSchedule: false
      },
      error: 'Failed to fetch live contract data'
    });
  }
}
