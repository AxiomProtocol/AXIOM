import type { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from '../../../lib/server/gemini';

const prompts = {
  health: (data: GroupData) => `Analyze this SUSU group's health and provide actionable insights:

Group Data:
- Name: ${data.name || 'Unnamed Group'}
- Members: ${data.memberCount || 0}
- Contribution Amount: $${data.contributionAmount || 0}
- Frequency: ${data.frequency || 'monthly'}
- Current Cycle: ${data.currentCycle || 1}
- Completed Cycles: ${data.completedCycles || 0}
- On-time Payment Rate: ${data.paymentRate || 0}%
- Last Missed Payment: ${data.lastMissedPayment || 'None'}
- Member Engagement Score: ${data.engagementScore || 0}/100

Provide:
1. Overall health assessment (Good/Fair/Needs Attention)
2. Key strengths
3. Areas for improvement
4. Specific recommendations

Keep response concise and actionable.`,

  reminders: (data: GroupData) => `Generate payment reminder messages for this SUSU group:

Group: ${data.name || 'Your Group'}
Next Payment Due: ${data.nextPaymentDate || 'Soon'}
Amount: $${data.contributionAmount || 0}
Members Behind: ${data.membersBehind || 0}

Create 3 reminder messages:
1. Friendly early reminder (3 days before)
2. Day-of reminder
3. Gentle follow-up (for late payments)

Make messages warm, encouraging, and community-focused. Keep each under 100 words.`,

  guidance: (data: GroupData) => `Provide organizer guidance for this SUSU group situation:

Group Status:
- Stage: ${data.stage || 'SUSU Circle'}
- Trust Score: ${data.trustScore || 0}/100
- Member Disputes: ${data.disputes || 0}
- Graduation Progress: ${data.graduationProgress || 0}%

Current Challenges:
${data.challenges || 'General group management'}

Provide practical guidance on:
1. Building trust among members
2. Handling common conflicts
3. Encouraging consistent participation
4. Progress toward graduation

Be supportive and solution-oriented.`
};

interface GroupData {
  name?: string;
  memberCount?: number;
  contributionAmount?: number;
  frequency?: string;
  currentCycle?: number;
  completedCycles?: number;
  paymentRate?: number;
  lastMissedPayment?: string;
  engagementScore?: number;
  nextPaymentDate?: string;
  membersBehind?: number;
  stage?: string;
  trustScore?: number;
  disputes?: number;
  graduationProgress?: number;
  challenges?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, groupData = {}, question, groupContext } = req.body;

    // Handle freeform question-based requests (from organizer dashboard)
    if (question) {
      const contextInfo = groupContext ? `
Group Context:
- Name: ${groupContext.name || 'Unknown'}
- Members: ${groupContext.memberCount || 0}
- Stage: ${groupContext.stage || 'SUSU Circle'}
- Trust Score: ${groupContext.trustScore || 0}/100
` : '';

      const freeformPrompt = `You are an AI assistant helping SUSU group organizers. Answer this question helpfully and concisely:

${contextInfo}
Question: ${question}

Provide practical, actionable advice. Keep your response under 200 words.`;

      const response = await generateText(freeformPrompt, { model: 'gemini-2.5-flash' });
      
      return res.status(200).json({
        success: true,
        response: response,
        message: response
      });
    }

    // Handle structured type-based requests (from OrganizerAssistant component)
    if (!type || !['health', 'reminders', 'guidance'].includes(type)) {
      return res.status(400).json({ error: 'Invalid insight type. Provide either "type" (health/reminders/guidance) or "question".' });
    }

    const prompt = prompts[type as keyof typeof prompts](groupData as GroupData);
    const response = await generateText(prompt, { model: 'gemini-2.5-flash' });

    const actionItems = extractActionItems(response);

    return res.status(200).json({
      success: true,
      insight: {
        type,
        content: response,
        actionItems,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    console.error('Organizer Assistant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}

function extractActionItems(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[\d\-\*\•]\s*/) && trimmed.length > 10) {
      items.push(trimmed.replace(/^[\d\-\*\•\.\)]+\s*/, ''));
    }
  }
  
  return items.slice(0, 5);
}
