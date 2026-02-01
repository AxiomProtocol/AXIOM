import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
});

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function getRateLimitKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket?.remoteAddress || 'unknown';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }
  
  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetIn: record.resetTime - now };
}

const globalForCleanup = globalThis as typeof globalThis & { rateLimitCleanupStarted?: boolean };
if (!globalForCleanup.rateLimitCleanupStarted) {
  globalForCleanup.rateLimitCleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

const SYSTEM_PROMPT = `You are an expert financial literacy and blockchain educator for Axiom Academy. Your role is to help students understand concepts related to:

1. Personal Finance: Budgeting, saving, credit management, debt reduction, emergency funds
2. Wealth Building: Compound interest, investing basics, asset allocation, long-term planning
3. Blockchain & Crypto: How blockchain works, cryptocurrency basics, wallets, DeFi fundamentals
4. Real Estate: Rent-to-own programs, homeownership paths, building equity
5. Community Finance: Rotating savings circles (SUSU), community-based wealth building

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

  const rateLimitKey = getRateLimitKey(req);
  const rateLimit = checkRateLimit(rateLimitKey);
  
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000).toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: 'Too many requests. Please wait a moment before asking another question.',
      retryAfter: Math.ceil(rateLimit.resetIn / 1000)
    });
  }

  try {
    const { message, context, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long. Please keep questions under 1000 characters.' });
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
      const recentHistory = history.slice(-6);
      recentHistory.forEach((msg: { role: 'user' | 'assistant'; content: string }) => {
        messages.push({
          role: msg.role,
          content: msg.content.slice(0, 1000)
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
