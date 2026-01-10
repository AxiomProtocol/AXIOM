import type { NextApiRequest, NextApiResponse } from 'next';
import { frontMatter, chapter1, chapter2, chapter3 } from '../../../server/content/manuscript-part1';
import { chapter4, chapter6to8, chapter9to12, chapter13to16, chapter17to20 } from '../../../server/content/manuscript-part2';
import { backMatter, communityStories, worksheets } from '../../../server/content/manuscript-part3';
import { chapter10, chapter14, chapter15and16, chapter18to20 } from '../../../server/content/manuscript-expanded';
import { chapter5Detailed, additionalStories, additionalWorksheets } from '../../../server/content/manuscript-extra';

function compileManuscript(): string {
  return [
    frontMatter,
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter5Detailed,
    chapter6to8,
    chapter9to12,
    chapter10,
    chapter13to16,
    chapter14,
    chapter15and16,
    chapter17to20,
    chapter18to20,
    communityStories,
    additionalStories,
    worksheets,
    additionalWorksheets,
    backMatter
  ].join('\n\n');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const manuscript = compileManuscript();
    const words = manuscript.split(/\s+/).filter(w => w.length > 0);
    const lines = manuscript.split('\n');
    const headings = lines.filter(l => l.startsWith('#'));
    
    res.status(200).json({
      success: true,
      stats: {
        wordCount: words.length,
        characterCount: manuscript.length,
        lineCount: lines.length,
        headingCount: headings.length,
        estimatedPages: Math.ceil(words.length / 250),
        chapters: 20,
        sections: [
          'Front Matter',
          'Part 1: Foundation Phase (Ch 1-4)',
          'Part 2: Savings Phase (Ch 5-8)',
          'Part 3: Growth Phase (Ch 9-12)',
          'Part 4: Land Phase (Ch 13-16)',
          'Part 5: Leadership Phase (Ch 17-20)',
          'Community Stories',
          'Worksheets',
          'Back Matter (Glossary, Resources, Certificate)'
        ]
      },
      preview: manuscript.substring(0, 1500) + '...'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
