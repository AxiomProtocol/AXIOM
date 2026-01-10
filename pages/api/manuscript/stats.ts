import type { NextApiRequest, NextApiResponse } from 'next';
import { compileGoldStandardManuscript, getManuscriptStats } from '../../../server/content/manuscript-rewrite/index';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const manuscript = compileGoldStandardManuscript();
    const stats = getManuscriptStats();
    const lines = manuscript.split('\n');
    const headings = lines.filter(l => l.startsWith('#'));
    
    res.status(200).json({
      success: true,
      stats: {
        wordCount: stats.wordCount,
        characterCount: stats.characterCount,
        pageEstimate: stats.pageEstimate,
        lineCount: lines.length,
        headingCount: headings.length,
        chapters: 22,
        targetMet: stats.pageEstimate >= 280
      },
      sections: [
        'Front Matter & Introduction',
        'Part I: The Awakening (Chapters 1-3)',
        'Part II: The Sovereign Mind (Chapters 4-6)',
        'Part III: Group Economics - The Wealth Practice (Chapters 7-10)',
        'Part IV: The Mastermind Treasury (Chapters 11-13)',
        'Part V: Land & Legacy (Chapters 14-16)',
        'Part VI: The Sovereign Economy (Chapters 17-19)',
        'Part VII: The 21-Day Wealth Activation (Chapters 20-22)',
        'Appendix (Quick Start Guides, Glossary, QR Codes, Resources)'
      ],
      voiceStyle: 'Rev. Ike + Napoleon Hill + Powernomics',
      features: [
        'Workbook exercises at end of each chapter',
        'Step-by-step implementation guides',
        'QR code links to platform features',
        'Mastermind discussion prompts',
        'Daily declarations and affirmations',
        '21-day activation program'
      ],
      preview: manuscript.substring(0, 2000) + '...'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
