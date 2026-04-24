import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export interface VaultUserData {
  deposit: number;
  rewards: number;
  autoCompound: boolean;
}

export async function getOrCreateUserData(address: string): Promise<VaultUserData> {
  const key = address.toLowerCase();
  
  try {
    const result = await pool.query(
      'SELECT * FROM yield_vault_positions WHERE wallet_address = $1',
      [key]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        deposit: parseFloat(row.deposit_amount) || 0,
        rewards: parseFloat(row.rewards_accrued) || 0,
        autoCompound: row.auto_compound_enabled
      };
    }
    
    await pool.query(
      `INSERT INTO yield_vault_positions (wallet_address, deposit_amount, rewards_accrued, auto_compound_enabled)
       VALUES ($1, $2, $3, $4)`,
      [key, '0', '0', true]
    );
    
    return { deposit: 0, rewards: 0, autoCompound: true };
  } catch (error) {
    console.error('Error getting vault data:', error);
    return { deposit: 0, rewards: 0, autoCompound: true };
  }
}

export async function updateUserData(address: string, data: Partial<VaultUserData>): Promise<void> {
  const key = address.toLowerCase();
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (data.deposit !== undefined) {
    updates.push(`deposit_amount = $${paramIndex++}`);
    values.push(data.deposit.toFixed(8));
  }
  if (data.rewards !== undefined) {
    updates.push(`rewards_accrued = $${paramIndex++}`);
    values.push(data.rewards.toFixed(8));
  }
  if (data.autoCompound !== undefined) {
    updates.push(`auto_compound_enabled = $${paramIndex++}`);
    values.push(data.autoCompound);
  }
  
  updates.push(`updated_at = NOW()`);
  values.push(key);
  
  await pool.query(
    `UPDATE yield_vault_positions SET ${updates.join(', ')} WHERE wallet_address = $${paramIndex}`,
    values
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ success: false, error: 'Address required' });
  }

  try {
    const userData = await getOrCreateUserData(address);
    
    const historyResult = await pool.query(
      `SELECT id, amount_compounded, new_total, created_at 
       FROM yield_vault_compound_history 
       WHERE wallet_address = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [address.toLowerCase()]
    );
    
    const history = historyResult.rows.map(row => ({
      id: row.id.toString(),
      timestamp: new Date(row.created_at).getTime(),
      amountCompounded: row.amount_compounded,
      newTotal: row.new_total
    }));

    return res.status(200).json({
      success: true,
      vault: {
        totalDeposited: '2450000',
        totalRewards: '125000',
        apy: '18.5',
        nextCompound: Date.now() + 4 * 60 * 60 * 1000,
        userDeposit: userData.deposit.toFixed(2),
        userRewards: userData.rewards.toFixed(2),
        autoCompoundEnabled: userData.autoCompound,
      },
      history,
    });
  } catch (error: any) {
    console.error('Error fetching vault data:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch vault data' });
  }
}
