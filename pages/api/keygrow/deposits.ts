import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { eq, and, desc } from 'drizzle-orm';
import { ethers } from 'ethers';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import {
  pgTable,
  timestamp,
  varchar,
  boolean,
  decimal,
  integer,
  pgEnum,
  serial,
  index,
} from "drizzle-orm/pg-core";

const keygrowDepositStatusEnum = pgEnum('keygrow_deposit_status', [
  'pending',
  'paid',
  'staking',
  'applied',
  'refunded'
]);

const keygrowDeposits = pgTable("keygrow_deposits", {
  id: serial("id").primaryKey(),
  depositId: varchar("deposit_id", { length: 66 }).unique().notNull(),
  enrollmentId: integer("enrollment_id"),
  tenantAddress: varchar("tenant_address", { length: 42 }).notNull(),
  propertyId: integer("property_id"),
  depositAmountUsd: decimal("deposit_amount_usd", { precision: 18, scale: 2 }).default('500').notNull(),
  depositAmountAxm: decimal("deposit_amount_axm", { precision: 28, scale: 8 }),
  axmPriceAtDeposit: decimal("axm_price_at_deposit", { precision: 18, scale: 8 }),
  currentAxmBalance: decimal("current_axm_balance", { precision: 28, scale: 8 }),
  stakingRewardsEarned: decimal("staking_rewards_earned", { precision: 28, scale: 8 }).default('0'),
  stakingAprPercent: decimal("staking_apr_percent", { precision: 5, scale: 2 }).default('8.0'),
  lastRewardCalculation: timestamp("last_reward_calculation"),
  totalValueUsd: decimal("total_value_usd", { precision: 18, scale: 2 }),
  appliedToDownPayment: boolean("applied_to_down_payment").default(false),
  appliedAt: timestamp("applied_at"),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  stakingContractAddress: varchar("staking_contract_address", { length: 42 }),
  status: keygrowDepositStatusEnum("status").default('pending'),
  depositDate: timestamp("deposit_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const AXM_PRICE = 0.00033;
const STAKING_APR = 8.0;

function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function generateDepositId(): string {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function calculateStakingRewards(
  principalAxm: number,
  aprPercent: number,
  daysStaked: number
): number {
  const dailyRate = aprPercent / 100 / 365;
  return principalAxm * dailyRate * daysStaked;
}

function calculateProjectedValue(
  depositUsd: number,
  axmPrice: number,
  aprPercent: number,
  months: number
): { axmBalance: number; rewardsEarned: number; totalValueUsd: number } {
  const initialAxm = depositUsd / axmPrice;
  const monthlyRate = aprPercent / 100 / 12;
  let balance = initialAxm;
  
  for (let i = 0; i < months; i++) {
    balance += balance * monthlyRate;
  }
  
  const rewardsEarned = balance - initialAxm;
  const totalValueUsd = balance * axmPrice;
  
  return { axmBalance: balance, rewardsEarned, totalValueUsd };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { tenantAddress, depositId, includeProjections } = req.query;
      
      if (depositId) {
        const deposit = await db.select()
          .from(keygrowDeposits)
          .where(eq(keygrowDeposits.depositId, depositId as string))
          .limit(1);
        
        if (deposit.length === 0) {
          return res.status(404).json({ success: false, error: 'Deposit not found' });
        }
        
        let depositData: any = deposit[0];
        
        if (depositData.status === 'staking' && depositData.depositDate) {
          const daysStaked = Math.floor(
            (Date.now() - new Date(depositData.depositDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          const currentAxm = parseFloat(depositData.depositAmountAxm || '0');
          const apr = parseFloat(depositData.stakingAprPercent || '8');
          const rewards = calculateStakingRewards(currentAxm, apr, daysStaked);
          
          depositData = {
            ...depositData,
            calculatedRewards: rewards,
            currentTotalAxm: currentAxm + rewards,
            currentTotalValueUsd: (currentAxm + rewards) * AXM_PRICE,
            daysStaked
          };
        }
        
        return res.status(200).json({ success: true, deposit: depositData });
      }
      
      if (tenantAddress) {
        if (!validateWalletAddress(tenantAddress as string)) {
          return res.status(400).json({ success: false, error: 'Invalid wallet address' });
        }
        
        const deposits = await db.select()
          .from(keygrowDeposits)
          .where(eq(keygrowDeposits.tenantAddress, (tenantAddress as string).toLowerCase()))
          .orderBy(desc(keygrowDeposits.createdAt));
        
        const enrichedDeposits = deposits.map(deposit => {
          if (deposit.status === 'staking' && deposit.depositDate) {
            const daysStaked = Math.floor(
              (Date.now() - new Date(deposit.depositDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            const currentAxm = parseFloat(deposit.depositAmountAxm || '0');
            const apr = parseFloat(deposit.stakingAprPercent || '8');
            const rewards = calculateStakingRewards(currentAxm, apr, daysStaked);
            
            return {
              ...deposit,
              calculatedRewards: rewards,
              currentTotalAxm: currentAxm + rewards,
              currentTotalValueUsd: (currentAxm + rewards) * AXM_PRICE,
              daysStaked
            };
          }
          return deposit;
        });
        
        const totalDepositsUsd = deposits.reduce(
          (sum, d) => sum + parseFloat(d.depositAmountUsd || '0'), 0
        );
        const totalStakingRewards = enrichedDeposits.reduce(
          (sum, d: any) => sum + (d.calculatedRewards || 0), 0
        );
        
        return res.status(200).json({ 
          success: true, 
          deposits: enrichedDeposits,
          summary: {
            totalDeposits: deposits.length,
            totalDepositsUsd,
            totalStakingRewards,
            totalValueAxm: enrichedDeposits.reduce((sum, d: any) => sum + (d.currentTotalAxm || 0), 0),
            activeStaking: deposits.filter(d => d.status === 'staking').length
          }
        });
      }
      
      if (includeProjections === 'true') {
        const projections = {
          depositAmount: 500,
          axmPrice: AXM_PRICE,
          stakingApr: STAKING_APR,
          projections: [
            { months: 6, ...calculateProjectedValue(500, AXM_PRICE, STAKING_APR, 6) },
            { months: 12, ...calculateProjectedValue(500, AXM_PRICE, STAKING_APR, 12) },
            { months: 24, ...calculateProjectedValue(500, AXM_PRICE, STAKING_APR, 24) },
            { months: 36, ...calculateProjectedValue(500, AXM_PRICE, STAKING_APR, 36) },
            { months: 60, ...calculateProjectedValue(500, AXM_PRICE, STAKING_APR, 60) },
          ]
        };
        
        return res.status(200).json({ success: true, projections });
      }
      
      return res.status(400).json({ 
        success: false, 
        error: 'Provide tenantAddress, depositId, or includeProjections=true' 
      });
    }
    
    if (req.method === 'POST') {
      const session = await getSIWESession(req, res);
      
      if (!session || !session.address) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      const { propertyId, enrollmentId, transactionHash } = req.body;
      const tenantAddress = session.address.toLowerCase();
      
      const depositAmountAxm = 500 / AXM_PRICE;
      const depositId = generateDepositId();
      
      const [newDeposit] = await db.insert(keygrowDeposits).values({
        depositId,
        tenantAddress,
        propertyId: propertyId || null,
        enrollmentId: enrollmentId || null,
        depositAmountUsd: '500',
        depositAmountAxm: depositAmountAxm.toFixed(8),
        axmPriceAtDeposit: AXM_PRICE.toString(),
        currentAxmBalance: depositAmountAxm.toFixed(8),
        stakingRewardsEarned: '0',
        stakingAprPercent: STAKING_APR.toString(),
        totalValueUsd: '500',
        transactionHash: transactionHash || null,
        status: 'staking',
        depositDate: new Date(),
        lastRewardCalculation: new Date(),
      }).returning();
      
      return res.status(201).json({ 
        success: true, 
        deposit: newDeposit,
        message: 'Option consideration recorded and staking initiated',
        stakingDetails: {
          axmStaked: depositAmountAxm,
          apr: STAKING_APR,
          projectedYear1: calculateProjectedValue(500, AXM_PRICE, STAKING_APR, 12)
        }
      });
    }
    
    if (req.method === 'PATCH') {
      const session = await getSIWESession(req, res);
      
      if (!session || !session.address) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      const { depositId, action } = req.body;
      
      if (!depositId) {
        return res.status(400).json({ success: false, error: 'depositId required' });
      }
      
      const [existingDeposit] = await db.select()
        .from(keygrowDeposits)
        .where(eq(keygrowDeposits.depositId, depositId))
        .limit(1);
      
      if (!existingDeposit) {
        return res.status(404).json({ success: false, error: 'Deposit not found' });
      }
      
      if (existingDeposit.tenantAddress.toLowerCase() !== session.address.toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }
      
      if (action === 'calculate_rewards') {
        const daysStaked = Math.floor(
          (Date.now() - new Date(existingDeposit.depositDate!).getTime()) / (1000 * 60 * 60 * 24)
        );
        const currentAxm = parseFloat(existingDeposit.depositAmountAxm || '0');
        const apr = parseFloat(existingDeposit.stakingAprPercent || '8');
        const rewards = calculateStakingRewards(currentAxm, apr, daysStaked);
        
        const [updatedDeposit] = await db.update(keygrowDeposits)
          .set({
            stakingRewardsEarned: rewards.toFixed(8),
            currentAxmBalance: (currentAxm + rewards).toFixed(8),
            totalValueUsd: ((currentAxm + rewards) * AXM_PRICE).toFixed(2),
            lastRewardCalculation: new Date(),
            updatedAt: new Date()
          })
          .where(eq(keygrowDeposits.depositId, depositId))
          .returning();
        
        return res.status(200).json({ 
          success: true, 
          deposit: updatedDeposit,
          rewardsCalculated: rewards,
          daysStaked
        });
      }
      
      if (action === 'apply_to_down_payment') {
        if (existingDeposit.appliedToDownPayment) {
          return res.status(400).json({ 
            success: false, 
            error: 'Deposit already applied to down payment' 
          });
        }
        
        const [updatedDeposit] = await db.update(keygrowDeposits)
          .set({
            appliedToDownPayment: true,
            appliedAt: new Date(),
            status: 'applied',
            updatedAt: new Date()
          })
          .where(eq(keygrowDeposits.depositId, depositId))
          .returning();
        
        return res.status(200).json({ 
          success: true, 
          deposit: updatedDeposit,
          message: 'Deposit successfully applied to down payment'
        });
      }
      
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' });
    
  } catch (error: any) {
    console.error('Deposits API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process deposit request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
