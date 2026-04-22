import { google } from 'googleapis';

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
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Docs not connected');
  }
  return accessToken;
}

export async function getGoogleDocsClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.docs({ version: 'v1', auth: oauth2Client });
}

export async function createDocument(title: string): Promise<string> {
  const docs = await getGoogleDocsClient();
  
  const response = await docs.documents.create({
    requestBody: {
      title: title
    }
  });
  
  return response.data.documentId || '';
}

export async function appendToDocument(documentId: string, requests: any[]) {
  const docs = await getGoogleDocsClient();
  
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests
    }
  });
}

export async function createManuscriptDocument(title: string, content: string): Promise<string> {
  const docs = await getGoogleDocsClient();
  
  const createResponse = await docs.documents.create({
    requestBody: {
      title: title
    }
  });
  
  const documentId = createResponse.data.documentId;
  
  if (!documentId) {
    throw new Error('Failed to create document');
  }

  const requests = buildDocumentRequests(content);
  
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests
      }
    });
  }
  
  return documentId;
}

function buildDocumentRequests(content: string): any[] {
  const requests: any[] = [];
  const lines = content.split('\n');
  let currentIndex = 1;

  for (const line of lines) {
    if (line.trim() === '') {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: '\n'
        }
      });
      currentIndex += 1;
    } else if (line.startsWith('# ')) {
      const text = line.substring(2) + '\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text
        }
      });
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + text.length
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1'
          },
          fields: 'namedStyleType'
        }
      });
      currentIndex += text.length;
    } else if (line.startsWith('## ')) {
      const text = line.substring(3) + '\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text
        }
      });
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + text.length
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_2'
          },
          fields: 'namedStyleType'
        }
      });
      currentIndex += text.length;
    } else if (line.startsWith('### ')) {
      const text = line.substring(4) + '\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text
        }
      });
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + text.length
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_3'
          },
          fields: 'namedStyleType'
        }
      });
      currentIndex += text.length;
    } else {
      const text = line + '\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text
        }
      });
      currentIndex += text.length;
    }
  }

  return requests;
}
