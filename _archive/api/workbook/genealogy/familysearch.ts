import type { NextApiRequest, NextApiResponse } from 'next';

const FAMILYSEARCH_CLIENT_ID = process.env.FAMILYSEARCH_CLIENT_ID;
const FAMILYSEARCH_REDIRECT_URI = process.env.FAMILYSEARCH_REDIRECT_URI;

interface FamilySearchResult {
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
  };
  sources: Array<{
    title: string;
    citation: string;
    recordType: string;
    url?: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return res.status(200).json({
      configured: !!FAMILYSEARCH_CLIENT_ID,
      message: FAMILYSEARCH_CLIENT_ID 
        ? 'FamilySearch API is configured'
        : 'FamilySearch API requires a Client ID. Apply at developers.familysearch.org',
      features: [
        'Access to 22+ billion historical records',
        'Census records from 1790-1950',
        'Vital records (birth, marriage, death)',
        'Land and property records',
        "Freedmen's Bureau records",
        'Military records',
        'Immigration records'
      ],
      signupUrl: 'https://developers.familysearch.org/',
      directSearchUrl: 'https://www.familysearch.org/search/records'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { surname, givenName, birthPlace, birthYear, deathYear, accessToken } = req.body;

    if (!FAMILYSEARCH_CLIENT_ID) {
      const searchUrl = buildFamilySearchUrl(surname, givenName, birthPlace, birthYear, deathYear);
      
      return res.status(200).json({
        results: [],
        directSearchUrl: searchUrl,
        message: 'FamilySearch API not configured. Use the direct search link below.',
        alternativeSearches: [
          {
            name: 'FamilySearch Records',
            url: searchUrl,
            description: 'Search FamilySearch historical records directly'
          },
          {
            name: 'FamilySearch Wiki',
            url: `https://www.familysearch.org/en/wiki/${encodeURIComponent(birthPlace || 'United States')}_Genealogy`,
            description: 'Research guides and resources for this location'
          },
          {
            name: 'FamilySearch Catalog',
            url: `https://www.familysearch.org/search/catalog/results?count=20&query=%2Bplace%3A%22${encodeURIComponent(birthPlace || '')}%22`,
            description: 'Browse microfilm and digital collections'
          }
        ]
      });
    }

    if (!accessToken) {
      const authUrl = `https://ident.familysearch.org/cis-web/oauth2/v3/authorization?response_type=code&client_id=${FAMILYSEARCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(FAMILYSEARCH_REDIRECT_URI || '')}&scope=openid%20profile`;
      
      return res.status(401).json({
        needsAuth: true,
        authUrl,
        message: 'Please authenticate with FamilySearch to search records'
      });
    }

    const query = buildSearchQuery(surname, givenName, birthPlace, birthYear, deathYear);
    
    const searchResponse = await fetch(
      `https://api.familysearch.org/platform/tree/search?${query}&count=20`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!searchResponse.ok) {
      if (searchResponse.status === 401) {
        return res.status(401).json({
          needsAuth: true,
          message: 'FamilySearch session expired. Please re-authenticate.'
        });
      }
      throw new Error(`FamilySearch API error: ${searchResponse.status}`);
    }

    const data = await searchResponse.json();
    const results = parseSearchResults(data);

    return res.status(200).json({
      results,
      totalCount: data.entries?.length || 0,
      source: 'FamilySearch API'
    });

  } catch (error: any) {
    console.error('FamilySearch search error:', error);
    return res.status(500).json({ 
      error: 'FamilySearch search failed',
      directSearchUrl: 'https://www.familysearch.org/search/records'
    });
  }
}

function buildFamilySearchUrl(surname?: string, givenName?: string, birthPlace?: string, birthYear?: string, deathYear?: string): string {
  const params: string[] = [];
  
  if (surname) params.push(`%2Bsurname%3A${encodeURIComponent(surname)}`);
  if (givenName) params.push(`%2BgivenName%3A${encodeURIComponent(givenName)}`);
  if (birthPlace) params.push(`%2Bany_place%3A%22${encodeURIComponent(birthPlace)}%22`);
  if (birthYear) params.push(`%2Bbirth_year%3A${birthYear}~`);
  if (deathYear) params.push(`%2Bdeath_year%3A${deathYear}~`);
  
  return `https://www.familysearch.org/search/records/results?count=20&query=${params.join('%20')}`;
}

function buildSearchQuery(surname?: string, givenName?: string, birthPlace?: string, birthYear?: string, deathYear?: string): string {
  const params = new URLSearchParams();
  
  const queryParts: string[] = [];
  if (surname) queryParts.push(`surname:${surname}`);
  if (givenName) queryParts.push(`givenName:${givenName}`);
  if (birthPlace) queryParts.push(`birthPlace:"${birthPlace}"`);
  if (birthYear) queryParts.push(`birthYear:${birthYear}~`);
  if (deathYear) queryParts.push(`deathYear:${deathYear}~`);
  
  params.set('q', queryParts.join(' '));
  return params.toString();
}

function parseSearchResults(data: any): FamilySearchResult[] {
  if (!data.entries) return [];
  
  return data.entries.map((entry: any, index: number) => {
    const person = entry.content?.gedcomx?.persons?.[0] || {};
    const sources = entry.content?.gedcomx?.sourceDescriptions || [];
    
    return {
      id: `fs-${index + 1}`,
      score: entry.score || 0,
      person: {
        id: person.id || '',
        name: person.display?.name || 'Unknown',
        gender: person.gender?.type?.replace('http://gedcomx.org/', '') || undefined,
        birthDate: person.display?.birthDate,
        birthPlace: person.display?.birthPlace,
        deathDate: person.display?.deathDate,
        deathPlace: person.display?.deathPlace
      },
      sources: sources.map((source: any) => ({
        title: source.titles?.[0]?.value || 'Unknown Source',
        citation: source.citations?.[0]?.value || '',
        recordType: source.resourceType || 'Record',
        url: source.about
      }))
    };
  });
}
