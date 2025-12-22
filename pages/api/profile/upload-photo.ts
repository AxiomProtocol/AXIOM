import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

const { ObjectStorageService } = require('../../../server/objectStorage');
const objectStorage = new ObjectStorageService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const uploadUrl = await objectStorage.getObjectEntityUploadURL();
    
    res.status(200).json({ 
      success: true, 
      uploadUrl,
      message: 'Use this URL to upload your profile photo'
    });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate upload URL',
      fallback: true
    });
  }
}
