import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from '@google-cloud/storage';

const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

const storage = new Storage({
  credentials: {
    audience: 'replit',
    subject_token_type: 'access_token',
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: 'external_account',
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: 'json',
        subject_token_field_name: 'access_token',
      },
    },
    universe_domain: 'googleapis.com',
  } as any,
  projectId: '',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pathParts = req.query.path as string[];
    const objectPath = pathParts.join('/');

    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir) {
      return res.status(500).json({ error: 'Object storage not configured' });
    }

    const fullPath = `${privateDir}/${objectPath}`;
    const pathWithSlash = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
    const parts = pathWithSlash.split('/');
    const bucketName = parts[1];
    const objectName = parts.slice(2).join('/');

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'Object not found' });
    }

    const [metadata] = await file.getMetadata();
    
    res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', metadata.size || 0);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = file.createReadStream();
    stream.pipe(res);
  } catch (error: any) {
    console.error('Error serving object:', error);
    res.status(500).json({ error: 'Failed to serve object' });
  }
}
