import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';

const BRAND_COLORS = {
  gold: '#EAB308',
  black: '#111827',
  gray: '#6B7280',
  white: '#FFFFFF',
};

const MARKETING_CONTENT = {
  flyer: {
    filename: 'Axiom_Welcome_Flyer.pdf',
    title: 'Welcome to Axiom',
    subtitle: 'Build Wealth Together, On-Chain',
    sections: [
      {
        heading: 'What is Axiom?',
        content: 'Axiom is a DeFi treasury protocol that helps communities build wealth through discipline, structure, and collective savings. Join thousands building their financial future on-chain.'
      },
      {
        heading: 'Key Features',
        content: '• SUSU Savings Circles - Save together with your community\n• Wealth Engine - Stake AXM for variable protocol rewards\n• Governance - Vote on protocol decisions\n• DePIN Nodes - Earn from infrastructure'
      },
      {
        heading: 'Get Started',
        content: '1. Connect your wallet at axiom-nexus.replit.app\n2. Buy AXM tokens via card or DEX\n3. Join a savings circle or stake\n4. Build wealth with your community'
      }
    ]
  },
  social: {
    filename: 'Axiom_Social_Media_Kit.pdf',
    title: 'Social Media Kit',
    subtitle: 'Ready-to-use posts and captions',
    sections: [
      {
        heading: 'Post 1: Introduction',
        content: 'Just discovered @AxiomProtocol - a DeFi treasury where communities build wealth together. Self-custody, transparent, and community-governed. This is what DeFi should be! 🏛️✨ #DeFi #Web3 #Axiom'
      },
      {
        heading: 'Post 2: SUSU Feature',
        content: 'SUSU savings circles on Axiom = the future of community finance. Save together, earn together, grow together. No banks, just blockchain. 🤝💰 #SUSU #CommunityFinance #Axiom'
      },
      {
        heading: 'Post 3: Call to Action',
        content: 'Ready to take control of your financial future? Axiom Protocol lets you:\n✅ Self-custody your assets\n✅ Earn from community savings\n✅ Vote on protocol decisions\n\nJoin us at axiom-nexus.replit.app 🚀'
      },
      {
        heading: 'Hashtags to Use',
        content: '#AxiomProtocol #DeFi #Web3 #CryptoSavings #SUSU #CommunityFinance #BuildWealth #OnChain #Arbitrum #SelfCustody'
      }
    ]
  },
  banner: {
    filename: 'Axiom_Web_Banner_Guide.pdf',
    title: 'Web Banner Guidelines',
    subtitle: 'Brand assets and usage guide',
    sections: [
      {
        heading: 'Brand Colors',
        content: 'Primary Gold: #EAB308\nDark Background: #111827\nAccent Gray: #6B7280\nText White: #FFFFFF'
      },
      {
        heading: 'Typography',
        content: 'Headlines: Bold, Sans-serif\nBody: Regular, Sans-serif\nMinimum font size: 14px for web'
      },
      {
        heading: 'Logo Usage',
        content: 'Always use the official Axiom logo\nMaintain clear space around logo\nDo not stretch or distort\nPrefer gold logo on dark backgrounds'
      },
      {
        heading: 'Banner Sizes',
        content: 'Leaderboard: 728x90px\nMedium Rectangle: 300x250px\nWide Skyscraper: 160x600px\nMobile Banner: 320x50px'
      }
    ]
  },
  email: {
    filename: 'Axiom_Email_Template.pdf',
    title: 'Email Template',
    subtitle: 'Ready-to-send email copy',
    sections: [
      {
        heading: 'Subject Line Options',
        content: '• Join the future of community finance\n• Build wealth together with Axiom\n• Your invitation to Axiom Protocol\n• Discover SUSU savings circles'
      },
      {
        heading: 'Email Body',
        content: 'Hi [Name],\n\nI wanted to share something exciting with you - Axiom Protocol.\n\nAxiom is a DeFi treasury where communities build wealth together through SUSU savings circles, staking, and governance. It\'s fully self-custody, meaning you always control your funds.\n\nKey benefits:\n• Save with your community in rotating circles\n• Earn variable rewards from staking\n• Vote on protocol decisions\n• 29 verified smart contracts on Arbitrum\n\nGet started at axiom-nexus.replit.app\n\nLet me know if you have questions!\n\n[Your Name]'
      },
      {
        heading: 'Footer',
        content: 'Axiom Protocol - Build Wealth Together, On-Chain\naxiom-nexus.replit.app\n\nDisclaimer: Axiom is a non-custodial DeFi protocol. Not a bank. No FDIC insurance. Cryptocurrency investments carry risk.'
      }
    ]
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { type } = req.query;
  
  if (typeof type !== 'string' || !MARKETING_CONTENT[type as keyof typeof MARKETING_CONTENT]) {
    return res.status(400).json({ error: 'Invalid marketing material type' });
  }

  const content = MARKETING_CONTENT[type as keyof typeof MARKETING_CONTENT];

  try {
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
    res.setHeader('Content-Disposition', `attachment; filename="${content.filename}"`);

    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 120)
       .fill(BRAND_COLORS.black);

    doc.fontSize(28)
       .fillColor(BRAND_COLORS.gold)
       .text('AXIOM', 50, 35, { continued: true })
       .fillColor(BRAND_COLORS.white)
       .text(' PROTOCOL');

    doc.fontSize(12)
       .fillColor(BRAND_COLORS.gray)
       .text(content.subtitle, 50, 75);

    doc.fontSize(18)
       .fillColor(BRAND_COLORS.gold)
       .text(content.title, 50, 95);

    let yPosition = 150;

    for (const section of content.sections) {
      if (yPosition > 680) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(14)
         .fillColor(BRAND_COLORS.gold)
         .text(section.heading, 50, yPosition);

      yPosition += 25;

      doc.fontSize(11)
         .fillColor(BRAND_COLORS.black)
         .text(section.content, 50, yPosition, {
           width: 500,
           lineGap: 4
         });

      yPosition = doc.y + 25;
    }

    const footerY = doc.page.height - 60;
    doc.fontSize(9)
       .fillColor(BRAND_COLORS.gray)
       .text('Axiom Protocol - Build Wealth Together, On-Chain', 50, footerY, { align: 'center' })
       .text('axiom-nexus.replit.app | Self-custody DeFi | Not a bank', 50, footerY + 15, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate marketing material' });
  }
}
