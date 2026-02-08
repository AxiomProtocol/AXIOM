import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getWalletSession, requireAuth } from '../../../lib/auth/wallet-session';

function isValidWallet(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
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
      return res.status(401).json({ message: 'Authentication required. Please connect your wallet and sign in.' });
    }

    const walletAddress = session.address!.toLowerCase();
    const { noteId, attestationType } = req.body;

    if (!noteId || typeof noteId !== 'string') {
      return res.status(400).json({ message: 'Note ID is required' });
    }

    if (!attestationType || !['A', 'B'].includes(attestationType)) {
      return res.status(400).json({ message: 'Attestation type must be A or B' });
    }

    const client = await pool.connect();
    try {
      const operatorResult = await client.query(
        `SELECT operator_id, role, status FROM node_operators WHERE wallet_address = $1`,
        [walletAddress]
      );

      if (operatorResult.rows.length === 0) {
        return res.status(403).json({ message: 'You must be a registered operator to attest notes' });
      }

      const operator = operatorResult.rows[0];

      if (operator.status !== 'ACTIVE') {
        return res.status(403).json({ message: 'Your operator account must be active to attest notes' });
      }

      if (operator.role !== 'ATTESTOR' && operator.role !== 'VALIDATOR') {
        return res.status(403).json({ message: 'Only Attestors and Validators can attest notes' });
      }

      const noteResult = await client.query(
        `SELECT id, note_id, pipeline_phase, assigned_attestor_a, assigned_attestor_b, attestation_a_at, attestation_b_at
         FROM note_submissions WHERE note_id = $1`,
        [noteId]
      );

      if (noteResult.rows.length === 0) {
        return res.status(404).json({ message: 'Note not found' });
      }

      const note = noteResult.rows[0];

      if (note.pipeline_phase !== 'VALUATION' && note.pipeline_phase !== 'ATTESTATION') {
        return res.status(400).json({ 
          message: `Note must be in VALUATION or ATTESTATION phase for attestation. Current phase: ${note.pipeline_phase}` 
        });
      }

      if (attestationType === 'A') {
        if (note.assigned_attestor_a && note.attestation_a_at) {
          return res.status(400).json({ message: 'Attestation A already completed' });
        }

        await client.query('BEGIN');
        
        await client.query(
          `UPDATE note_submissions 
           SET assigned_attestor_a = $1, attestation_a_at = NOW(), pipeline_phase = 'ATTESTATION', updated_at = NOW()
           WHERE note_id = $2`,
          [walletAddress, noteId]
        );

        await client.query(
          `UPDATE node_operators 
           SET attestation_count = attestation_count + 1, last_activity_at = NOW(), updated_at = NOW()
           WHERE wallet_address = $1`,
          [walletAddress]
        );

        await client.query('COMMIT');

        res.status(200).json({
          success: true,
          message: 'Attestation A recorded successfully',
          noteId,
          attestationType: 'A',
          attestorAddress: walletAddress
        });
      } else {
        if (!note.assigned_attestor_a || !note.attestation_a_at) {
          return res.status(400).json({ message: 'Attestation A must be completed first' });
        }

        if (note.assigned_attestor_a.toLowerCase() === walletAddress) {
          return res.status(400).json({ message: 'Attestation B must be from a different operator than Attestation A' });
        }

        if (note.assigned_attestor_b && note.attestation_b_at) {
          return res.status(400).json({ message: 'Attestation B already completed' });
        }

        await client.query('BEGIN');

        await client.query(
          `UPDATE note_submissions 
           SET assigned_attestor_b = $1, attestation_b_at = NOW(), pipeline_phase = 'ACQUISITION', status = 'APPROVED', updated_at = NOW()
           WHERE note_id = $2`,
          [walletAddress, noteId]
        );

        await client.query(
          `UPDATE node_operators 
           SET attestation_count = attestation_count + 1, last_activity_at = NOW(), updated_at = NOW()
           WHERE wallet_address = $1`,
          [walletAddress]
        );

        await client.query('COMMIT');

        res.status(200).json({
          success: true,
          message: 'Attestation B recorded successfully. Note approved for acquisition.',
          noteId,
          attestationType: 'B',
          attestorAddress: walletAddress,
          dualAttestationComplete: true
        });
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error recording attestation:', error);
    if (error.code === '42P01') {
      return res.status(503).json({ message: 'Database tables not yet available. Please try again later.' });
    }
    res.status(500).json({ message: 'Failed to record attestation' });
  }
}
