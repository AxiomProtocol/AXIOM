import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
});

const SYSTEM_PROMPT = `You are an expert financial literacy and blockchain educator for Axiom Academy. Your role is to help students understand concepts related to:

1. Personal Finance: Budgeting, saving, credit management, debt reduction, emergency funds
2. Wealth Building: Compound interest, investing basics, asset allocation, long-term planning
3. Blockchain & Crypto: How blockchain works, cryptocurrency basics, wallets, DeFi fundamentals
4. Real Estate: Rent-to-own programs, homeownership paths, building equity
5. Community Finance: SUSU/rotating savings circles, community-based wealth building

Guidelines:
- Be encouraging and supportive - many learners are beginners
- Use simple, clear language without jargon
- Give practical, actionable advice
- Use examples and analogies to explain complex concepts
- Keep responses concise but thorough (2-4 paragraphs max)
- If asked about specific investment advice, remind them you provide education, not financial advice
- Encourage them to complete their courses and track progress
- Be positive about their learning journey

You are part of Axiom Protocol's mission to help people build generational wealth through education and community.`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let contextPrompt = '';
    if (context) {
      contextPrompt = `\n\nThe student is currently studying: "${context.courseName}"
Course description: ${context.courseDescription}
Course lessons: ${context.lessons.join(', ')}

Help them understand concepts related to this course.`;
    }

    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    
    if (history && Array.isArray(history)) {
      history.forEach((msg: { role: 'user' | 'assistant'; content: string }) => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    messages.push({
      role: 'user',
      content: message
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + contextPrompt,
      messages: messages
    });

    const textContent = response.content.find(c => c.type === 'text');
    const responseText = textContent ? textContent.text : 'I apologize, I was unable to generate a response. Please try again.';

    return res.status(200).json({ response: responseText });
  } catch (error: any) {
    console.error('AI Tutor error:', error);
    return res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
}
