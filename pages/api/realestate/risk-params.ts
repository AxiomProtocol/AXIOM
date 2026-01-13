import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { REALESTATE_LENDING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const ARBITRUM_RPC = NETWORK_CONFIG.rpcUrl;
const RISK_CONFIG_ADDRESS = REALESTATE_LENDING_CONTRACTS.RISK_CONFIG;
const DSCR_RISK_CONFIG_ADDRESS = REALESTATE_LENDING_CONTRACTS.DSCR_RISK_CONFIG;

const RISK_CONFIG_ABI = [
  'function getProductRisk(uint256 productId) view returns (tuple(uint256 productId, uint256 maxLtvBps, uint256 maxTermDays, uint256 maxLoanSize, uint256 minLoanSize, uint256 originationFeeBps, uint256 interestRateBps, uint256 lateFeePerDayBps, uint256 insuranceReserveBps, uint256 protocolFeeBps, bool active))',
  'function isProductActive(uint256 productId) view returns (bool)'
];

const DEFAULT_RISK_PARAMS = {
  productId: 1,
  maxLtvBps: 7000,
  maxTermDays: 365,
  maxLoanSize: '500000',
  minLoanSize: '50000',
  originationFeeBps: 300,
  interestRateBps: 1400,
  lateFeePerDayBps: 50,
  insuranceReserveBps: 200,
  protocolFeeBps: 150,
  active: true
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const productId = parseInt(req.query.productId as string) || 1;
  const isDSCR = productId >= 100;

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const configAddress = isDSCR ? DSCR_RISK_CONFIG_ADDRESS : RISK_CONFIG_ADDRESS;
    const riskConfig = new ethers.Contract(configAddress, RISK_CONFIG_ABI, provider);

    const risk = await riskConfig.getProductRisk(productId);

    return res.status(200).json({
      productId: Number(risk.productId),
      maxLtvBps: Number(risk.maxLtvBps),
      maxTermDays: Number(risk.maxTermDays),
      maxLoanSize: ethers.formatEther(risk.maxLoanSize),
      minLoanSize: ethers.formatEther(risk.minLoanSize),
      originationFeeBps: Number(risk.originationFeeBps),
      interestRateBps: Number(risk.interestRateBps),
      lateFeePerDayBps: Number(risk.lateFeePerDayBps),
      insuranceReserveBps: Number(risk.insuranceReserveBps),
      protocolFeeBps: Number(risk.protocolFeeBps),
      active: risk.active
    });
  } catch (error: any) {
    console.error('Error fetching risk params:', error);
    return res.status(200).json(DEFAULT_RISK_PARAMS);
  }
}
