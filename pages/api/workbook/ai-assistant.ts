import { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || '',
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const SYSTEM_PROMPT = `You are an expert genealogy research assistant specializing in heir property, African American land ownership history, and Native American tribal records. You help families research their ancestral land claims and trace property ownership through generations.

Your expertise includes:
- Freedmen's Bureau records and post-Civil War documentation
- Census records (1870-1950) and property ownership indicators
- Deed research, probate records, and title chains
- Dawes Roll and Five Civilized Tribes enrollment records
- BLM/GLO land patents and Indian allotments
- State-specific intestate succession and heirship laws
- Per stirpes inheritance calculations
- Tax sale prevention and partition sale risks

When helping users:
1. Ask clarifying questions to understand their research goals
2. Suggest specific record types and repositories to search
3. Explain historical context that affects record availability
4. Provide step-by-step research strategies
5. Warn about common pitfalls and gaps in records
6. Recommend next steps based on what they've found

Always be encouraging and acknowledge the emotional significance of this research for families reclaiming their heritage and wealth.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory = [], caseContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let contextPrompt = SYSTEM_PROMPT;
    
    if (caseContext) {
      contextPrompt += `\n\nCurrent Research Case Context:
- Case: ${caseContext.caseTitle || 'Untitled'}
- Primary Ancestor: ${caseContext.ancestorName || 'Unknown'}
- Jurisdiction: ${caseContext.jurisdiction || 'Not specified'}
- Family Members Added: ${caseContext.personsCount || 0}
- Records Saved: ${caseContext.recordsCount || 0}
- Research Notes: ${caseContext.notesCount || 0}`;
    }

    const messages: Anthropic.MessageParam[] = [
      { role: 'assistant', content: 'I understand. I\'m ready to help with heir property and genealogy research. How can I assist you today?' },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.content
      } as Anthropic.MessageParam)),
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      system: contextPrompt,
      messages,
      max_tokens: 1024,
    });

    const assistantMessage = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : 'I apologize, but I was unable to generate a response. Please try again.';

    return res.status(200).json({
      message: assistantMessage,
      success: true
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
}
