import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getWalletSession } from '../../../lib/auth/wallet-session';
import { NotePerformanceStatus, NoteType, PropertyType } from '../../../src/notes/types';

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

function generateNoteId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `NOTE-${timestamp}-${random}`.toUpperCase();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50kb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getWalletSession(req);
    const walletAddress = session.authenticated ? session.address : null;

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

    let performanceStatus = 'PERFORMING';
    if (VALID_PERFORMANCE_STATUS.includes(body.performanceStatus)) {
      performanceStatus = body.performanceStatus;
    }

    let noteType = 'FIRST_LIEN';
    if (VALID_NOTE_TYPES.includes(body.noteType)) {
      noteType = body.noteType;
    }

    let propertyType = 'SFR';
    if (VALID_PROPERTY_TYPES.includes(body.propertyType)) {
      propertyType = body.propertyType;
    }

    const maturityDate = sanitizeString(body.maturityDate, 20);
    const originationDate = sanitizeString(body.originationDate, 20);
    const lastPaymentDate = sanitizeString(body.lastPaymentDate, 20);

    const noteId = generateNoteId();

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO note_submissions (
          note_id, submitted_by, submitter_email, seller_name, seller_email, seller_phone, seller_company,
          performance_status, note_type, unpaid_principal_balance, original_loan_amount,
          interest_rate, note_rate, monthly_payment, payments_remaining, maturity_date, origination_date,
          property_address, property_city, property_state, property_zip, property_type,
          estimated_property_value, ltv, borrower_payment_history, months_delinquent, last_payment_date,
          asking_price, discount_from_upb, has_title, has_original_note, has_allonge, has_assignment,
          has_servicing_records, has_payment_history, has_borrower_info, notes, status, pipeline_phase
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)
        RETURNING id, note_id`,
        [
          noteId, walletAddress, sellerEmail, sellerName, sellerEmail, sellerPhone || null, sellerCompany || null,
          performanceStatus, noteType, unpaidPrincipalBalance, originalLoanAmount,
          interestRate, noteRate, monthlyPayment, paymentsRemaining, maturityDate || null, originationDate || null,
          propertyAddress, propertyCity, propertyState, propertyZip, propertyType,
          estimatedPropertyValue, ltv, borrowerPaymentHistory || null, monthsDelinquent, lastPaymentDate || null,
          askingPrice, discountFromUPB, sanitizeBoolean(body.hasTitle), sanitizeBoolean(body.hasOriginalNote),
          sanitizeBoolean(body.hasAllonge), sanitizeBoolean(body.hasAssignment),
          sanitizeBoolean(body.hasServicingRecords), sanitizeBoolean(body.hasPaymentHistory),
          sanitizeBoolean(body.hasBorrowerInfo), notes || null, 'SUBMITTED', 'INTAKE'
        ]
      );

      res.status(200).json({
        success: true,
        noteId: result.rows[0].note_id,
        message: 'Note submitted successfully'
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error submitting note:', error);
    if (error.code === '42P01') {
      return res.status(503).json({ message: 'Database tables not yet available. Please try again later.' });
    }
    res.status(500).json({ message: 'Failed to submit note' });
  }
}
