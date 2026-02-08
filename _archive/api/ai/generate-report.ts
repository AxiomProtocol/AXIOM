import type { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from '../../../lib/server/gemini';

interface ReportData {
  type?: string;
  groupName?: string;
  memberCount?: number;
  totalContributed?: number;
  completedCycles?: number;
  averagePaymentRate?: number;
  graduationDate?: string;
  achievements?: string[];
  metrics?: Record<string, number | string>;
}

const reportTemplates = {
  transparency: (data: ReportData) => `Generate a professional transparency report for a SUSU group:

Group: ${data.groupName || 'Axiom SUSU Circle'}
Members: ${data.memberCount || 0}
Total Contributed: $${data.totalContributed || 0}
Completed Cycles: ${data.completedCycles || 0}
Average On-time Payment Rate: ${data.averagePaymentRate || 0}%

Create a formal but accessible report including:
1. Executive Summary (2-3 sentences)
2. Key Metrics breakdown
3. Member Participation Highlights
4. Financial Health Assessment
5. Looking Ahead section

Format with clear headers. Keep professional but warm.`,

  graduation: (data: ReportData) => `Generate a graduation summary for a SUSU group entering Capital Mode:

Group: ${data.groupName || 'Axiom SUSU Circle'}
Graduation Date: ${data.graduationDate || 'Today'}
Members: ${data.memberCount || 0}
Total Saved Together: $${data.totalContributed || 0}
Cycles Completed: ${data.completedCycles || 0}
Payment Consistency: ${data.averagePaymentRate || 0}%
Achievements: ${(data.achievements || []).join(', ') || 'Multiple milestones reached'}

Create a celebratory graduation summary:
1. Congratulations message
2. Journey highlights
3. Key achievements
4. What's next in Capital Mode
5. Opportunities now available

Make it inspiring and forward-looking.`,

  journey: (data: ReportData) => `Generate a personalized wealth journey insight:

Current Stage: ${data.type || 'SUSU Circle'}
Participation: ${data.metrics?.participation || 0}%
Savings Progress: $${data.metrics?.savings || 0}
Trust Score: ${data.metrics?.trustScore || 0}/100
Next Milestone: ${data.metrics?.nextMilestone || 'Continue building'}

Create a brief, personalized insight (150-200 words):
1. Where they are in their journey
2. What they've accomplished
3. Encouraging next steps
4. One specific tip for progress

Be motivating and specific.`
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reportType, data = {} } = req.body;

    if (!reportType || !['transparency', 'graduation', 'journey'].includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const prompt = reportTemplates[reportType as keyof typeof reportTemplates](data as ReportData);
    const response = await generateText(prompt, { model: 'gemini-2.5-flash' });

    return res.status(200).json({
      success: true,
      report: {
        type: reportType,
        content: response,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    console.error('Report generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
