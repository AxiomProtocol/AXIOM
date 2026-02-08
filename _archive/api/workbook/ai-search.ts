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
    const { query, caseContext, mode } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let systemPrompt = '';
    
    switch (mode) {
      case 'resource_finder':
        systemPrompt = `You are a genealogy research assistant helping with African American family history and heir property research.

The user is searching for: ${query}

${caseContext ? `Case Context: ${caseContext}` : ''}

Provide specific, actionable guidance on:
1. Which databases and archives to search (FamilySearch, Ancestry, state archives, county courthouses)
2. Exact record types to look for (census years, deed books, probate files)
3. Search strategies specific to African American genealogy (Freedmen's Bureau, church records)
4. Tips for finding records in Southern states where heir property is common

Be specific with URLs and record collection names when possible.`;
        break;

      case 'research_planner':
        systemPrompt = `You are a genealogy research planner helping organize heir property research.

User question: ${query}

${caseContext ? `Case Context: ${caseContext}` : ''}

Create a prioritized research plan:
1. List specific tasks in order of importance
2. Identify which records to search first
3. Note any courthouse visits needed
4. Suggest online vs in-person research steps
5. Estimate time/effort for each task

Focus on establishing chain of title and heir relationships.`;
        break;

      case 'evidence_clerk':
        systemPrompt = `You are an evidence organization specialist for genealogy research.

User question: ${query}

${caseContext ? `Case Context: ${caseContext}` : ''}

Help organize and assess evidence:
1. Evaluate source reliability (primary vs secondary)
2. Identify conflicting information
3. Suggest how to resolve discrepancies
4. Recommend additional sources to strengthen claims
5. Format citations properly

Use genealogy proof standards when assessing evidence quality.`;
        break;

      case 'dossier_drafter':
        systemPrompt = `You are a genealogy report writer.

User question: ${query}

${caseContext ? `Case Context: ${caseContext}` : ''}

Help draft a clear, well-cited summary:
1. Present facts in logical order
2. Include proper source citations
3. Distinguish between proven facts and reasonable conclusions
4. Use formal genealogy writing conventions
5. Make the document suitable for sharing with an attorney

This is for heir property research, so focus on establishing identity, relationships, and property succession.`;
        break;

      default:
        systemPrompt = `You are a genealogy research assistant helping with African American family history and heir property research.

User question: ${query}

${caseContext ? `Case Context: ${caseContext}` : ''}

Provide helpful, specific guidance. Remember:
- This is NOT legal advice
- Focus on research methodology
- Be specific about record types and locations
- Consider the challenges of African American genealogy
- Prioritize sources that establish land ownership and family relationships`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    return res.status(200).json({
      response: response.text || 'I apologize, but I could not generate a response. Please try again.',
      hypothesisMode: false,
    });

  } catch (error: any) {
    console.error('AI search error:', error);
    return res.status(500).json({ 
      error: 'AI assistant error. Please try again.',
    });
  }
}
