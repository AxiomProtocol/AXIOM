import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getWalletSession, requireAuth } from '../../../lib/auth/wallet-session';
import { OperatorRole } from '../../../src/nodes/types';

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

function generateOperatorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `OP-${timestamp}-${random}`.toUpperCase();
}

function generateOnboardingId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `ONB-${timestamp}-${random}`.toUpperCase();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getWalletSession(req);
    
    if (!requireAuth(session)) {
      return res.status(401).json({ 
        message: 'Wallet authentication required. Please connect your wallet and sign in with Ethereum.' 
      });
    }
    
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const walletAddress = session.address!.toLowerCase();

    const displayName = sanitizeString(body.displayName);
    const email = sanitizeString(body.email);
    const role = body.role;

    if (!displayName || displayName.length < 2) {
      return res.status(400).json({ message: 'Display name is required (min 2 characters)' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Valid email address is required' });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Valid role is required: OBSERVER, VALIDATOR, or ATTESTOR' });
    }

    const client = await pool.connect();
    try {
      const existingResult = await client.query(
        'SELECT operator_id FROM node_operators WHERE wallet_address = $1',
        [walletAddress]
      );

      if (existingResult.rows.length > 0) {
        return res.status(400).json({ message: 'This wallet address is already registered' });
      }

      const operatorId = generateOperatorId();
      const onboardingId = generateOnboardingId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await client.query('BEGIN');

      await client.query(
        `INSERT INTO node_operators (
          operator_id, wallet_address, display_name, email, role, status, onboarding_phase
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [operatorId, walletAddress, displayName, email, role, 'PENDING', 'APPLICATION']
      );

      await client.query(
        `INSERT INTO node_onboarding (
          onboarding_id, operator_id, current_phase, application_submitted_at, expires_at
        ) VALUES ($1, $2, $3, NOW(), $4)`,
        [onboardingId, operatorId, 'APPLICATION', expiresAt]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        operator: {
          operatorId,
          walletAddress,
          displayName,
          role,
          status: 'PENDING',
        },
        onboarding: {
          onboardingId,
          currentPhase: 'APPLICATION',
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error processing application:', error);
    if (error.code === '42P01') {
      return res.status(503).json({ message: 'Database tables not yet available. Please try again later.' });
    }
    if (error.code === '23505') {
      return res.status(400).json({ message: 'This wallet address is already registered' });
    }
    res.status(500).json({ message: 'Failed to process application' });
  }
}
