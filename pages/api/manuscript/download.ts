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
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Axiom-Wealth-Generation-Manual.txt"');
    res.status(200).send(manuscript);
  } catch (error: any) {
    console.error('Error generating manuscript:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate manuscript'
    });
  }
}
