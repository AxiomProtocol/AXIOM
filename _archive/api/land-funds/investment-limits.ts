import type { NextApiRequest, NextApiResponse } from 'next';

interface LimitCalculation {
  annualIncome: number;
  netWorth: number;
  investmentLimit: number;
  limitType: 'minimum' | 'percentage_5' | 'percentage_10';
  explanation: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { annualIncome, netWorth } = req.body;

    if (typeof annualIncome !== 'number' || typeof netWorth !== 'number') {
      return res.status(400).json({ 
        error: 'Invalid input. Provide annualIncome and netWorth as numbers.' 
      });
    }

    if (annualIncome < 0 || netWorth < 0) {
      return res.status(400).json({ 
        error: 'Values must be non-negative.' 
      });
    }

    const calculation = calculateRegCFLimit(annualIncome, netWorth);

    return res.status(200).json(calculation);
  } catch (error) {
    console.error('Investment limits calculation error:', error);
    return res.status(500).json({ error: 'Failed to calculate investment limits' });
  }
}

function calculateRegCFLimit(annualIncome: number, netWorth: number): LimitCalculation {
  const lesser = Math.min(annualIncome, netWorth);
  const threshold = 124000;
  
  let investmentLimit: number;
  let limitType: 'minimum' | 'percentage_5' | 'percentage_10';
  let explanation: string;

  if (annualIncome < threshold && netWorth < threshold) {
    const percentageLimit = lesser * 0.05;
    const minimumLimit = 2500;
    
    if (minimumLimit > percentageLimit) {
      investmentLimit = minimumLimit;
      limitType = 'minimum';
      explanation = `Since both your annual income ($${annualIncome.toLocaleString()}) and net worth ($${netWorth.toLocaleString()}) are below $${threshold.toLocaleString()}, your limit is the greater of $2,500 or 5% of the lesser amount. You qualify for the $2,500 minimum.`;
    } else {
      investmentLimit = percentageLimit;
      limitType = 'percentage_5';
      explanation = `Since both your annual income ($${annualIncome.toLocaleString()}) and net worth ($${netWorth.toLocaleString()}) are below $${threshold.toLocaleString()}, your limit is 5% of the lesser amount ($${lesser.toLocaleString()}).`;
    }
  } else {
    investmentLimit = Math.min(124000, lesser * 0.10);
    limitType = 'percentage_10';
    
    if (investmentLimit === 124000) {
      explanation = `Since at least one of your values exceeds $${threshold.toLocaleString()}, you can invest up to 10% of the lesser amount, capped at the annual maximum of $124,000.`;
    } else {
      explanation = `Since at least one of your values exceeds $${threshold.toLocaleString()}, you can invest up to 10% of the lesser amount ($${lesser.toLocaleString()}).`;
    }
  }

  return {
    annualIncome,
    netWorth,
    investmentLimit: Math.round(investmentLimit * 100) / 100,
    limitType,
    explanation
  };
}
