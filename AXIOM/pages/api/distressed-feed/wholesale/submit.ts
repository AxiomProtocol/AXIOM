import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dpWholesalerSubmissions } from '../../../../shared/distressedFeedSchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    submitterName, submitterEmail, submitterPhone,
    propertyAddress, city, state, zip,
    askingPrice, arv, rehabEstimate,
    propertyType, bedrooms, bathrooms, sqft, yearBuilt,
    description, photos, contractEndDate,
  } = req.body;

  if (!submitterName || !submitterEmail || !propertyAddress || !city || !state || !zip || !askingPrice) {
    return res.status(400).json({
      error: 'Required fields: submitterName, submitterEmail, propertyAddress, city, state, zip, askingPrice',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(submitterEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (String(state).length !== 2) {
    return res.status(400).json({ error: 'State must be 2-letter abbreviation' });
  }

  if (Number(askingPrice) <= 0) {
    return res.status(400).json({ error: 'Asking price must be greater than zero' });
  }

  try {
    const [submission] = await db.insert(dpWholesalerSubmissions).values({
      submitterName,
      submitterEmail,
      submitterPhone: submitterPhone || null,
      propertyAddress,
      city,
      state: state.toUpperCase(),
      zip,
      askingPrice: String(askingPrice),
      arv: arv ? String(arv) : null,
      rehabEstimate: rehabEstimate ? String(rehabEstimate) : null,
      propertyType: propertyType || 'single_family',
      bedrooms: bedrooms || null,
      bathrooms: bathrooms ? String(bathrooms) : null,
      sqft: sqft || null,
      yearBuilt: yearBuilt || null,
      description: description || null,
      photos: photos || [],
      contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
      status: 'pending',
    }).returning();

    return res.status(201).json({
      submission: {
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt,
      },
      message: 'Deal submitted successfully. Our team will review within 48 hours.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to submit deal', detail: message });
  }
}
