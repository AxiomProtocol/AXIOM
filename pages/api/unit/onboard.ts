import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { unitCustomerService } from '../../../lib/services/UnitCustomerService';
import { rateLimitAuth } from '../../../lib/rateLimit';
import { validateRequiredString, validateSsn } from '../../../lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitAuth(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const { firstName, lastName, email, phone, dateOfBirth, ssn, address, occupation, annualIncome, sourceOfIncome } = req.body ?? {};

  const errors: string[] = [];
  const reqStr = (v: unknown, f: string) => { const e = validateRequiredString(v, f); if (e) errors.push(e); };
  reqStr(firstName, 'First name');
  reqStr(lastName, 'Last name');
  reqStr(email, 'Email');
  reqStr(phone, 'Phone');
  reqStr(dateOfBirth, 'Date of birth');
  const ssnErr = validateSsn(ssn);
  if (ssnErr) errors.push(ssnErr);
  reqStr(address?.street, 'Street address');
  reqStr(address?.city, 'City');
  reqStr(address?.state, 'State');
  reqStr(address?.postalCode, 'Postal code');
  reqStr(occupation, 'Occupation');
  reqStr(annualIncome, 'Annual income');
  reqStr(sourceOfIncome, 'Source of income');

  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const result = await unitCustomerService.createIndividualApplication({
    walletAddress: session.address,
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    ssn,
    addressStreet: address.street,
    addressCity: address.city,
    addressState: address.state,
    addressPostalCode: address.postalCode,
    addressCountry: address.country ?? 'US',
    occupation,
    annualIncome,
    sourceOfIncome,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(200).json({
    success: true,
    applicationId: result.applicationId,
    status: result.status,
  });
}
