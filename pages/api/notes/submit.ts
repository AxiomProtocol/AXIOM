import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import { NoteSubmission, createNoteId } from '../../../src/notes/types';

const DATA_DIR = path.join(process.cwd(), 'data/notes');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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

function saveSubmissions(submissions: NoteSubmission[]): void {
  ensureDir(DATA_DIR);
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      sellerName,
      sellerEmail,
      sellerPhone,
      sellerCompany,
      performanceStatus,
      noteType,
      unpaidPrincipalBalance,
      originalLoanAmount,
      interestRate,
      noteRate,
      monthlyPayment,
      paymentsRemaining,
      maturityDate,
      originationDate,
      propertyAddress,
      propertyCity,
      propertyState,
      propertyZip,
      propertyType,
      estimatedPropertyValue,
      borrowerPaymentHistory,
      monthsDelinquent,
      lastPaymentDate,
      askingPrice,
      ltv,
      discountFromUPB,
      hasTitle,
      hasOriginalNote,
      hasAllonge,
      hasAssignment,
      hasServicingRecords,
      hasPaymentHistory,
      hasBorrowerInfo,
      notes
    } = req.body;

    if (!sellerName || !sellerEmail || !unpaidPrincipalBalance || !propertyAddress || !askingPrice) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const noteId = createNoteId();
    const now = new Date().toISOString();

    const submission: NoteSubmission = {
      noteId,
      submittedAt: now,
      submittedBy: sellerEmail,
      sellerName,
      sellerEmail,
      sellerPhone: sellerPhone || undefined,
      sellerCompany: sellerCompany || undefined,
      performanceStatus: performanceStatus || 'PERFORMING',
      noteType: noteType || 'FIRST_LIEN',
      unpaidPrincipalBalance,
      originalLoanAmount: originalLoanAmount || unpaidPrincipalBalance,
      interestRate: interestRate || 0,
      noteRate: noteRate || interestRate || 0,
      monthlyPayment: monthlyPayment || 0,
      paymentsRemaining: paymentsRemaining || 0,
      maturityDate: maturityDate || '',
      originationDate: originationDate || '',
      propertyAddress,
      propertyCity,
      propertyState,
      propertyZip,
      propertyType: propertyType || 'SFR',
      estimatedPropertyValue: estimatedPropertyValue || 0,
      ltv: ltv || 0,
      borrowerPaymentHistory: borrowerPaymentHistory || '',
      monthsDelinquent: monthsDelinquent || 0,
      lastPaymentDate: lastPaymentDate || undefined,
      askingPrice,
      discountFromUPB: discountFromUPB || 0,
      hasTitle: hasTitle || false,
      hasOriginalNote: hasOriginalNote || false,
      hasAllonge: hasAllonge || false,
      hasAssignment: hasAssignment || false,
      hasServicingRecords: hasServicingRecords || false,
      hasPaymentHistory: hasPaymentHistory || false,
      hasBorrowerInfo: hasBorrowerInfo || false,
      notes: notes || undefined,
      status: 'SUBMITTED',
      pipelinePhase: 'INTAKE',
      createdAt: now,
      updatedAt: now
    };

    const submissions = loadSubmissions();
    submissions.push(submission);
    saveSubmissions(submissions);

    res.status(200).json({
      success: true,
      noteId,
      message: 'Note submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting note:', error);
    res.status(500).json({ message: 'Failed to submit note' });
  }
}
