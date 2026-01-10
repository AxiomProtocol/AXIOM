import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { frontMatter, chapter1, chapter2, chapter3 } from '../../../server/content/manuscript-part1';
import { chapter4, chapter9to12, chapter13to16, chapter17to20 } from '../../../server/content/manuscript-part2';
import { backMatter, communityStories, worksheets } from '../../../server/content/manuscript-part3';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-docs',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Docs not connected');
  }
  return accessToken;
}

function compileManuscript(): string {
  return [
    frontMatter,
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter9to12,
    chapter13to16,
    chapter17to20,
    communityStories,
    worksheets,
    backMatter
  ].join('\n\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const accessToken = await getAccessToken();

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    const createResponse = await docs.documents.create({
      requestBody: {
        title: 'The Axiom Wealth Generation Manual - Gold Standard Edition'
      }
    });

    const documentId = createResponse.data.documentId;

    if (!documentId) {
      throw new Error('Failed to create document');
    }

    const manuscript = compileManuscript();
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: manuscript
            }
          }
        ]
      }
    });

    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    res.status(200).json({
      success: true,
      documentId,
      documentUrl,
      message: 'Manuscript created successfully in Google Docs',
      stats: {
        wordCount: manuscript.split(/\s+/).length,
        characterCount: manuscript.length,
        estimatedPages: Math.ceil(manuscript.split(/\s+/).length / 250)
      }
    });
  } catch (error: any) {
    console.error('Error creating Google Doc:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create Google Doc'
    });
  }
}
