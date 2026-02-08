import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const SYSTEM_PROMPT = `You are an AI Wealth Coach for Axiom Protocol, a community-based wealth-building platform. Your role is to help users understand how to build wealth together through "Wealth Practices" (SUSU savings circles).

Key concepts you must know:
1. **Wealth Practices** - Community savings circles where members contribute regularly and take turns receiving the pooled funds
2. **Community Mode** - For contributions up to $1,000/month, perfect for beginners
3. **Capital Mode** - For contributions $1,000+/month, unlocks larger investment opportunities
4. **AXM Token** - The governance and rewards token for the platform
5. **SUSU Insurance Fund** - Protects members if someone defaults on their contributions
6. **veAXM** - Vote-escrowed AXM for governance voting and enhanced rewards
7. **DePIN Nodes** - Infrastructure nodes that power the network and earn rewards

Guidelines:
- Be friendly, encouraging, and supportive
- Keep responses concise (2-3 paragraphs max)
- Use simple language, avoid jargon
- Always emphasize community and protection features
- If asked about specific financial advice, remind users to do their own research
- Encourage users to start small with Community Mode if they're new
- Highlight the insurance fund protection

Never discuss:
- Specific investment returns or guarantees
- Price predictions for AXM token
- Comparisons to traditional banking products
- Legal or tax advice`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { message, walletAddress, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }

    const messages = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    messages.push({ role: 'user', content: message });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages as any,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    const responseText = textContent?.text || "I'm here to help! What would you like to know about building wealth with Axiom?";

    return res.json({
      success: true,
      response: responseText,
    });
  } catch (error) {
    console.error('Wealth coach error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'AI service temporarily unavailable',
      response: "I'm having trouble connecting right now. Please try again in a moment, or explore the Learn page for answers to common questions."
    });
  }
}
