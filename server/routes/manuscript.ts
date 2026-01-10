import express from 'express';
import { createManuscriptDocument } from '../services/googleDocsService';
import { compileGoldStandardManuscript, getManuscriptStats } from '../content/manuscript-rewrite/index';

const router = express.Router();

router.post('/create-google-doc', async (req, res) => {
  try {
    const manuscript = compileGoldStandardManuscript();
    const stats = getManuscriptStats();
    
    const documentId = await createManuscriptDocument(
      'The Axiom Wealth Generation Manual - Gold Standard Edition (2026)',
      manuscript
    );
    
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    
    res.json({
      success: true,
      documentId,
      documentUrl,
      stats,
      message: 'Gold Standard Manuscript created successfully in Google Docs'
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
    const manuscript = compileGoldStandardManuscript();
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="Axiom-Wealth-Generation-Manual-Gold-Standard-2026.txt"');
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
    const manuscript = compileGoldStandardManuscript();
    const stats = getManuscriptStats();
    
    res.json({
      success: true,
      stats,
      preview: manuscript.substring(0, 3000) + '...',
      partsList: [
        'Front Matter & Introduction',
        'Part I: The Awakening (Chapters 1-3)',
        'Part II: The Sovereign Mind (Chapters 4-6)',
        'Part III: Group Economics - The Wealth Practice (Chapters 7-10)',
        'Part IV: The Mastermind Treasury (Chapters 11-13)',
        'Part V: Land & Legacy (Chapters 14-16)',
        'Part VI: The Sovereign Economy (Chapters 17-19)',
        'Part VII: The 21-Day Wealth Activation (Chapters 20-22)',
        'Appendix'
      ]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/stats', (req, res) => {
  try {
    const stats = getManuscriptStats();
    res.json({
      success: true,
      ...stats,
      targetPages: '280-300 pages',
      targetWords: '70,000-75,000 words',
      meetsTarget: stats.pageEstimate >= 280 && stats.pageEstimate <= 300
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
