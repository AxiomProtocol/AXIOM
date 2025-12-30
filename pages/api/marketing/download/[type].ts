import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';
import {
  generateFlyerContent,
  generateSocialMediaContent,
  generateEmailContent,
  generateBrandGuideContent,
  MarketingContent
} from '../../../../lib/server/marketing-ai';

const BRAND_COLORS = {
  gold: '#EAB308',
  black: '#111827',
  gray: '#6B7280',
  white: '#FFFFFF',
  blue: '#3B82F6',
};

const FILENAMES: Record<string, string> = {
  flyer: 'Axiom_Welcome_Flyer.pdf',
  social: 'Axiom_Social_Media_Kit.pdf',
  banner: 'Axiom_Brand_Guidelines.pdf',
  email: 'Axiom_Email_Templates.pdf',
};

const FALLBACK_CONTENT: Record<string, MarketingContent> = {
  flyer: {
    title: 'Welcome to Axiom Protocol',
    subtitle: 'Build Wealth Together Through Community-Driven DeFi',
    sections: [
      {
        heading: 'What is Axiom?',
        content: 'Axiom is a revolutionary DeFi treasury protocol that empowers communities to build wealth together. Through our innovative SUSU savings circles, staking mechanisms, and governance systems, we\'re creating a new paradigm for collective financial growth.'
      },
      {
        heading: 'Key Benefits',
        content: '• SUSU Savings Circles - Save together with your community\n• Wealth Engine - Stake AXM for variable protocol rewards\n• Governance - Vote on protocol decisions with veAXM\n• DePIN Nodes - Earn from decentralized infrastructure\n• Self-Custody - You always control your funds'
      },
      {
        heading: 'How It Works',
        content: '1. Connect your wallet to axiom-nexus.replit.app\n2. Purchase AXM tokens via card or DEX\n3. Join a SUSU circle or stake in the Wealth Engine\n4. Build wealth alongside your community\n5. Participate in governance to shape the future'
      },
      {
        heading: 'Get Started Today',
        content: 'Visit axiom-nexus.replit.app to begin your journey. 29 verified smart contracts on Arbitrum One. Self-custody, transparent, and community-governed.\n\nNote: Axiom is a non-custodial DeFi protocol. Not a bank. No FDIC insurance. Cryptocurrency investments carry risk.'
      }
    ]
  },
  social: {
    title: 'Social Media Kit',
    subtitle: 'Ready-to-post content for maximum engagement',
    sections: [
      {
        heading: 'Post 1: Introduction',
        content: 'Just discovered @AxiomProtocol - where communities build wealth TOGETHER on-chain. Self-custody, transparent, community-governed. This is what DeFi was meant to be. 🏛️✨\n\n#DeFi #Web3 #Axiom #CryptoSavings #BuildWealth'
      },
      {
        heading: 'Post 2: SUSU Feature',
        content: 'SUSU savings circles are going on-chain. 🤝\n\nImagine saving with your community, everyone accountable, everything transparent. That\'s @AxiomProtocol.\n\n#SUSU #CommunityFinance #DeFi #Axiom'
      },
      {
        heading: 'Post 3: Wealth Engine',
        content: 'Stop watching your crypto sit idle. ⚡\n\nAxiom\'s Wealth Engine lets you stake AXM for variable protocol rewards. Discipline + Structure = Results.\n\n#Staking #DeFi #Axiom #CryptoRewards'
      },
      {
        heading: 'Post 4: Community Focus',
        content: 'The future of finance isn\'t solo. It\'s together. 🌍\n\nAxiom Protocol: Where communities govern, save, and grow as one. Join the movement at axiom-nexus.replit.app\n\n#CommunityFirst #DeFi #Axiom #Web3'
      },
      {
        heading: 'Post 5: Call to Action',
        content: 'Ready to take control of your financial future? 🚀\n\n✅ Self-custody (you own your keys)\n✅ Community-governed\n✅ 29 verified contracts\n\nStart now: axiom-nexus.replit.app\n\n#Axiom #DeFi #SelfCustody'
      },
      {
        heading: 'Hashtag Bank',
        content: '#AxiomProtocol #DeFi #Web3 #CryptoSavings #SUSU #CommunityFinance #BuildWealth #OnChain #Arbitrum #SelfCustody #Staking #DAO #Governance #FinancialFreedom #CryptoLife'
      }
    ]
  },
  banner: {
    title: 'Axiom Brand Guidelines',
    subtitle: 'Creating consistent, professional marketing materials',
    sections: [
      {
        heading: 'Brand Colors',
        content: 'Primary Gold: #EAB308 - Use for CTAs, highlights, and brand emphasis\nDark Background: #111827 - Primary background for dark mode\nAccent Blue: #3B82F6 - Secondary actions, links\nSuccess Green: #22C55E - Positive states, confirmations\nText White: #FFFFFF - Primary text on dark backgrounds\nMuted Gray: #6B7280 - Secondary text, captions'
      },
      {
        heading: 'Typography',
        content: 'Headlines: Bold, Sans-serif (Inter, Poppins, or system fonts)\nBody: Regular weight, Sans-serif, minimum 16px for web\nNumbers/Data: Monospace for wallet addresses and statistics\n\nLine height: 1.5 for body text, 1.2 for headlines\nLetter spacing: Normal, slightly tighter for headlines'
      },
      {
        heading: 'Voice & Tone',
        content: 'Empowering: "Build wealth together" not "Make money"\nInclusive: "Our community" not "Users"\nTrustworthy: Clear, honest, no hype\nAccessible: Explain DeFi concepts simply\nAction-oriented: Clear CTAs, active voice\n\nAvoid: FOMO tactics, guaranteed returns, "to the moon" language'
      },
      {
        heading: 'Do\'s and Don\'ts',
        content: 'DO: Emphasize self-custody and user control\nDO: Include compliance disclaimers\nDO: Highlight community benefits\nDO: Use real data and verified claims\n\nDON\'T: Promise specific returns or APY\nDON\'T: Use banking terminology\nDON\'T: Make FDIC or insurance claims\nDON\'T: Use fear-based marketing'
      },
      {
        heading: 'Compliance Checklist',
        content: 'Every marketing material must include:\n\n☐ "Self-custody / Non-custodial" mention\n☐ "Not a bank" disclaimer where appropriate\n☐ "Cryptocurrency investments carry risk"\n☐ No guaranteed return promises\n☐ No FDIC or insurance references\n☐ Clear that users control their funds'
      }
    ]
  },
  email: {
    title: 'Email Invitation Templates',
    subtitle: 'Copy-paste emails to grow your community',
    sections: [
      {
        heading: 'Subject Line Options',
        content: '• Join me in building wealth together on Axiom\n• I found something cool - check out Axiom Protocol\n• Ever heard of SUSU savings? Now it\'s on-chain\n• This DeFi platform is different - here\'s why\n• Let\'s build our financial future together'
      },
      {
        heading: 'Casual Friend Email',
        content: 'Hey [Name]!\n\nI wanted to share something I\'ve been exploring - it\'s called Axiom Protocol.\n\nBasically, it\'s a way for communities to build wealth together using blockchain. Think of it like a digital savings circle (SUSU) where everything is transparent and you always control your own funds.\n\nWhat I like about it:\n- I keep control of my money (self-custody)\n- Decisions are made by the community\n- Everything is on Arbitrum, so transactions are fast and cheap\n\nCheck it out: axiom-nexus.replit.app\n\nNo pressure, just thought you\'d find it interesting!\n\n[Your Name]'
      },
      {
        heading: 'Professional Network Email',
        content: 'Hi [Name],\n\nI hope this email finds you well. I wanted to share a project I\'ve been involved with that aligns with our previous discussions about decentralized finance and community-driven initiatives.\n\nAxiom Protocol is a DeFi treasury system that enables community-driven wealth building through:\n\n• SUSU Savings Circles - Rotating savings groups on-chain\n• Governance participation via veAXM tokens\n• Infrastructure investment through DePIN nodes\n\nThe platform operates on Arbitrum One with 29 verified smart contracts and follows a self-custody model where users maintain full control of their assets.\n\nI\'d welcome the opportunity to discuss this further if you\'re interested: axiom-nexus.replit.app\n\nBest regards,\n[Your Name]'
      },
      {
        heading: 'Follow-up Email',
        content: 'Hey [Name],\n\nJust following up on Axiom Protocol - have you had a chance to check it out?\n\nIf you have any questions about how it works, I\'m happy to walk you through it. The SUSU savings circles are a great way to start if you\'re new to DeFi.\n\nHere\'s the link again: axiom-nexus.replit.app\n\nLet me know!\n\n[Your Name]'
      },
      {
        heading: 'Email Signature Block',
        content: '---\n[Your Name]\nAxiom Community Member\n\nLearn more: axiom-nexus.replit.app\n\nDisclaimer: Axiom Protocol is a self-custody DeFi platform. Not a bank. No FDIC insurance. Cryptocurrency investments carry risk. Do your own research.'
      }
    ]
  }
};

async function getContent(type: string): Promise<MarketingContent> {
  try {
    switch (type) {
      case 'flyer':
        return await generateFlyerContent();
      case 'social':
        return await generateSocialMediaContent();
      case 'banner':
        return await generateBrandGuideContent();
      case 'email':
        return await generateEmailContent();
      default:
        throw new Error('Unknown type');
    }
  } catch (error) {
    console.log(`AI generation failed for ${type}, using fallback:`, error);
    return FALLBACK_CONTENT[type] || FALLBACK_CONTENT.flyer;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { type } = req.query;
  
  if (typeof type !== 'string' || !FILENAMES[type]) {
    return res.status(400).json({ error: 'Invalid marketing material type' });
  }

  try {
    const content = await getContent(type);

    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
      info: {
        Title: content.title,
        Author: 'Axiom Protocol',
        Subject: 'Marketing Material',
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${FILENAMES[type]}"`);

    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 130)
       .fill(BRAND_COLORS.black);

    doc.fontSize(32)
       .fillColor(BRAND_COLORS.gold)
       .text('AXIOM', 50, 30, { continued: true })
       .fillColor(BRAND_COLORS.white)
       .text(' PROTOCOL');

    doc.fontSize(11)
       .fillColor(BRAND_COLORS.gray)
       .text('Build Wealth Together, On-Chain', 50, 70);

    doc.fontSize(16)
       .fillColor(BRAND_COLORS.gold)
       .text(content.title, 50, 95);

    doc.fontSize(10)
       .fillColor(BRAND_COLORS.gray)
       .text(content.subtitle, 50, 115);

    let yPosition = 160;

    for (const section of content.sections) {
      if (yPosition > 660) {
        doc.addPage();
        yPosition = 50;
      }

      doc.rect(50, yPosition - 5, 4, 20)
         .fill(BRAND_COLORS.gold);

      doc.fontSize(13)
         .fillColor(BRAND_COLORS.gold)
         .text(section.heading, 60, yPosition);

      yPosition += 25;

      doc.fontSize(10)
         .fillColor(BRAND_COLORS.black)
         .text(section.content, 50, yPosition, {
           width: 510,
           lineGap: 5,
           paragraphGap: 8
         });

      yPosition = doc.y + 20;
    }

    const footerY = doc.page.height - 70;
    
    doc.rect(0, footerY - 10, doc.page.width, 80)
       .fill('#f8f9fa');

    doc.fontSize(9)
       .fillColor(BRAND_COLORS.gray)
       .text('Axiom Protocol - Build Wealth Together, On-Chain', 50, footerY, { align: 'center' })
       .text('axiom-nexus.replit.app', 50, footerY + 12, { align: 'center' });

    doc.fontSize(7)
       .fillColor('#9CA3AF')
       .text('Self-custody DeFi protocol. Not a bank. No FDIC insurance. Cryptocurrency investments carry risk.', 50, footerY + 28, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate marketing material' });
  }
}
