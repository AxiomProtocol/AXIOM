import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';

const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: 'PUT' | 'GET';
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to sign URL: ${response.status}`);
  }

  const { signed_url } = await response.json();
  return signed_url;
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  const parts = path.split('/');
  if (parts.length < 3) {
    throw new Error('Invalid path');
  }
  return {
    bucketName: parts[1],
    objectName: parts.slice(2).join('/'),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, size, contentType, category = 'land-documents' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    if (size && size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
    }

    if (contentType && !ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX' 
      });
    }

    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir) {
      return res.status(500).json({ error: 'Object storage not configured' });
    }

    const objectId = randomUUID();
    const ext = name.split('.').pop() || '';
    const safeFilename = `${objectId}${ext ? `.${ext}` : ''}`;
    const fullPath = `${privateDir}/${category}/${safeFilename}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: 'PUT',
      ttlSec: 900,
    });

    res.json({
      uploadURL,
      objectPath: `${category}/${safeFilename}`,
      fullStoragePath: fullPath,
      metadata: { name, size, contentType },
    });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}
