import type { NextApiRequest, NextApiResponse } from 'next';

interface TreasuryNote {
  id: string;
  name: string;
  series: string;
  maturityMonths: number;
  couponRate: number;
  minInvestment: number;
  maxInvestment: number;
  totalIssued: string;
  totalOutstanding: string;
  nextCouponDate: string;
  status: string;
  riskRating: string;
  backingAssets: string[];
}

interface UserHolding {
  id: string;
  noteId: string;
  principal: string;
  purchaseDate: string;
  maturityDate: string;
  couponsPaid: string;
  nextCoupon: string;
  status: string;
}

const treasuryNotes: TreasuryNote[] = [
  {
    id: 'axn-6m-a',
    name: 'Axiom 6-Month Note Series A',
    series: 'AXN-6M-A',
    maturityMonths: 6,
    couponRate: 6.0,
    minInvestment: 1000,
    maxInvestment: 100000,
    totalIssued: '2500000',
    totalOutstanding: '2100000',
    nextCouponDate: '2026-04-01',
    status: 'Open',
    riskRating: 'A',
    backingAssets: ['AXUSD Reserves', 'Mortgage Note Pool', 'Treasury Operations']
  },
  {
    id: 'axn-12m-a',
    name: 'Axiom 12-Month Note Series A',
    series: 'AXN-12M-A',
    maturityMonths: 12,
    couponRate: 8.0,
    minInvestment: 2500,
    maxInvestment: 250000,
    totalIssued: '5000000',
    totalOutstanding: '4200000',
    nextCouponDate: '2026-04-01',
    status: 'Open',
    riskRating: 'A',
    backingAssets: ['AXUSD Reserves', 'Real Estate Portfolio', 'Protocol Revenue']
  },
  {
    id: 'axn-24m-a',
    name: 'Axiom 24-Month Note Series A',
    series: 'AXN-24M-A',
    maturityMonths: 24,
    couponRate: 10.0,
    minInvestment: 5000,
    maxInvestment: 500000,
    totalIssued: '8000000',
    totalOutstanding: '7500000',
    nextCouponDate: '2026-04-01',
    status: 'Open',
    riskRating: 'A-',
    backingAssets: ['AXUSD Reserves', 'Land Portfolio', 'Infrastructure Revenue', 'Protocol Treasury']
  },
  {
    id: 'axn-36m-institutional',
    name: 'Axiom 36-Month Institutional Note',
    series: 'AXN-36M-INST',
    maturityMonths: 36,
    couponRate: 12.0,
    minInvestment: 50000,
    maxInvestment: 2000000,
    totalIssued: '15000000',
    totalOutstanding: '12000000',
    nextCouponDate: '2026-04-01',
    status: 'Open',
    riskRating: 'A-',
    backingAssets: ['Full Protocol Treasury', 'Real Asset Portfolio', 'Revenue Streams', 'Insurance Reserves']
  }
];

const sampleUserHoldings: UserHolding[] = [
  {
    id: 'hold-1',
    noteId: 'axn-12m-a',
    principal: '10000',
    purchaseDate: '2025-10-15',
    maturityDate: '2026-10-15',
    couponsPaid: '200',
    nextCoupon: '200',
    status: 'Active'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    const totalOutstanding = treasuryNotes.reduce((sum, n) => sum + parseFloat(n.totalOutstanding), 0);
    const totalIssued = treasuryNotes.reduce((sum, n) => sum + parseFloat(n.totalIssued), 0);
    const avgCouponRate = treasuryNotes.reduce((sum, n) => sum + n.couponRate, 0) / treasuryNotes.length;
    
    return res.status(200).json({
      success: true,
      notes: treasuryNotes,
      userHoldings: address ? sampleUserHoldings : [],
      stats: {
        totalOutstanding: totalOutstanding.toFixed(2),
        totalIssued: totalIssued.toFixed(2),
        avgCouponRate: avgCouponRate.toFixed(1),
        totalInvestors: 487,
        nextDistribution: '2026-04-01',
        quarterlyDistributions: '156000'
      }
    });
  }
  
  if (req.method === 'POST') {
    const { action, noteId, amount, address } = req.body;
    
    if (!action || !noteId || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const note = treasuryNotes.find(n => n.id === noteId);
    if (!note) {
      return res.status(404).json({ error: 'Treasury note not found' });
    }
    
    if (action === 'purchase') {
      if (!amount || parseFloat(amount) < note.minInvestment) {
        return res.status(400).json({ 
          error: `Minimum investment is $${note.minInvestment.toLocaleString()}`
        });
      }
      
      if (parseFloat(amount) > note.maxInvestment) {
        return res.status(400).json({ 
          error: `Maximum investment is $${note.maxInvestment.toLocaleString()}`
        });
      }
      
      const estimatedYield = (parseFloat(amount) * note.couponRate / 100 * (note.maturityMonths / 12)).toFixed(2);
      
      return res.status(200).json({
        success: true,
        message: 'Treasury note purchase initiated',
        estimatedYield,
        maturityDate: new Date(Date.now() + note.maturityMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        txData: {
          to: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F',
          data: '0x',
          value: '0',
          estimatedGas: '200000'
        }
      });
    }
    
    if (action === 'redeem') {
      return res.status(200).json({
        success: true,
        message: 'Redemption request submitted',
        txData: {
          to: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F',
          data: '0x',
          value: '0',
          estimatedGas: '150000'
        }
      });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
