import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ADVANCED_DEFI_CONTRACTS, DEFI_UTILITY_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const IOT_ORACLE_ABI = [
  "function getTotalDevices() external view returns (uint256)",
  "function getActiveDevices() external view returns (uint256)",
  "function getTotalDataPoints() external view returns (uint256)",
  "function getAverageUptime() external view returns (uint256)",
  "function getNetworkHealth() external view returns (uint8)"
];

const DEPIN_SUITE_ABI = [
  "function totalNodesSold() external view returns (uint256)",
  "function getActiveNodeCount() external view returns (uint256)",
  "function getTotalStaked() external view returns (uint256)",
  "function getTotalRewardsDistributed() external view returns (uint256)",
  "function getNetworkUptime() external view returns (uint256)"
];

const DEPIN_SALES_ABI = [
  "function totalNodesSold() external view returns (uint256)",
  "function totalEthCollected() external view returns (uint256)",
  "function totalAxmCollected() external view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    
    const iotContract = new ethers.Contract(
      ADVANCED_DEFI_CONTRACTS.IOT_ORACLE,
      IOT_ORACLE_ABI,
      provider
    );
    
    const depinSuiteContract = new ethers.Contract(
      DEFI_UTILITY_CONTRACTS.DEPIN_NODES,
      DEPIN_SUITE_ABI,
      provider
    );
    
    const depinSalesContract = new ethers.Contract(
      DEFI_UTILITY_CONTRACTS.DEPIN_SALES,
      DEPIN_SALES_ABI,
      provider
    );

    const [totalNodesSold, totalEthCollected, totalAxmCollected] = await Promise.all([
      depinSalesContract.totalNodesSold().catch(() => BigInt(0)),
      depinSalesContract.totalEthCollected().catch(() => BigInt(0)),
      depinSalesContract.totalAxmCollected().catch(() => BigInt(0))
    ]);

    let iotStats = {
      totalDevices: 0,
      activeDevices: 0,
      totalDataPoints: 0,
      averageUptime: 0,
      networkHealth: 'Unknown'
    };

    try {
      const [totalDevices, activeDevices, totalDataPoints, avgUptime, health] = await Promise.all([
        iotContract.getTotalDevices().catch(() => BigInt(0)),
        iotContract.getActiveDevices().catch(() => BigInt(0)),
        iotContract.getTotalDataPoints().catch(() => BigInt(0)),
        iotContract.getAverageUptime().catch(() => BigInt(0)),
        iotContract.getNetworkHealth().catch(() => 0)
      ]);

      const healthLabels = ['Offline', 'Good', 'Excellent', 'Optimal'];
      
      iotStats = {
        totalDevices: Number(totalDevices),
        activeDevices: Number(activeDevices),
        totalDataPoints: Number(totalDataPoints),
        averageUptime: Number(avgUptime) / 100,
        networkHealth: healthLabels[Number(health)] || 'Unknown'
      };
    } catch (e) {
      console.log('Using estimated IoT stats');
    }

    let nodeStats = {
      activeNodes: 0,
      totalStaked: '0',
      totalRewards: '0',
      networkUptime: 0
    };

    try {
      const [activeCount, staked, rewards, uptime] = await Promise.all([
        depinSuiteContract.getActiveNodeCount().catch(() => BigInt(0)),
        depinSuiteContract.getTotalStaked().catch(() => BigInt(0)),
        depinSuiteContract.getTotalRewardsDistributed().catch(() => BigInt(0)),
        depinSuiteContract.getNetworkUptime().catch(() => BigInt(0))
      ]);

      nodeStats = {
        activeNodes: Number(activeCount),
        totalStaked: ethers.formatEther(staked),
        totalRewards: ethers.formatEther(rewards),
        networkUptime: Number(uptime) / 100
      };
    } catch (e) {
      console.log('Using sales data for node stats');
    }

    const sensorData: Array<{id: string; type: string; value: string; unit: string; status: string; location: string}> = [];

    res.status(200).json({
      success: true,
      sales: {
        totalNodesSold: Number(totalNodesSold),
        totalEthCollected: ethers.formatEther(totalEthCollected),
        totalAxmCollected: ethers.formatEther(totalAxmCollected)
      },
      network: nodeStats,
      iot: iotStats,
      sensors: sensorData,
      contracts: {
        depinSuite: DEFI_UTILITY_CONTRACTS.DEPIN_NODES,
        depinSales: DEFI_UTILITY_CONTRACTS.DEPIN_SALES,
        iotOracle: ADVANCED_DEFI_CONTRACTS.IOT_ORACLE
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('DePIN telemetry error:', error);
    res.status(200).json({
      success: false,
      sales: { totalNodesSold: 0, totalEthCollected: '0', totalAxmCollected: '0' },
      network: { activeNodes: 0, totalStaked: '0', totalRewards: '0', networkUptime: 0 },
      iot: { totalDevices: 0, activeDevices: 0, totalDataPoints: 0, averageUptime: 0, networkHealth: 'Unknown' },
      sensors: [],
      error: 'Failed to fetch live contract data'
    });
  }
}
