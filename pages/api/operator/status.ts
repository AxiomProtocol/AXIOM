import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');

function loadJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.warn(`Failed to load ${filePath}`);
  }
  return defaultValue;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ message: 'Wallet address required' });
  }

  try {
    const operators = loadJson<any[]>(path.join(DATA_DIR, 'operators.json'), []);
    const ledgers = loadJson<any[]>(path.join(DATA_DIR, 'rewards-ledger.json'), []);

    const operator = operators.find(
      (op: any) => op.walletAddress.toLowerCase() === wallet.toLowerCase()
    );

    if (!operator) {
      return res.status(200).json({ operator: null, rewards: null });
    }

    const ledger = ledgers.find((l: any) => l.operatorId === operator.operatorId);
    const rewards = ledger ? {
      usdAccrued: ledger.usdAccrued || 0,
      usdPaid: ledger.usdPaid || 0,
      usdPending: ledger.usdPending || 0,
      conversionBucket: ledger.conversionBucket || 0,
      slashedAmount: ledger.slashedAmount || 0,
    } : null;

    res.status(200).json({ operator, rewards });
  } catch (error) {
    console.error('Error fetching operator status:', error);
    res.status(500).json({ message: 'Failed to fetch operator status' });
  }
}
