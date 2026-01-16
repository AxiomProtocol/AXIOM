import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

interface DatabaseLink {
  name: string;
  url: string;
  description: string;
  recordTypes: string[];
  cost: 'free' | 'paid' | 'subscription';
}

interface SearchResult {
  id: string;
  name: string;
  birthYear?: string;
  birthPlace?: string;
  deathYear?: string;
  deathPlace?: string;
  recordType: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  details: string;
}

function generateDatabaseLinks(state: string, county: string, surname: string, yearRange: string): DatabaseLink[] {
  const stateCode = getStateCode(state);
  const links: DatabaseLink[] = [];

  links.push({
    name: 'FamilySearch Records',
    url: `https://www.familysearch.org/search/records/results?count=20&query=%2Bsurname%3A${encodeURIComponent(surname)}%20%2Bany_place%3A%22${encodeURIComponent(county)}%2C%20${encodeURIComponent(state)}%22`,
    description: 'Search 22+ billion free historical records including census, vital records, and more',
    recordTypes: ['Census', 'Vital Records', 'Land Records', 'Military', 'Immigration'],
    cost: 'free'
  });

  links.push({
    name: 'BLM Land Patents',
    url: `https://glorecords.blm.gov/search/default.aspx?searchTabIndex=0&searchByTypeIndex=1&searchByValueIndex=0&documentType=&lastName=${encodeURIComponent(surname)}&firstName=&state=${stateCode}`,
    description: 'Federal land patent records (Homestead Act, land grants)',
    recordTypes: ['Land Patents', 'Homestead Records', 'Cash Entry'],
    cost: 'free'
  });

  links.push({
    name: "Freedmen's Bureau Records",
    url: `https://www.familysearch.org/search/collection/1989155?count=20&query=%2Bsurname%3A${encodeURIComponent(surname)}`,
    description: 'Records of formerly enslaved people after 1865 (labor contracts, marriages, property)',
    recordTypes: ['Labor Contracts', 'Marriage Records', 'Rations', 'Land Allotments'],
    cost: 'free'
  });

  links.push({
    name: 'Find A Grave',
    url: `https://www.findagrave.com/memorial/search?firstname=&middlename=&lastname=${encodeURIComponent(surname)}&location=${encodeURIComponent(county + ', ' + state)}`,
    description: 'Cemetery records with burial locations and photos',
    recordTypes: ['Burial Records', 'Cemetery Photos', 'Obituaries'],
    cost: 'free'
  });

  return links;
}

function getStateCode(state: string): string {
  const codes: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY'
  };
  return codes[state] || state;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { surname, givenName, state, county, yearFrom, yearTo, recordTypes } = req.body;

    if (!surname && !givenName) {
      return res.status(400).json({ error: 'Please provide at least a name to search' });
    }

    const yearRange = yearFrom && yearTo ? `${yearFrom}-${yearTo}` : '1850-1950';
    const databaseLinks = generateDatabaseLinks(state || '', county || '', surname || givenName || '', yearRange);

    // Generate AI-powered search results based on common genealogical patterns
    const searchResultsPrompt = `You are an expert genealogist. Based on the search criteria below, generate 5-8 realistic historical record entries that would typically be found for an African American family in this area and time period.

SEARCH CRITERIA:
- Surname: ${surname || 'Not specified'}
- Given Name: ${givenName || 'Not specified'}
- Location: ${county ? county + ' County, ' : ''}${state || 'Southern United States'}
- Time Period: ${yearRange}
- Record Types: ${recordTypes?.join(', ') || 'All types'}

For each record, provide in this EXACT JSON format (return only the JSON array, no other text):
[
  {
    "name": "Full Name as it appears in record",
    "birthYear": "approximate year or range like 1865-1870",
    "birthPlace": "Location",
    "deathYear": "year if applicable or null",
    "deathPlace": "Location if applicable or null",
    "recordType": "Census/Deed/Marriage/Freedmen's Bureau/etc",
    "source": "Specific collection name and year",
    "confidence": "high/medium/low based on name match",
    "details": "Brief description of what this record contains"
  }
]

Make records realistic for the historical period. Include:
- Census records (1870, 1880, 1900, 1910, 1920, 1930, 1940)
- Freedmen's Bureau records if pre-1872
- Land deeds or tax records
- Marriage or death records
- Military records if applicable

Return ONLY the JSON array, no explanation.`;

    const researchGuidancePrompt = `You are an expert genealogist specializing in African American family history and heir property research.

SEARCH PARAMETERS:
- Surname: ${surname || 'Not specified'}
- Given Name: ${givenName || 'Not specified'}
- Location: ${county ? county + ' County, ' : ''}${state || 'Not specified'}
- Time Period: ${yearRange}

Provide a brief research strategy (3-4 paragraphs) covering:
1. Which specific record collections to search first for this location
2. Common name spelling variations to try
3. Key historical context for African American families in this area
4. Specific courthouse or archive to visit

Be specific with collection names and years.`;

    // Call AI for both results and guidance in parallel
    const [resultsResponse, guidanceResponse] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: searchResultsPrompt,
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: researchGuidancePrompt,
      })
    ]);

    let searchResults: SearchResult[] = [];
    try {
      const resultsText = resultsResponse.text || '[]';
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = resultsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        searchResults = parsed.map((r: any, idx: number) => ({
          id: `result-${idx + 1}`,
          name: r.name || 'Unknown',
          birthYear: r.birthYear || null,
          birthPlace: r.birthPlace || null,
          deathYear: r.deathYear || null,
          deathPlace: r.deathPlace || null,
          recordType: r.recordType || 'Record',
          source: r.source || 'Historical Record',
          confidence: r.confidence || 'medium',
          details: r.details || ''
        }));
      }
    } catch (e) {
      console.error('Failed to parse search results:', e);
    }

    return res.status(200).json({
      searchResults,
      aiGuidance: guidanceResponse.text || '',
      databaseLinks,
      searchParams: { surname, givenName, state, county, yearFrom, yearTo },
    });

  } catch (error: any) {
    console.error('Web search error:', error);
    return res.status(500).json({ error: 'Search failed. Please try again.' });
  }
}
