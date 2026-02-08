import type { NextApiRequest, NextApiResponse } from 'next';
import { generateWeb3Visual, generateHeroBackground, generateFeatureIcon, generateCardBackground, Web3VisualStyle } from '../../../lib/server/visual-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, style, pageName, featureName, cardType, primaryColor, accentColor, size } = req.body;

  try {
    let imageData: string | null = null;

    switch (type) {
      case 'web3-visual':
        if (!style) {
          return res.status(400).json({ error: 'Style is required for web3-visual' });
        }
        imageData = await generateWeb3Visual({
          style: style as Web3VisualStyle,
          primaryColor,
          accentColor,
          size
        });
        break;

      case 'hero':
        if (!pageName) {
          return res.status(400).json({ error: 'Page name is required for hero' });
        }
        imageData = await generateHeroBackground(pageName);
        break;

      case 'icon':
        if (!featureName) {
          return res.status(400).json({ error: 'Feature name is required for icon' });
        }
        imageData = await generateFeatureIcon(featureName);
        break;

      case 'card':
        if (!cardType) {
          return res.status(400).json({ error: 'Card type is required' });
        }
        imageData = await generateCardBackground(cardType);
        break;

      default:
        return res.status(400).json({ error: 'Invalid type. Use: web3-visual, hero, icon, or card' });
    }

    if (!imageData) {
      return res.status(500).json({ error: 'Failed to generate visual' });
    }

    res.status(200).json({ 
      success: true, 
      image: imageData,
      type,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Visual generation error:', error);
    res.status(500).json({ error: 'Failed to generate visual' });
  }
}
