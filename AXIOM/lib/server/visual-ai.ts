import { generateImage } from './gemini';
import { generateImageOpenAI } from './openai';

export type Web3VisualStyle = 
  | 'neon-grid'
  | 'blockchain-nodes'
  | 'holographic'
  | 'cyberpunk'
  | 'token-abstract'
  | 'defi-flow';

export interface VisualConfig {
  style: Web3VisualStyle;
  primaryColor?: string;
  accentColor?: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
}

const STYLE_PROMPTS: Record<Web3VisualStyle, string> = {
  'neon-grid': 'Abstract neon grid pattern with glowing cyan and gold lines on dark background, futuristic Web3 aesthetic, blockchain technology visualization, minimalist geometric design, high contrast, suitable for website background',
  
  'blockchain-nodes': 'Abstract network of interconnected glowing nodes and data points, blockchain visualization, golden and blue gradient particles on dark navy background, decentralized network pattern, modern DeFi aesthetic',
  
  'holographic': 'Iridescent holographic gradient mesh, shifting colors between gold, cyan, and purple on dark background, futuristic Web3 design, smooth abstract curves, premium luxury aesthetic',
  
  'cyberpunk': 'Cyberpunk cityscape silhouette with neon gold accents, digital rain effect, dark background with glowing geometric shapes, futuristic Web3 cryptocurrency aesthetic',
  
  'token-abstract': 'Abstract golden cryptocurrency token floating in space with orbital rings, particle effects, dark gradient background, luxury DeFi aesthetic, 3D rendered look',
  
  'defi-flow': 'Abstract flowing liquid gold streams representing money flow, dark background with subtle blue accents, DeFi protocol visualization, smooth gradients, modern financial technology design'
};

const SIZE_SPECS: Record<string, string> = {
  small: 'icon sized, 256x256, simple composition',
  medium: 'medium banner, 800x400, balanced composition',
  large: 'large header, 1200x600, detailed composition',
  hero: 'full hero section, 1920x800, expansive composition'
};

export async function generateWeb3Visual(config: VisualConfig): Promise<string | null> {
  const { style, primaryColor = '#EAB308', accentColor = '#3B82F6', size = 'medium' } = config;
  
  const basePrompt = STYLE_PROMPTS[style];
  const sizeSpec = SIZE_SPECS[size];
  
  const fullPrompt = `${basePrompt}. Use ${primaryColor} (gold) as primary accent color and ${accentColor} (blue) as secondary. ${sizeSpec}. Professional quality, suitable for DeFi platform. No text or logos.`;

  try {
    const image = await generateImageOpenAI(fullPrompt);
    if (image) return image;
  } catch (error) {
    console.log('OpenAI image failed, trying Gemini:', error);
  }

  try {
    const image = await generateImage(fullPrompt);
    return image;
  } catch (error) {
    console.log('Gemini image also failed:', error);
    return null;
  }
}

export async function generateFeatureIcon(featureName: string): Promise<string | null> {
  const prompt = `Minimalist Web3 icon for "${featureName}" feature, golden glow effect on dark background, simple geometric design, suitable for UI, no text, professional cryptocurrency aesthetic, 256x256`;

  try {
    const image = await generateImageOpenAI(prompt);
    if (image) return image;
  } catch (error) {
    console.log('OpenAI icon failed, trying Gemini');
  }

  try {
    return await generateImage(prompt);
  } catch (error) {
    console.log('Gemini icon also failed');
    return null;
  }
}

export async function generateHeroBackground(pageName: string): Promise<string | null> {
  const pagePrompts: Record<string, string> = {
    home: 'Futuristic smart city skyline at dusk with golden lights, blockchain nodes floating in sky, Web3 aesthetic, dark gradient background transitioning to starry sky',
    treasury: 'Abstract vault visualization with golden security shields and flowing particle effects, DeFi treasury aesthetic, dark luxurious background',
    staking: 'Glowing golden tokens stacking and multiplying, particle effects, wealth growth visualization, dark gradient background with subtle grid',
    governance: 'Democratic assembly visualization with glowing voting nodes, golden and blue accents, decentralized governance aesthetic',
    susu: 'Connected community circle with flowing golden energy between members, community savings visualization, warm golden glow on dark background',
    nodes: 'DePIN infrastructure network with glowing server nodes connected by golden data streams, futuristic hardware visualization',
    keygrow: 'Tokenized real estate visualization with holographic property blueprints and golden key, Web3 property ownership aesthetic'
  };

  const basePrompt = pagePrompts[pageName.toLowerCase()] || pagePrompts.home;
  const fullPrompt = `${basePrompt}. Professional quality hero background for DeFi platform, 1920x800, no text or logos, suitable for dark UI overlay.`;

  try {
    const image = await generateImageOpenAI(fullPrompt);
    if (image) return image;
  } catch (error) {
    console.log('OpenAI hero failed, trying Gemini');
  }

  try {
    return await generateImage(fullPrompt);
  } catch (error) {
    console.log('Gemini hero also failed');
    return null;
  }
}

export async function generateCardBackground(cardType: string): Promise<string | null> {
  const cardPrompts: Record<string, string> = {
    stats: 'Subtle circuit board pattern with golden traces on dark gradient, minimal and clean, suitable for stats overlay',
    action: 'Dynamic energy flow pattern with golden particles, dark background, action-oriented aesthetic',
    info: 'Soft holographic mesh gradient, iridescent gold and blue on dark background, informational card aesthetic',
    premium: 'Luxury golden particle swirl on black gradient, premium exclusive aesthetic, subtle shimmer effect'
  };

  const basePrompt = cardPrompts[cardType.toLowerCase()] || cardPrompts.info;
  const fullPrompt = `${basePrompt}. Card background 400x300, very subtle pattern allowing text overlay, Web3 DeFi aesthetic.`;

  try {
    const image = await generateImageOpenAI(fullPrompt);
    if (image) return image;
  } catch (error) {
    console.log('OpenAI card failed, trying Gemini');
  }

  try {
    return await generateImage(fullPrompt);
  } catch (error) {
    console.log('Gemini card also failed');
    return null;
  }
}
