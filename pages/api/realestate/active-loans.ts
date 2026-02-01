import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ARBITRUM_RPC = process.env.ALCHEMY_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const LOAN_RECEIPT_ADDRESS = process.env.LOAN_RECEIPT_ADDRESS;
const MANAGER_ADDRESS = process.env.FIXFLIP_MANAGER_ADDRESS;

const LOAN_RECEIPT_ABI = [
  'function getLoan(uint256 loanId) view returns (tuple(uint256 loanId, uint256 productId, address borrower, uint256 principal, uint256 interestRateBps, uint256 startTimestamp, uint256 maturityTimestamp, uint256 amountRepaid, uint8 status, bytes32 collateralHash))',
  'function totalSupply() view returns (uint256)'
];

const MANAGER_ABI = [
  'function loanDetails(uint256 loanId) view returns (tuple(uint256 purchasePrice, uint256 afterRepairValue, uint256 rehabBudget, address approvedBy, uint256 approvedAt, uint256 fundedAt, uint256 closedAt))'
];

const STATUS_NAMES = ['Active', 'Repaying', 'Repaid', 'Defaulted', 'Liquidated'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!LOAN_RECEIPT_ADDRESS) {
      return res.status(200).json({
        loans: [],
        total: 0
      });
    }

    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const loanReceipt = new ethers.Contract(LOAN_RECEIPT_ADDRESS, LOAN_RECEIPT_ABI, provider);

    const totalSupply = await loanReceipt.totalSupply();
    const loans = [];

    const maxLoans = Math.min(Number(totalSupply), 50);

    for (let i = 1; i <= maxLoans; i++) {
      try {
        const loan = await loanReceipt.getLoan(i);

        if (loan.status === 0 || loan.status === 1) {
          const maturityDate = new Date(Number(loan.maturityTimestamp) * 1000);

          loans.push({
            loanId: Number(loan.loanId),
            borrower: loan.borrower,
            principal: ethers.formatEther(loan.principal),
            status: STATUS_NAMES[loan.status] || 'Unknown',
            maturityDate: maturityDate.toISOString().split('T')[0],
            interestRate: Number(loan.interestRateBps),
            amountRepaid: ethers.formatEther(loan.amountRepaid),
            startDate: new Date(Number(loan.startTimestamp) * 1000).toISOString().split('T')[0]
          });
        }
      } catch (e) {
        continue;
      }
    }

    return res.status(200).json({
      loans,
      total: loans.length
    });
  } catch (error: any) {
    console.error('Error fetching active loans:', error);
    return res.status(200).json({
      loans: [],
      total: 0,
      error: error.message
    });
  }
}
