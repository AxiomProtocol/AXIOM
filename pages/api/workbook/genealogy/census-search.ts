import type { NextApiRequest, NextApiResponse } from 'next';

const CENSUS_API_KEY = process.env.CENSUS_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { state, county, year } = req.body;

    if (!CENSUS_API_KEY) {
      return res.status(200).json({
        results: [],
        message: 'Census API key not configured. Please add CENSUS_API_KEY to enable real census searches.',
        alternativeLinks: [
          {
            name: 'FamilySearch Census Records',
            url: `https://www.familysearch.org/search/records/results?count=20&query=%2Bresidence_place%3A%22${encodeURIComponent(state || '')}%22`,
            description: 'Search FamilySearch for census records'
          },
          {
            name: 'Ancestry Census',
            url: 'https://www.ancestry.com/search/categories/us_census/',
            description: 'Search Ancestry.com census collections'
          },
          {
            name: 'NARA Census Records',
            url: 'https://www.archives.gov/research/census',
            description: 'National Archives census research guide'
          }
        ]
      });
    }

    const censusYear = year || '2020';
    const stateCode = state || '01';
    
    const apiUrl = `https://api.census.gov/data/${censusYear}/dec/pl?get=NAME,P1_001N&for=county:*&in=state:${stateCode}&key=${CENSUS_API_KEY}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    return res.status(200).json({
      results: data,
      source: 'US Census Bureau API',
      year: censusYear
    });

  } catch (error: any) {
    console.error('Census search error:', error);
    return res.status(500).json({ error: 'Census search failed' });
  }
}
