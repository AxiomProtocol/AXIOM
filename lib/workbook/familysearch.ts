import { pool } from '../../server/db';

const FAMILYSEARCH_API_BASE = 'https://api.familysearch.org';
const FAMILYSEARCH_IDENT_BASE = 'https://ident.familysearch.org';

interface FamilySearchConfig {
  clientId: string;
  redirectUri: string;
}

interface SearchResult {
  id: string;
  score: number;
  person: {
    id: string;
    name: string;
    gender?: string;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    father?: string;
    mother?: string;
    spouse?: string;
  };
  sources: Array<{
    title: string;
    citation: string;
    recordType: string;
  }>;
}

interface SearchParams {
  givenName?: string;
  surname?: string;
  birthPlace?: string;
  birthDateFrom?: number;
  birthDateTo?: number;
  deathPlace?: string;
  deathDateFrom?: number;
  deathDateTo?: number;
  residence?: string;
  count?: number;
}

function getConfig(): FamilySearchConfig {
  const clientId = process.env.FAMILYSEARCH_CLIENT_ID;
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';
  
  return {
    clientId: clientId || '',
    redirectUri: `${baseUrl}/api/workbook/familysearch/callback`,
  };
}

export function getAuthorizationUrl(state: string): string {
  const config = getConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
  });
  return `${FAMILYSEARCH_IDENT_BASE}/cis-web/oauth2/v3/authorization?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; expiresIn: number }> {
  const config = getConfig();
  
  const response = await fetch(`${FAMILYSEARCH_IDENT_BASE}/cis-web/oauth2/v3/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FamilySearch auth failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

export async function saveOAuthState(userId: number, stateToken: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
  await pool.query(`
    DELETE FROM oauth_states WHERE user_id = $1 OR expires_at < NOW()
  `, [userId]);
  
  await pool.query(`
    INSERT INTO oauth_states (user_id, state_token, expires_at)
    VALUES ($1, $2, $3)
  `, [userId, stateToken, expiresAt]);
}

export async function validateAndConsumeOAuthState(stateToken: string): Promise<number | null> {
  const result = await pool.query(`
    DELETE FROM oauth_states 
    WHERE state_token = $1 AND expires_at > NOW()
    RETURNING user_id
  `, [stateToken]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0].user_id;
}

export async function saveFamilySearchToken(userId: number, accessToken: string, expiresIn: number): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  
  await pool.query(`
    INSERT INTO familysearch_tokens (user_id, access_token, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) 
    DO UPDATE SET access_token = $2, expires_at = $3, updated_at = NOW()
  `, [userId, accessToken, expiresAt]);
}

export async function getFamilySearchToken(userId: number): Promise<string | null> {
  const result = await pool.query(`
    SELECT access_token, expires_at 
    FROM familysearch_tokens 
    WHERE user_id = $1 AND expires_at > NOW()
  `, [userId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0].access_token;
}

export async function searchHistoricalRecords(accessToken: string, params: SearchParams): Promise<SearchResult[]> {
  const queryParts: string[] = [];
  
  if (params.givenName) queryParts.push(`givenName:${params.givenName}~`);
  if (params.surname) queryParts.push(`surname:${params.surname}~`);
  if (params.birthPlace) queryParts.push(`birthLikePlace:"${params.birthPlace}"`);
  if (params.birthDateFrom || params.birthDateTo) {
    const from = params.birthDateFrom || 1700;
    const to = params.birthDateTo || 2000;
    queryParts.push(`birthLikeDate:${from}-${to}`);
  }
  if (params.deathPlace) queryParts.push(`deathLikePlace:"${params.deathPlace}"`);
  if (params.residence) queryParts.push(`residencePlace:"${params.residence}"`);
  
  const query = queryParts.join('+');
  const count = params.count || 20;
  
  const response = await fetch(
    `${FAMILYSEARCH_API_BASE}/platform/tree/search?q=${encodeURIComponent(query)}&count=${count}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/x-gedcomx-v1+json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('FamilySearch session expired. Please reconnect.');
    }
    throw new Error(`FamilySearch search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return parseSearchResults(data);
}

export async function searchRecordCollections(accessToken: string, params: SearchParams): Promise<SearchResult[]> {
  const queryParts: string[] = [];
  
  if (params.givenName) queryParts.push(`givenName:${params.givenName}~`);
  if (params.surname) queryParts.push(`surname:${params.surname}~`);
  if (params.birthPlace) queryParts.push(`anyPlace:"${params.birthPlace}"`);
  if (params.birthDateFrom || params.birthDateTo) {
    const from = params.birthDateFrom || 1700;
    const to = params.birthDateTo || 2000;
    queryParts.push(`anyDate:${from}-${to}`);
  }
  
  const query = queryParts.join('+');
  const count = params.count || 20;
  
  const response = await fetch(
    `${FAMILYSEARCH_API_BASE}/platform/records/search?q=${encodeURIComponent(query)}&count=${count}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/x-gedcomx-v1+json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('FamilySearch session expired. Please reconnect.');
    }
    if (response.status === 429) {
      throw new Error('FamilySearch rate limit reached. Please try again in a few minutes.');
    }
    const errorText = await response.text();
    console.error('FamilySearch records search error:', errorText);
    throw new Error(`FamilySearch search error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  return parseRecordResults(data);
}

function parseSearchResults(data: any): SearchResult[] {
  const results: SearchResult[] = [];
  
  const entries = data.entries || [];
  for (const entry of entries) {
    const content = entry.content?.gedcomx;
    if (!content?.persons?.[0]) continue;
    
    const person = content.persons[0];
    const nameForms = person.names?.[0]?.nameForms?.[0];
    const birthFact = person.facts?.find((f: any) => f.type?.includes('Birth'));
    const deathFact = person.facts?.find((f: any) => f.type?.includes('Death'));
    
    results.push({
      id: entry.id || person.id,
      score: entry.score || 0,
      person: {
        id: person.id,
        name: nameForms?.fullText || 'Unknown',
        gender: person.gender?.type?.split('/').pop(),
        birthDate: birthFact?.date?.original,
        birthPlace: birthFact?.place?.original,
        deathDate: deathFact?.date?.original,
        deathPlace: deathFact?.place?.original,
      },
      sources: [],
    });
  }
  
  return results;
}

function parseRecordResults(data: any): SearchResult[] {
  const results: SearchResult[] = [];
  
  const entries = data.entries || [];
  for (const entry of entries) {
    const content = entry.content?.gedcomx;
    if (!content?.persons?.[0]) continue;
    
    const person = content.persons[0];
    const nameForms = person.names?.[0]?.nameForms?.[0];
    const birthFact = person.facts?.find((f: any) => f.type?.includes('Birth'));
    const deathFact = person.facts?.find((f: any) => f.type?.includes('Death'));
    
    const sources = (content.sourceDescriptions || []).map((sd: any) => ({
      title: sd.titles?.[0]?.value || 'Untitled',
      citation: sd.citations?.[0]?.value || '',
      recordType: sd.resourceType || 'Unknown',
    }));
    
    results.push({
      id: entry.id || person.id,
      score: entry.score || 0,
      person: {
        id: person.id,
        name: nameForms?.fullText || 'Unknown',
        gender: person.gender?.type?.split('/').pop(),
        birthDate: birthFact?.date?.original,
        birthPlace: birthFact?.place?.original,
        deathDate: deathFact?.date?.original,
        deathPlace: deathFact?.place?.original,
      },
      sources,
    });
  }
  
  return results;
}

export async function getPersonDetails(accessToken: string, personId: string): Promise<any> {
  const response = await fetch(
    `${FAMILYSEARCH_API_BASE}/platform/tree/persons/${personId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/x-gedcomx-v1+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get person details: ${response.statusText}`);
  }

  return response.json();
}

export function isConfigured(): boolean {
  return !!process.env.FAMILYSEARCH_CLIENT_ID;
}
