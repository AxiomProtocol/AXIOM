import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import { NoteSubmission, NotePipelineStats } from '../../../src/notes/types';

const DATA_DIR = path.join(process.cwd(), 'data/notes');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

function loadSubmissions(): NoteSubmission[] {
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Failed to load submissions');
  }
  return [];
}

function calculateStats(notes: NoteSubmission[]): NotePipelineStats {
  const totalUPB = notes.reduce((sum, n) => sum + (n.unpaidPrincipalBalance || 0), 0);
  const totalAskingPrice = notes.reduce((sum, n) => sum + (n.askingPrice || 0), 0);
  const discounts = notes.filter(n => n.discountFromUPB > 0).map(n => n.discountFromUPB);
  const averageDiscount = discounts.length > 0 ? discounts.reduce((a, b) => a + b, 0) / discounts.length : 0;

  return {
    totalNotes: notes.length,
    submitted: notes.filter(n => n.status === 'SUBMITTED' || n.status === 'INTAKE_REVIEW').length,
    inDueDiligence: notes.filter(n => n.status === 'DUE_DILIGENCE').length,
    pendingAttestation: notes.filter(n => n.status === 'ATTESTATION_PENDING').length,
    approved: notes.filter(n => n.status === 'ACQUISITION_APPROVED').length,
    acquired: notes.filter(n => n.status === 'ACQUIRED').length,
    rejected: notes.filter(n => n.status === 'REJECTED').length,
    totalUPB,
    totalAskingPrice,
    averageDiscount
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { status, performance, limit } = req.query;
    let notes = loadSubmissions();

    notes.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    if (status && status !== 'ALL') {
      notes = notes.filter(n => n.status === status);
    }

    if (performance && performance !== 'ALL') {
      notes = notes.filter(n => n.performanceStatus === performance);
    }

    const stats = calculateStats(loadSubmissions());

    if (limit) {
      notes = notes.slice(0, parseInt(limit as string));
    }

    res.status(200).json({
      notes,
      stats,
      total: notes.length
    });
  } catch (error) {
    console.error('Error listing notes:', error);
    res.status(500).json({ message: 'Failed to list notes' });
  }
}
