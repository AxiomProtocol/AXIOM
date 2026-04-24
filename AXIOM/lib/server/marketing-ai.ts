import Anthropic from '@anthropic-ai/sdk';
import { generateText, generateImage } from './gemini';
import { generateTextOpenAI, generateImageOpenAI } from './openai';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export interface MarketingContent {
  title: string;
  subtitle: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  headerImage?: string;
}

const AXIOM_CONTEXT = `
Axiom Protocol is a DeFi treasury system for community-driven wealth building on Arbitrum One blockchain.

Key Features:
- The Wealth Practice: Community Wealth Practice circles where members save together
- Wealth Engine: Stake AXM tokens for variable protocol rewards  
- veAXM Governance: Lock tokens to vote on protocol decisions
- DePIN Nodes: Infrastructure nodes that earn rewards
- On-chain Credit Scoring: Build credit through on-chain activity

Brand Voice: Empowering, community-focused, accessible, trustworthy
Target Audience: People interested in DeFi, community savings, financial empowerment
Key Message: Build wealth together through discipline, structure, and community

Important Compliance Notes:
- Self-custody/non-custodial (users control their funds)
- Not a bank, no FDIC insurance
- Variable rewards, not guaranteed returns
- 29 verified smart contracts on Arbitrum One

Website: axiom-nexus.replit.app
`;

export async function generateFlyerContent(): Promise<MarketingContent> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert marketing copywriter. Create compelling content for a welcome flyer for Axiom Protocol.

${AXIOM_CONTEXT}

Generate a JSON object with this structure:
{
  "title": "Main headline (5-8 words, powerful and engaging)",
  "subtitle": "Supporting tagline (10-15 words)",
  "sections": [
    {"heading": "Section title", "content": "Compelling paragraph or bullet points"},
    // Include 4 sections: What is Axiom, Key Benefits, How It Works, Get Started
  ]
}

Make it:
- Inspiring and action-oriented
- Easy to understand for newcomers
- Highlight community and empowerment
- Include a clear call to action
- Professional but warm tone

Return ONLY valid JSON, no markdown or explanations.`
    }]
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }
  throw new Error('Unexpected response format');
}

export async function generateSocialMediaContent(): Promise<MarketingContent> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a viral social media copywriter specializing in Web3/DeFi content. Create a social media kit for Axiom Protocol.

${AXIOM_CONTEXT}

Generate a JSON object with this structure:
{
  "title": "Social Media Kit",
  "subtitle": "Ready-to-post content for maximum engagement",
  "sections": [
    {"heading": "Post title", "content": "Full post text with emojis and hashtags"},
    // Include 6 posts: Introduction, Wealth Practice Feature, Wealth Engine, Community Focus, FOMO/Urgency, Educational
  ]
}

Each post should:
- Be optimized for TikTok/Twitter/Instagram
- Use relevant emojis strategically
- Include 5-8 hashtags per post
- Have a hook in the first line
- Include a call to action
- Be under 280 characters for Twitter compatibility
- Feel authentic and engaging, not salesy

Return ONLY valid JSON, no markdown or explanations.`
    }]
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }
  throw new Error('Unexpected response format');
}

export async function generateEmailContent(): Promise<MarketingContent> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert email marketer. Create email templates for inviting friends to join Axiom Protocol.

${AXIOM_CONTEXT}

Generate a JSON object with this structure:
{
  "title": "Email Invitation Templates",
  "subtitle": "Copy-paste emails to grow your community",
  "sections": [
    {"heading": "Subject Lines (5 options)", "content": "List of compelling subject lines"},
    {"heading": "Casual Friend Email", "content": "Informal email to a close friend"},
    {"heading": "Professional Network Email", "content": "More formal email for professional contacts"},
    {"heading": "Follow-up Email", "content": "Email for people who showed initial interest"},
    {"heading": "Email Signature", "content": "Professional signature block with Axiom branding"}
  ]
}

Emails should:
- Feel personal and authentic
- Explain the value clearly
- Include the website link
- Have clear CTAs
- Not be pushy or overly promotional
- Include appropriate compliance disclaimers

Return ONLY valid JSON, no markdown or explanations.`
    }]
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }
  throw new Error('Unexpected response format');
}

export async function generateBrandGuideContent(): Promise<MarketingContent> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a brand strategist. Create a brand guidelines document for Axiom Protocol marketing materials.

${AXIOM_CONTEXT}

Generate a JSON object with this structure:
{
  "title": "Axiom Brand Guidelines",
  "subtitle": "Creating consistent, professional marketing materials",
  "sections": [
    {"heading": "Brand Colors", "content": "Primary: #EAB308 (Gold), Secondary: #111827 (Dark), Accent: #3B82F6 (Blue), Success: #22C55E (Green)"},
    {"heading": "Typography Guidelines", "content": "Font recommendations and usage"},
    {"heading": "Voice & Tone", "content": "How to write for Axiom"},
    {"heading": "Do's and Don'ts", "content": "Clear guidelines on messaging"},
    {"heading": "Visual Guidelines", "content": "Image style, logo usage, spacing"},
    {"heading": "Compliance Checklist", "content": "Required disclaimers and what to avoid"}
  ]
}

Make guidelines:
- Clear and actionable
- Professional yet accessible
- Include specific examples
- Cover both written and visual content

Return ONLY valid JSON, no markdown or explanations.`
    }]
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }
  throw new Error('Unexpected response format');
}

export async function generateSocialMediaContentGemini(): Promise<MarketingContent> {
  const prompt = `You are a viral social media copywriter specializing in Web3/DeFi content. Create a social media kit for Axiom Protocol.

${AXIOM_CONTEXT}

Generate a JSON object with this structure:
{
  "title": "Social Media Kit",
  "subtitle": "Ready-to-post content for maximum engagement",
  "sections": [
    {"heading": "Post title", "content": "Full post text with emojis and hashtags"},
    // Include 6 posts: Introduction, Wealth Practice Feature, Wealth Engine, Community Focus, FOMO/Urgency, Educational
  ]
}

Each post should:
- Be optimized for TikTok/Twitter/Instagram
- Use relevant emojis strategically
- Include 5-8 hashtags per post
- Have a hook in the first line
- Include a call to action
- Be under 280 characters for Twitter compatibility
- Feel authentic and engaging, not salesy

Return ONLY valid JSON, no markdown or explanations.`;

  const response = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are an expert social media marketer for Web3 projects. Always return valid JSON only.'
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse Gemini response');
}

export async function generateEmailContentGemini(): Promise<MarketingContent> {
  const prompt = `You are an expert email marketer. Create email templates for inviting friends to join Axiom Protocol.

${AXIOM_CONTEXT}

Generate a JSON object with this structure:
{
  "title": "Email Invitation Templates",
  "subtitle": "Copy-paste emails to grow your community",
  "sections": [
    {"heading": "Subject Lines (5 options)", "content": "List of compelling subject lines"},
    {"heading": "Casual Friend Email", "content": "Informal email to a close friend"},
    {"heading": "Professional Network Email", "content": "More formal email for professional contacts"},
    {"heading": "Follow-up Email", "content": "Email for people who showed initial interest"},
    {"heading": "Email Signature", "content": "Professional signature block with Axiom branding"}
  ]
}

Emails should:
- Feel personal and authentic
- Explain the value clearly
- Include the website link
- Have clear CTAs
- Not be pushy or overly promotional
- Include appropriate compliance disclaimers

Return ONLY valid JSON, no markdown or explanations.`;

  const response = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are an expert email copywriter. Always return valid JSON only.'
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse Gemini response');
}

export async function generateMarketingImage(type: 'flyer' | 'social' | 'banner'): Promise<string | null> {
  const prompts: Record<string, string> = {
    flyer: 'A professional minimalist flyer header image for Axiom Protocol, featuring abstract golden geometric shapes on a dark background, representing community wealth building and blockchain technology. Modern, clean, professional. Gold (#EAB308) and black (#111827) color scheme.',
    social: 'A vibrant social media graphic for Axiom Protocol DeFi platform. Abstract golden coins and connecting lines representing community and blockchain. Modern, eye-catching, suitable for TikTok/Instagram. Gold and dark theme.',
    banner: 'An elegant web banner for Axiom Protocol brand guidelines. Minimalist design with golden accent lines on dark background. Professional, corporate, clean. Suitable for document header.'
  };

  try {
    const imageData = await generateImageOpenAI(prompts[type]);
    if (imageData) return imageData;
  } catch (error) {
    console.log('OpenAI image generation failed, trying Gemini:', error);
  }

  try {
    const imageData = await generateImage(prompts[type]);
    return imageData;
  } catch (error) {
    console.log('Gemini image generation also failed:', error);
    return null;
  }
}

export async function generateFlyerContentOpenAI(): Promise<MarketingContent> {
  const prompt = `You are an expert marketing copywriter. Create compelling content for a welcome flyer for Axiom Protocol.

${AXIOM_CONTEXT}

Generate a JSON object with this structure:
{
  "title": "Main headline (5-8 words, powerful and engaging)",
  "subtitle": "Supporting tagline (10-15 words)",
  "sections": [
    {"heading": "Section title", "content": "Compelling paragraph or bullet points"},
    // Include 4 sections: What is Axiom, Key Benefits, How It Works, Get Started
  ]
}

Make it:
- Inspiring and action-oriented
- Easy to understand for newcomers
- Highlight community and empowerment
- Include a clear call to action
- Professional but warm tone

Return ONLY valid JSON, no markdown or explanations.`;

  const response = await generateTextOpenAI(prompt, {
    model: 'gpt-4o',
    systemPrompt: 'You are an expert marketing copywriter. Always return valid JSON only.',
    maxTokens: 2000
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse OpenAI response');
}

export async function generateBrandGuideContentOpenAI(): Promise<MarketingContent> {
  const prompt = `You are a brand strategist. Create a brand guidelines document for Axiom Protocol marketing materials.

${AXIOM_CONTEXT}

Generate a JSON object with this structure:
{
  "title": "Axiom Brand Guidelines",
  "subtitle": "Creating consistent, professional marketing materials",
  "sections": [
    {"heading": "Brand Colors", "content": "Primary: #EAB308 (Gold), Secondary: #111827 (Dark), Accent: #3B82F6 (Blue), Success: #22C55E (Green)"},
    {"heading": "Typography Guidelines", "content": "Font recommendations and usage"},
    {"heading": "Voice & Tone", "content": "How to write for Axiom"},
    {"heading": "Do's and Don'ts", "content": "Clear guidelines on messaging"},
    {"heading": "Visual Guidelines", "content": "Image style, logo usage, spacing"},
    {"heading": "Compliance Checklist", "content": "Required disclaimers and what to avoid"}
  ]
}

Make guidelines:
- Clear and actionable
- Professional yet accessible
- Include specific examples
- Cover both written and visual content

Return ONLY valid JSON, no markdown or explanations.`;

  const response = await generateTextOpenAI(prompt, {
    model: 'gpt-4o',
    systemPrompt: 'You are a brand strategist. Always return valid JSON only.',
    maxTokens: 2000
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse OpenAI response');
}
