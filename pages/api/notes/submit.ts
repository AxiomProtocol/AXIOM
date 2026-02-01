import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import { NoteSubmission, createNoteId, NotePerformanceStatus, NoteType, PropertyType } from '../../../src/notes/types';

const DATA_DIR = path.join(process.cwd(), 'data/notes');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

const MAX_PAYLOAD_SIZE = 50 * 1024;
const MAX_STRING_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;

const VALID_PERFORMANCE_STATUS: NotePerformanceStatus[] = ['PERFORMING', 'SUB_PERFORMING', 'NON_PERFORMING', 'REO'];
const VALID_NOTE_TYPES: NoteType[] = ['FIRST_LIEN', 'SECOND_LIEN', 'HELOC', 'LAND_CONTRACT', 'CFD'];
const VALID_PROPERTY_TYPES: PropertyType[] = ['SFR', 'MULTI_FAMILY', 'CONDO', 'TOWNHOUSE', 'MANUFACTURED', 'COMMERCIAL', 'LAND'];

function sanitizeString(value: any, maxLength: number = MAX_STRING_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength).replace(/<[^>]*>/g, '');
}

function sanitizeNumber(value: any, min: number = 0, max: number = 100000000): number {
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.max(min, Math.min(max, num));
}

function sanitizeBoolean(value: any): boolean {
  return value === true || value === 'true';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function calculateLTV(upb: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return Math.round((upb / propertyValue) * 100 * 100) / 100;
}

function calculateDiscount(upb: number, askingPrice: number): number {
  if (upb <= 0) return 0;
  return Math.round(((upb - askingPrice) / upb) * 100 * 100) / 100;
}

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
  const tempFile = `${SUBMISSIONS_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(submissions, null, 2));
  fs.renameSync(tempFile, SUBMISSIONS_FILE);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50kb',
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return res.status(413).json({ message: 'Payload too large' });
    }

    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const sellerName = sanitizeString(body.sellerName);
    const sellerEmail = sanitizeString(body.sellerEmail);
    const sellerPhone = sanitizeString(body.sellerPhone);
    const sellerCompany = sanitizeString(body.sellerCompany);
    const propertyAddress = sanitizeString(body.propertyAddress);
    const propertyCity = sanitizeString(body.propertyCity);
    const propertyState = sanitizeString(body.propertyState, 50);
    const propertyZip = sanitizeString(body.propertyZip, 20);
    const borrowerPaymentHistory = sanitizeString(body.borrowerPaymentHistory, MAX_NOTES_LENGTH);
    const notes = sanitizeString(body.notes, MAX_NOTES_LENGTH);

    if (!sellerName || sellerName.length < 2) {
      return res.status(400).json({ message: 'Seller name is required (min 2 characters)' });
    }
    if (!sellerEmail || !isValidEmail(sellerEmail)) {
      return res.status(400).json({ message: 'Valid email address is required' });
    }
    if (!propertyAddress || propertyAddress.length < 5) {
      return res.status(400).json({ message: 'Property address is required (min 5 characters)' });
    }
    if (!propertyCity || propertyCity.length < 2) {
      return res.status(400).json({ message: 'Property city is required' });
    }
    if (!propertyState) {
      return res.status(400).json({ message: 'Property state is required' });
    }

    const unpaidPrincipalBalance = sanitizeNumber(body.unpaidPrincipalBalance, 1000);
    const originalLoanAmount = sanitizeNumber(body.originalLoanAmount, 0) || unpaidPrincipalBalance;
    const interestRate = sanitizeNumber(body.interestRate, 0, 50);
    const noteRate = sanitizeNumber(body.noteRate, 0, 50) || interestRate;
    const monthlyPayment = sanitizeNumber(body.monthlyPayment, 0);
    const paymentsRemaining = Math.floor(sanitizeNumber(body.paymentsRemaining, 0, 600));
    const estimatedPropertyValue = sanitizeNumber(body.estimatedPropertyValue, 0);
    const monthsDelinquent = Math.floor(sanitizeNumber(body.monthsDelinquent, 0, 240));
    const askingPrice = sanitizeNumber(body.askingPrice, 100);

    if (unpaidPrincipalBalance < 1000) {
      return res.status(400).json({ message: 'Unpaid principal balance must be at least $1,000' });
    }
    if (askingPrice < 100) {
      return res.status(400).json({ message: 'Asking price must be at least $100' });
    }
    if (askingPrice > unpaidPrincipalBalance * 2) {
      return res.status(400).json({ message: 'Asking price cannot exceed 2x UPB' });
    }

    const ltv = calculateLTV(unpaidPrincipalBalance, estimatedPropertyValue);
    const discountFromUPB = calculateDiscount(unpaidPrincipalBalance, askingPrice);

    let performanceStatus: NotePerformanceStatus = 'PERFORMING';
    if (VALID_PERFORMANCE_STATUS.includes(body.performanceStatus)) {
      performanceStatus = body.performanceStatus;
    }

    let noteType: NoteType = 'FIRST_LIEN';
    if (VALID_NOTE_TYPES.includes(body.noteType)) {
      noteType = body.noteType;
    }

    let propertyType: PropertyType = 'SFR';
    if (VALID_PROPERTY_TYPES.includes(body.propertyType)) {
      propertyType = body.propertyType;
    }

    const maturityDate = sanitizeString(body.maturityDate, 20);
    const originationDate = sanitizeString(body.originationDate, 20);
    const lastPaymentDate = sanitizeString(body.lastPaymentDate, 20);

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
      ltv,
      borrowerPaymentHistory,
      monthsDelinquent,
      lastPaymentDate: lastPaymentDate || undefined,
      askingPrice,
      discountFromUPB,
      hasTitle: sanitizeBoolean(body.hasTitle),
      hasOriginalNote: sanitizeBoolean(body.hasOriginalNote),
      hasAllonge: sanitizeBoolean(body.hasAllonge),
      hasAssignment: sanitizeBoolean(body.hasAssignment),
      hasServicingRecords: sanitizeBoolean(body.hasServicingRecords),
      hasPaymentHistory: sanitizeBoolean(body.hasPaymentHistory),
      hasBorrowerInfo: sanitizeBoolean(body.hasBorrowerInfo),
      notes: notes || undefined,
      status: 'SUBMITTED',
      pipelinePhase: 'INTAKE',
      createdAt: now,
      updatedAt: now
    };

    const submissions = loadSubmissions();
    
    if (submissions.length > 10000) {
      return res.status(503).json({ message: 'System capacity reached. Please try again later.' });
    }

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
