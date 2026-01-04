import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { landownerApplications } from '../../../shared/schema';
import multer from 'multer';
import { promisify } from 'util';

export const config = {
  api: {
    bodyParser: false
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadMiddleware = promisify(upload.array('photos', 5));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await uploadMiddleware(req as any, res as any);
    
    const body = (req as any).body || {};
    const files = (req as any).files || [];
    
    const {
      name,
      email,
      phone,
      county,
      state,
      parcelAddress,
      acreage,
      currentUse,
      desiredUse,
      willingnessForProduce,
      utilitiesNotes,
      accessNotes,
      additionalNotes
    } = body;

    if (!name || !email || !county || !state || !parcelAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, county, state, parcelAddress' 
      });
    }

    const photoData = files.length > 0 ? files.map((f: any) => ({
      filename: f.originalname,
      size: f.size,
      mimetype: f.mimetype
    })) : null;

    const [application] = await db.insert(landownerApplications).values({
      name,
      email,
      phone: phone || null,
      county,
      state,
      parcelAddress,
      acreage: acreage || null,
      currentUse: currentUse || null,
      desiredUse: desiredUse || null,
      willingnessForProduce: willingnessForProduce || null,
      utilitiesNotes: utilitiesNotes || null,
      accessNotes: accessNotes || null,
      additionalNotes: additionalNotes || null,
      photos: photoData,
      status: 'pending'
    }).returning();

    return res.status(201).json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully. A steward will contact you within 48 hours.'
    });
  } catch (error) {
    console.error('Error submitting landowner application:', error);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
}
