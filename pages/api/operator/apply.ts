import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import { createOnboarding } from '../../../src/nodes/onboarding';
import { NodeOperator, NodeOnboarding, OperatorRole } from '../../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');
const ONBOARDING_FILE = path.join(DATA_DIR, 'onboarding.json');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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

function saveJson(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { walletAddress, displayName, email, role } = req.body;

    if (!walletAddress || !displayName || !email || !role) {
      return res.status(400).json({ message: 'All fields required' });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ message: 'Invalid wallet address' });
    }

    const validRoles: OperatorRole[] = ['OBSERVER', 'VALIDATOR', 'ATTESTOR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    ensureDir(DATA_DIR);
    const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
    const onboardings = loadJson<NodeOnboarding[]>(ONBOARDING_FILE, []);

    const existing = operators.find(
      (op) => op.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );

    if (existing) {
      return res.status(400).json({ message: 'Wallet already registered' });
    }

    const { operator, onboarding } = createOnboarding({
      walletAddress,
      displayName,
      email,
      requestedRole: role as OperatorRole,
    });

    operators.push(operator);
    onboardings.push(onboarding);

    saveJson(OPERATORS_FILE, operators);
    saveJson(ONBOARDING_FILE, onboardings);

    res.status(200).json({
      success: true,
      operator,
      onboarding: {
        onboardingId: onboarding.onboardingId,
        currentPhase: onboarding.currentPhase,
        expiresAt: onboarding.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error processing application:', error);
    res.status(500).json({ message: 'Failed to process application' });
  }
}
