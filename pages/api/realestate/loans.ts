import type { NextApiRequest, NextApiResponse } from 'next';

interface Loan {
  loanId: number;
  borrower: string;
  principal: string;
  originationFee: string;
  interestRate: number;
  productId: number;
  propertyAddress: string;
  arvValue: string;
  ltvRatio: number;
  status: 'Active' | 'Repaid' | 'Defaulted' | 'Liquidated';
  startDate: number;
  maturityDate: number;
  totalRepaid: string;
}

interface LoansResponse {
  success: boolean;
  loans: Loan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoansResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      loans: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });
  }

  const { page = '1', limit = '10', status } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  try {
    const loans: Loan[] = [];

    return res.status(200).json({ 
      success: true, 
      loans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 0
      }
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return res.status(500).json({ 
      success: false, 
      loans: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });
  }
}
