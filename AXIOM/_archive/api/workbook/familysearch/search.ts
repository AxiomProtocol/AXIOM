import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { givenName, surname, birthPlace, birthDateFrom, birthDateTo, deathPlace, searchType } = req.body;

    if (!givenName && !surname) {
      return res.status(400).json({ error: 'Please provide at least a first or last name' });
    }

    const searchContext = `
Person Search:
- Given Name: ${givenName || 'Unknown'}
- Surname: ${surname || 'Unknown'}
- Birth Place: ${birthPlace || 'Unknown'}
- Birth Year Range: ${birthDateFrom || '?'} - ${birthDateTo || '?'}
- Death Place: ${deathPlace || 'Unknown'}
- Search Type: ${searchType || 'records'}
`;

    const prompt = `You are a genealogy research assistant specializing in African American family history and heir property research.

Based on this search query:
${searchContext}

Generate 5-8 realistic search results that would help trace this person's land ownership and family history. For each result, provide:
1. A unique ID (format: fs-XXXXX)
2. Full name with any variants
3. Gender
4. Birth date and place (if found)
5. Death date and place (if found)
6. Relevant sources found (census records, land deeds, probate records, etc.)

Focus on records that would help establish:
- Property ownership (deeds, tax records)
- Family relationships (census, vital records)
- Succession/inheritance (wills, probate)

Return as JSON array with this structure:
{
  "results": [
    {
      "id": "fs-12345",
      "score": 0.95,
      "person": {
        "id": "person-12345",
        "name": "Full Name",
        "gender": "Male/Female",
        "birthDate": "Abt 1870",
        "birthPlace": "County, State",
        "deathDate": "1940",
        "deathPlace": "County, State"
      },
      "sources": [
        {
          "title": "1920 U.S. Census",
          "citation": "Year: 1920; Census Place: Township, County, State",
          "recordType": "Census"
        }
      ]
    }
  ]
}

Make the results historically plausible for African American families in the South. Include varied record types: census, deeds, tax records, freedmen's records, church records, etc.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*"results"[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ results: [], message: 'No matching records found' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (error: any) {
    console.error('Genealogy search error:', error);
    return res.status(500).json({ 
      error: 'Search failed. Please try again.',
      results: [] 
    });
  }
}
