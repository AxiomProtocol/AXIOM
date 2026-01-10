import express from 'express';
import { createManuscriptDocument } from '../services/googleDocsService';
import { frontMatter, chapter1, chapter2, chapter3 } from '../content/manuscript-part1';
import { chapter4, chapter9to12, chapter13to16, chapter17to20 } from '../content/manuscript-part2';
import { backMatter, communityStories, worksheets } from '../content/manuscript-part3';

const router = express.Router();

function compileManuscript(): string {
  return [
    frontMatter,
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter9to12,
    chapter13to16,
    chapter17to20,
    communityStories,
    worksheets,
    backMatter
  ].join('\n\n---\n\n');
}

router.post('/create-google-doc', async (req, res) => {
  try {
    const manuscript = compileManuscript();
    const documentId = await createManuscriptDocument(
      'The Axiom Wealth Generation Manual - Gold Standard Edition',
      manuscript
    );
    
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    
    res.json({
      success: true,
      documentId,
      documentUrl,
      message: 'Manuscript created successfully in Google Docs'
    });
  } catch (error: any) {
    console.error('Error creating Google Doc:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create Google Doc'
    });
  }
});

router.get('/download', (req, res) => {
  try {
    const manuscript = compileManuscript();
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="Axiom-Wealth-Generation-Manual.txt"');
    res.send(manuscript);
  } catch (error: any) {
    console.error('Error generating manuscript:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate manuscript'
    });
  }
});

router.get('/preview', (req, res) => {
  try {
    const manuscript = compileManuscript();
    const wordCount = manuscript.split(/\s+/).length;
    const pageEstimate = Math.ceil(wordCount / 250);
    
    res.json({
      success: true,
      stats: {
        wordCount,
        pageEstimate,
        characterCount: manuscript.length
      },
      preview: manuscript.substring(0, 2000) + '...'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
