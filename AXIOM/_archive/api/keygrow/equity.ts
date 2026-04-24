import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { eq, and, desc } from 'drizzle-orm';
import { ethers } from 'ethers';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { keygrowEnrollments, keygrowProperties, keygrowPayments } from '../../../shared/keygrowSchema';

function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

interface PortfolioItem {
  enrollmentId: string;
  propertyId: number | null;
  propertyName: string;
  propertyImage: string | undefined;
  city: string | undefined;
  state: string | undefined;
  propertyValue: number;
  currentEquityPercent: number;
  equityValueUsd: number;
  totalPaymentsMade: number;
  totalAxmPaid: number;
  agreedTermMonths: number;
  monthsRemaining: number;
  completionPercent: number;
  nextPaymentDue: Date | null;
  monthlyRentAxm: number;
  status: string;
  enrollmentDate: Date | null;
  targetOwnershipDate: Date | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { walletAddress } = req.query;
    
    if (!walletAddress || !validateWalletAddress(walletAddress as string)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid wallet address is required' 
      });
    }

    const session = await getSIWESession(req);
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Wallet authentication required. Please sign in with your wallet.',
        code: 'SIWE_AUTH_REQUIRED'
      });
    }

    if (session.address.toLowerCase() !== (walletAddress as string).toLowerCase()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only view your own equity portfolio',
        code: 'ADDRESS_MISMATCH'
      });
    }
    
    const checksumAddress = ethers.getAddress(walletAddress as string);
    
    const enrollments = await db
      .select({
        enrollment: keygrowEnrollments,
        property: keygrowProperties
      })
      .from(keygrowEnrollments)
      .leftJoin(keygrowProperties, eq(keygrowEnrollments.propertyId, keygrowProperties.id))
      .where(eq(keygrowEnrollments.tenantAddress, checksumAddress))
      .orderBy(desc(keygrowEnrollments.createdAt));
    
    let totalEquityValue = 0;
    let totalPaid = 0;
    let activeEnrollments = 0;
    let completedEnrollments = 0;
    
    const portfolioItems: PortfolioItem[] = enrollments.map((e: { enrollment: typeof keygrowEnrollments.$inferSelect; property: typeof keygrowProperties.$inferSelect | null }) => {
      const enrollment = e.enrollment;
      const property = e.property;
      
      const currentEquity = parseFloat(enrollment.currentEquityPercent || '0');
      const propertyValue = parseFloat(property?.totalValueUsd || '0');
      const equityValue = (currentEquity / 100) * propertyValue;
      const paidAmount = parseFloat(enrollment.totalAxmPaid || '0');
      
      totalEquityValue += equityValue;
      totalPaid += paidAmount;
      
      if (enrollment.status === 'active') activeEnrollments++;
      if (enrollment.status === 'completed') completedEnrollments++;
      
      const termMonths = enrollment.agreedTermMonths || 240;
      const monthsRemaining = termMonths - (enrollment.totalPaymentsMade || 0);
      const completionPercent = ((enrollment.totalPaymentsMade || 0) / termMonths) * 100;
      
      return {
        enrollmentId: enrollment.enrollmentId,
        propertyId: property?.id ?? null,
        propertyName: property?.propertyName || 'Unknown Property',
        propertyImage: property?.imageUrl || undefined,
        city: property?.city || undefined,
        state: property?.state || undefined,
        propertyValue: propertyValue,
        currentEquityPercent: currentEquity,
        equityValueUsd: equityValue,
        totalPaymentsMade: enrollment.totalPaymentsMade || 0,
        totalAxmPaid: paidAmount,
        agreedTermMonths: termMonths,
        monthsRemaining: Math.max(0, monthsRemaining),
        completionPercent: Math.min(100, completionPercent),
        nextPaymentDue: enrollment.nextPaymentDue,
        monthlyRentAxm: parseFloat(enrollment.agreedMonthlyRentAxm || '0'),
        status: enrollment.status || 'pending',
        enrollmentDate: enrollment.enrollmentDate,
        targetOwnershipDate: enrollment.targetOwnershipDate
      };
    });
    
    const axmPrice = 0.00033;
    
    return res.status(200).json({
      success: true,
      summary: {
        totalEquityValueUsd: totalEquityValue.toFixed(2),
        totalAxmPaid: totalPaid.toFixed(8),
        totalPaidUsd: (totalPaid * axmPrice).toFixed(2),
        activeEnrollments,
        completedEnrollments,
        totalEnrollments: enrollments.length,
        averageEquityPercent: enrollments.length > 0 
          ? (portfolioItems.reduce((sum: number, p: PortfolioItem) => sum + p.currentEquityPercent, 0) / enrollments.length).toFixed(2)
          : '0.00'
      },
      portfolio: portfolioItems,
      axmPrice
    });
  } catch (error) {
    console.error('Error fetching equity dashboard:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch equity data' 
    });
  }
}
