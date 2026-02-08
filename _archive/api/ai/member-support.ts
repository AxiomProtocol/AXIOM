import type { NextApiRequest, NextApiResponse } from 'next';
import { chat } from '../../../lib/server/gemini';

const SYSTEM_PROMPT = `You are the Axiom AI Assistant, a helpful guide for members of the Axiom Smart City ecosystem. Your role is to help members understand:

1. **The Wealth Practice** - A 3-stage wealth-building system:
   - Stage 1: Purpose Groups (regional interest hubs for trust-building)
   - Stage 2: SUSU Circles (rotating savings groups with Personal Vault or Community Pool options)
   - Stage 3: The Wealth Practice (graduated groups access larger investment opportunities)

2. **SUSU Circles** - Traditional rotating savings and credit associations:
   - Community Pool: Pooled custody, pay-as-you-go, 2-50 members
   - Personal Vault: Self-custody, upfront commitment, 2-20 members, segregated funds

3. **Capital Mode** - When groups exceed thresholds ($1,000+ contributions or $10,000+ pot), they unlock:
   - Real estate investment pools
   - DePIN infrastructure investments
   - Enhanced governance voting power

4. **AXM Token** - The governance and utility token for the Axiom ecosystem

5. **KeyGrow** - Rent-to-own real estate program with tokenized property shares

Key guidelines:
- Be helpful, friendly, and concise
- Never give specific financial advice
- Always mention this is for educational purposes
- If unsure, suggest contacting support
- Encourage community participation and trust-building`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const chatHistory = history
      .filter((m: { role: string; content: string }) => m.role && m.content)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        content: m.content
      }));

    chatHistory.push({ role: 'user' as const, content: message });

    const response = await chat(chatHistory, {
      model: 'gemini-2.5-flash',
      systemPrompt: SYSTEM_PROMPT
    });

    return res.status(200).json({
      success: true,
      response
    });
  } catch (error: unknown) {
    console.error('AI Member Support error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
