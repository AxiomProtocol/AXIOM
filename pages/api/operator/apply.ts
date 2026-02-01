import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import { createOnboarding } from '../../../src/nodes/onboarding';
import { NodeOperator, NodeOnboarding, OperatorRole } from '../../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');
const ONBOARDING_FILE = path.join(DATA_DIR, 'onboarding.json');

const MAX_STRING_LENGTH = 200;
const VALID_ROLES: OperatorRole[] = ['OBSERVER', 'VALIDATOR', 'ATTESTOR'];

function sanitizeString(value: any, maxLength: number = MAX_STRING_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength).replace(/<[^>]*>/g, '');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidWallet(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

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
  const tempFile = `${filePath}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, filePath);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb',
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const walletAddress = sanitizeString(body.walletAddress, 42);
    const displayName = sanitizeString(body.displayName);
    const email = sanitizeString(body.email);
    const role = body.role;

    if (!walletAddress || !isValidWallet(walletAddress)) {
      return res.status(400).json({ message: 'Valid Ethereum wallet address required (0x...)' });
    }

    if (!displayName || displayName.length < 2) {
      return res.status(400).json({ message: 'Display name is required (min 2 characters)' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Valid email address is required' });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Valid role is required: OBSERVER, VALIDATOR, or ATTESTOR' });
    }

    ensureDir(DATA_DIR);
    const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
    const onboardings = loadJson<NodeOnboarding[]>(ONBOARDING_FILE, []);

    if (operators.length > 10000) {
      return res.status(503).json({ message: 'System capacity reached. Please try again later.' });
    }

    const existing = operators.find(
      (op) => op.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );

    if (existing) {
      return res.status(400).json({ message: 'This wallet address is already registered' });
    }

    const emailExists = operators.find(
      (op) => op.displayName && (op as any).email?.toLowerCase() === email.toLowerCase()
    );

    const { operator, onboarding } = createOnboarding({
      walletAddress: walletAddress.toLowerCase(),
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
      operator: {
        operatorId: operator.operatorId,
        walletAddress: operator.walletAddress,
        displayName: operator.displayName,
        role: operator.role,
        status: operator.status,
      },
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
