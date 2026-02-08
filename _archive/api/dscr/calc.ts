import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { dscrApplications } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

interface DSCRCalculatorInput {
  principal: number;      // Loan amount in USD
  rate: number;           // Annual interest rate as decimal (0.08 = 8%)
  termMonths: number;     // Loan term in months
  rent: number;           // Monthly rental income
  expenses: number;       // Monthly property expenses (taxes, insurance, HOA, mgmt)
  value: number;          // Property value for LTV
  applicationId?: number; // Optional: persist results to application
}

interface DSCRCalculatorOutput {
  monthlyPayment: number;
  dscr: number;           // Debt Service Coverage Ratio (net rent / payment)
  dscrBps: number;        // DSCR * 100 for on-chain storage
  ltv: number;            // Loan to Value ratio
  ltvBps: number;         // LTV * 100 for on-chain storage
  netOperatingIncome: number;
  annualDebtService: number;
  qualifies: {
    low: boolean;         // 65% LTV, 1.25 DSCR
    standard: boolean;    // 70% LTV, 1.20 DSCR
    yield: boolean;       // 75% LTV, 1.10 DSCR
  };
  recommendedTier: 'low' | 'standard' | 'yield' | 'none';
}

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (annualRate === 0) return principal / termMonths;
  
  const monthlyRate = annualRate / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment * 100) / 100;
}

function calculateDSCR(input: DSCRCalculatorInput): DSCRCalculatorOutput {
  const { principal, rate, termMonths, rent, expenses, value } = input;
  
  const monthlyPayment = calculateMonthlyPayment(principal, rate, termMonths);
  const netRent = Math.max(rent - expenses, 0);
  const dscr = monthlyPayment > 0 ? netRent / monthlyPayment : 0;
  const ltv = value > 0 ? principal / value : 0;
  
  const dscrBps = Math.round(dscr * 100);
  const ltvBps = Math.round(ltv * 10000);
  
  const qualifies = {
    low: ltv <= 0.65 && dscr >= 1.25,
    standard: ltv <= 0.70 && dscr >= 1.20,
    yield: ltv <= 0.75 && dscr >= 1.10
  };
  
  let recommendedTier: 'low' | 'standard' | 'yield' | 'none' = 'none';
  if (qualifies.low) recommendedTier = 'low';
  else if (qualifies.standard) recommendedTier = 'standard';
  else if (qualifies.yield) recommendedTier = 'yield';
  
  return {
    monthlyPayment,
    dscr: Math.round(dscr * 100) / 100,
    dscrBps,
    ltv: Math.round(ltv * 10000) / 10000,
    ltvBps,
    netOperatingIncome: netRent * 12,
    annualDebtService: monthlyPayment * 12,
    qualifies,
    recommendedTier
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { principal, rate, termMonths, rent, expenses, value, applicationId } = req.body;

    if (!principal || !rate || !termMonths || rent === undefined || expenses === undefined || !value) {
      return res.status(400).json({ 
        error: 'Required fields: principal, rate, termMonths, rent, expenses, value' 
      });
    }

    const numPrincipal = parseFloat(principal);
    const numRate = parseFloat(rate);
    const numTermMonths = parseInt(termMonths);
    const numRent = parseFloat(rent);
    const numExpenses = parseFloat(expenses);
    const numValue = parseFloat(value);

    if (isNaN(numPrincipal) || numPrincipal <= 0) {
      return res.status(400).json({ error: 'Principal must be a positive number' });
    }
    if (isNaN(numRate) || numRate < 0) {
      return res.status(400).json({ error: 'Rate must be a non-negative number' });
    }
    if (isNaN(numTermMonths) || numTermMonths <= 0) {
      return res.status(400).json({ error: 'Term months must be a positive integer' });
    }
    if (isNaN(numRent) || numRent < 0) {
      return res.status(400).json({ error: 'Rent must be a non-negative number' });
    }
    if (isNaN(numExpenses) || numExpenses < 0) {
      return res.status(400).json({ error: 'Expenses must be a non-negative number' });
    }
    if (isNaN(numValue) || numValue <= 0) {
      return res.status(400).json({ error: 'Value must be a positive number' });
    }

    const result = calculateDSCR({
      principal: numPrincipal,
      rate: numRate,
      termMonths: numTermMonths,
      rent: numRent,
      expenses: numExpenses,
      value: numValue
    });

    if (applicationId) {
      const appId = parseInt(applicationId);
      if (!isNaN(appId)) {
        await db.update(dscrApplications)
          .set({
            monthlyPayment: result.monthlyPayment.toString(),
            dscrBps: result.dscrBps,
            ltvBps: result.ltvBps,
            interestRateBps: Math.round(numRate * 10000),
            updatedAt: new Date()
          })
          .where(eq(dscrApplications.id, appId));
      }
    }

    return res.status(200).json({
      success: true,
      input: {
        principal: numPrincipal,
        rate: numRate,
        termMonths: numTermMonths,
        rent: numRent,
        expenses: numExpenses,
        value: numValue
      },
      result
    });
  } catch (error) {
    console.error('DSCR calculation error:', error);
    return res.status(500).json({ error: 'Failed to calculate DSCR metrics' });
  }
}
