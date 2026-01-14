import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';

// Use lowercase addresses to avoid checksum validation issues
const TREASURY_VAULT = '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d';
const DEPIN_SUITE_CONTRACT = '0x16dc3884d88b767d99e0701ba026a1ed39a250f1';
const DEPIN_SALES_CONTRACT = '0x876951cae4ad48bdbfba547ef4316db576a9edbd';
const AXM_TOKEN = '0x864f9c6f50dc5bd244f5002f1b0873cd80e2539d';

const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get ETH balances
    const [treasuryEthBalance, depinEthBalance, salesEthBalance] = await Promise.all([
      provider.getBalance(TREASURY_VAULT),
      provider.getBalance(DEPIN_SUITE_CONTRACT),
      provider.getBalance(DEPIN_SALES_CONTRACT)
    ]);

    // Get AXM token balance in treasury (if needed)
    const axmAbi = ['function balanceOf(address) view returns (uint256)'];
    const axmContract = new ethers.Contract(AXM_TOKEN, axmAbi, provider);
    const treasuryAxmBalance = await axmContract.balanceOf(TREASURY_VAULT);

    res.json({
      treasury: {
        address: TREASURY_VAULT,
        ethBalance: ethers.formatEther(treasuryEthBalance),
        ethBalanceWei: treasuryEthBalance.toString(),
        axmBalance: ethers.formatEther(treasuryAxmBalance),
        axmBalanceWei: treasuryAxmBalance.toString()
      },
      contracts: {
        depinSuite: {
          address: DEPIN_SUITE_CONTRACT,
          ethBalance: ethers.formatEther(depinEthBalance),
          ethBalanceWei: depinEthBalance.toString()
        },
        depinSales: {
          address: DEPIN_SALES_CONTRACT,
          ethBalance: ethers.formatEther(salesEthBalance),
          ethBalanceWei: salesEthBalance.toString(),
          deployed: true
        }
      },
      totals: {
        totalEth: ethers.formatEther(treasuryEthBalance + depinEthBalance + salesEthBalance),
        totalEthWei: (treasuryEthBalance + depinEthBalance + salesEthBalance).toString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching treasury balances:', error);
    res.status(500).json({ 
      message: 'Failed to fetch treasury balances', 
      error: error.message 
    });
  }
}

export default withAdminAuth(handler);
