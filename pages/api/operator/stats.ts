import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

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

  try {
    const operators = loadJson<any[]>(path.join(DATA_DIR, 'operators.json'), []);
    const sampleOperators = loadJson<any[]>(path.join(DATA_DIR, 'operators.sample.json'), []);
    const attestations = loadJson<any[]>(path.join(DATA_DIR, 'attestations.json'), []);
    const sampleAttestations = loadJson<any[]>(path.join(DATA_DIR, 'attestations.sample.json'), []);
    const ledgers = loadJson<any[]>(path.join(DATA_DIR, 'rewards-ledger.json'), []);
    const sampleLedgers = loadJson<any[]>(path.join(DATA_DIR, 'rewards-ledger.sample.json'), []);
    const config = loadJson<any>(CONFIG_FILE, { observationWindowEndDate: '2026-03-26' });

    const allOperators = operators.length > 0 ? operators : sampleOperators;
    const allAttestations = attestations.length > 0 ? attestations : sampleAttestations;
    const allLedgers = ledgers.length > 0 ? ledgers : sampleLedgers;

    const activeOperators = allOperators.filter((op: any) => op.status === 'ACTIVE' && !op.suspended).length;
    const totalAttestations = allAttestations.length;
    const totalRewardsUsd = allLedgers.reduce((sum: number, l: any) => sum + (l.usdPaid || 0), 0);

    res.status(200).json({
      totalOperators: allOperators.length,
      activeOperators,
      totalAttestations,
      totalRewardsUsd,
      observationWindowEnd: config.observationWindowEndDate || '2026-03-26',
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
}
