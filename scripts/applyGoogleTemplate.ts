import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-docs',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Docs not connected');
  }
  return accessToken;
}

async function getGoogleClients() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return {
    docs: google.docs({ version: 'v1', auth: oauth2Client }),
    drive: google.drive({ version: 'v3', auth: oauth2Client })
  };
}

async function searchTemplates() {
  const { drive } = await getGoogleClients();
  
  console.log('Searching for available document templates...\n');
  
  try {
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.document'",
      pageSize: 20,
      fields: 'files(id, name, createdTime, webViewLink)',
      orderBy: 'createdTime desc'
    });
    
    console.log('Your Google Docs:');
    console.log('─────────────────────────────────────────────────────────────────');
    
    if (response.data.files && response.data.files.length > 0) {
      response.data.files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   ID: ${file.id}`);
        console.log(`   Link: ${file.webViewLink}`);
        console.log('');
      });
    } else {
      console.log('No documents found in your Drive.');
    }
    
    return response.data.files;
  } catch (error) {
    console.error('Error searching templates:', error);
    throw error;
  }
}

async function copyTemplateAndFillData(templateId: string, newTitle: string, replacements: Record<string, string>) {
  const { docs, drive } = await getGoogleClients();
  
  console.log(`\nCopying template: ${templateId}`);
  console.log(`New document title: ${newTitle}`);
  
  const copyResponse = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: newTitle
    }
  });
  
  const newDocId = copyResponse.data.id!;
  console.log(`Created new document: ${newDocId}`);
  
  if (Object.keys(replacements).length > 0) {
    console.log('Applying data replacements...');
    
    const requests = Object.entries(replacements).map(([placeholder, value]) => ({
      replaceAllText: {
        containsText: {
          text: placeholder,
          matchCase: true
        },
        replaceText: value
      }
    }));
    
    await docs.documents.batchUpdate({
      documentId: newDocId,
      requestBody: { requests }
    });
    
    console.log(`Applied ${requests.length} replacements`);
  }
  
  return {
    documentId: newDocId,
    url: `https://docs.google.com/document/d/${newDocId}/edit`
  };
}

async function createProfessionalTemplate(type: 'financial' | 'investor') {
  const { docs, drive } = await getGoogleClients();
  
  const title = type === 'financial' 
    ? 'PROFESSIONAL TEMPLATE - Personal Financial Statement'
    : 'PROFESSIONAL TEMPLATE - Institutional Investor Packet';
  
  console.log(`\nCreating professional ${type} template...`);
  
  const createResponse = await docs.documents.create({
    requestBody: { title }
  });
  
  const templateId = createResponse.data.documentId!;
  
  const content = type === 'financial' ? getFinancialStatementContent() : getInvestorPacketContent();
  
  const requests: any[] = [
    {
      insertText: {
        location: { index: 1 },
        text: content
      }
    }
  ];
  
  await docs.documents.batchUpdate({
    documentId: templateId,
    requestBody: { requests }
  });
  
  const styleRequests = getStyleRequests(type);
  
  if (styleRequests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: templateId,
      requestBody: { requests: styleRequests }
    });
  }
  
  console.log(`Template created: https://docs.google.com/document/d/${templateId}/edit`);
  
  return templateId;
}

function getFinancialStatementContent(): string {
  return `




PERSONAL FINANCIAL STATEMENT

Prepared For: {{NAME}}
Date: {{DATE}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


PERSONAL INFORMATION

Name	{{NAME}}
Indigenous Title	{{INDIGENOUS_TITLE}}
Email	{{EMAIL}}
Employment	{{EMPLOYMENT}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 1: ASSETS

Cash and Cash Equivalents

Description	Amount
Personal Checking	{{CHECKING}}
Personal Savings	{{SAVINGS}}
Business Operating Account	{{BUSINESS_ACCOUNT}}
Subtotal	{{CASH_SUBTOTAL}}


Investments

Description	Amount
AXM Tokens ({{AXM_QUANTITY}})	{{AXM_VALUE}}
Bitcoin	{{BITCOIN}}
Ethereum	{{ETHEREUM}}
Subtotal	{{INVESTMENT_SUBTOTAL}}


Business Interests

Business	Ownership	Valuation
{{BUSINESS_NAME}}	{{OWNERSHIP}}	{{BUSINESS_VALUATION}}


Vehicles and Other Assets

Description	Value
{{VEHICLE}}	{{VEHICLE_VALUE}}
Other Assets	{{OTHER_ASSETS}}


TOTAL ASSETS	{{TOTAL_ASSETS}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 2: LIABILITIES

Short-Term Liabilities

Description	Amount
Credit Cards	{{CREDIT_CARDS}}
Outstanding Bills	{{BILLS}}


Long-Term Liabilities

Description	Amount
Truck Lease (Annual)	{{TRUCK_LEASE}}
Student Loan 1	{{LOAN_1}}
Student Loan 2	{{LOAN_2}}
Total Student Loans	{{TOTAL_LOANS}}


TOTAL LIABILITIES	{{TOTAL_LIABILITIES}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 3: NET WORTH

Total Assets	{{TOTAL_ASSETS}}
Total Liabilities	({{TOTAL_LIABILITIES}})

NET WORTH	{{NET_WORTH}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 4: INCOME

Source	Period	Amount
{{INCOME_SOURCE}}	Weekly	{{WEEKLY_INCOME}}
	Monthly	{{MONTHLY_INCOME}}
	Annual	{{ANNUAL_INCOME}}
Business Revenue	Annual	{{BUSINESS_REVENUE}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 5: NOTES AND DISCLOSURES

1. {{NOTE_1}}
2. {{NOTE_2}}
3. {{NOTE_3}}
4. {{NOTE_4}}
5. {{NOTE_5}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


CERTIFICATION

I certify that the information contained in this Personal Financial Statement is true and accurate to the best of my knowledge.


Signature: _______________________________________

Name: {{NAME}}

Date: {{SIGNATURE_DATE}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIDENTIAL - FOR AUTHORIZED RECIPIENTS ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

function getInvestorPacketContent(): string {
  return `




AXIOM PROTOCOL
INSTITUTIONAL INVESTOR PACKET

{{DATE}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONFIDENTIAL

Prepared For:	Institutional Investors and Strategic Partners
Prepared By:	{{FOUNDER_NAME}}, Founder
Date:	{{DATE}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 1: EXECUTIVE SUMMARY

{{COMPANY_DESCRIPTION}}


VALUATION SUMMARY

Scenario	Valuation
Conservative	{{CONSERVATIVE_VALUATION}}
Base Case	{{BASE_VALUATION}}
Optimistic	{{OPTIMISTIC_VALUATION}}

Valuation Type:	{{VALUATION_TYPE}}
Stage:	{{STAGE}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 2: VALUATION METHODOLOGY

Payne Scorecard Method

Metric	Value
Weighted Score	{{SCORECARD_SCORE}}
Scorecard Valuation	{{SCORECARD_VALUATION}}


Cost-to-Replicate Approach

Component	Cost
Smart Contracts	{{CONTRACT_COST}}
Full Stack Application	{{APP_COST}}
Documentation & IP	{{DOC_COST}}
Infrastructure	{{INFRA_COST}}
Total Development Cost	{{TOTAL_DEV_COST}}
IP Premium (3x)	{{IP_PREMIUM}}
Replication Value	{{REPLICATION_VALUE}}


Comparable Company Analysis

Range:	{{COMPARABLE_RANGE}}


Intellectual Property Valuation

Component	Value
Patents & Architecture	{{PATENT_VALUE}}
Trade Secrets	{{TRADE_SECRET_VALUE}}
Brand Assets	{{BRAND_VALUE}}
Total IP Value	{{TOTAL_IP_VALUE}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 3: PROJECT ASSETS

Smart Contracts

Metric	Value
Deployed & Verified	{{CONTRACT_COUNT}}
Lines of Code	{{LINES_OF_CODE}}
Network	{{NETWORK}}


Core Products

{{PRODUCT_LIST}}


Networks

Current:	{{CURRENT_NETWORK}}
Planned:	{{PLANNED_NETWORK}}


Compliance Framework

{{COMPLIANCE_LIST}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 4: TOKEN STRUCTURE

Metric	Value
Token Name	{{TOKEN_NAME}}
Total Supply	{{TOTAL_SUPPLY}}
Minted to Founder	{{FOUNDER_TOKENS}}
Founder Allocation	{{FOUNDER_PERCENT}}
Token Value (Pre-TGE)	{{TOKEN_VALUE}}
Founder Token Value	{{FOUNDER_TOKEN_VALUE}}
Circulating Supply	{{CIRCULATING_SUPPLY}}

Legal Notice: {{TOKEN_LEGAL_NOTICE}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 5: KEY VALUE DRIVERS

Milestone	Target
{{MILESTONE_1}}	{{TARGET_1}}
{{MILESTONE_2}}	{{TARGET_2}}
{{MILESTONE_3}}	{{TARGET_3}}
{{MILESTONE_4}}	{{TARGET_4}}
{{MILESTONE_5}}	{{TARGET_5}}
{{MILESTONE_6}}	{{TARGET_6}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 6: RISK FACTORS

Risk	Mitigation
{{RISK_1}}	{{MITIGATION_1}}
{{RISK_2}}	{{MITIGATION_2}}
{{RISK_3}}	{{MITIGATION_3}}
{{RISK_4}}	{{MITIGATION_4}}
{{RISK_5}}	{{MITIGATION_5}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 7: FOUNDER INFORMATION

Name:	{{FOUNDER_NAME}}
Indigenous Name:	{{INDIGENOUS_NAME}}
Role:	{{FOUNDER_ROLE}}

Expertise:
{{EXPERTISE_LIST}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 8: INVESTOR ACCESS TIERS

Tier	Access Level
Tier 1	{{TIER_1_ACCESS}}
Tier 2	{{TIER_2_ACCESS}}
Tier 3	{{TIER_3_ACCESS}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SECTION 9: CONFIDENTIALITY NOTICE

{{CONFIDENTIALITY_NOTICE}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


SIGNATURE


Signature: _______________________________________

{{FOUNDER_NAME}}
Founder, {{COMPANY_NAME}}

Date: {{SIGNATURE_DATE}}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIDENTIAL - FOR INSTITUTIONAL INVESTORS ONLY
© {{YEAR}} {{COMPANY_NAME}}. All Rights Reserved.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

function getStyleRequests(type: string): any[] {
  return [];
}

const financialReplacements: Record<string, string> = {
  '{{NAME}}': 'Clarence Fuqua Bey',
  '{{INDIGENOUS_TITLE}}': 'Hasan Sa\'Raam Bey Al-Moabiyah',
  '{{EMAIL}}': 'clarence@axiomprotocol.app',
  '{{EMPLOYMENT}}': 'Independent Contractor – Stevens Transport\nFounder – Axiom Protocol',
  '{{DATE}}': 'December 2026',
  '{{CHECKING}}': '[To Be Completed]',
  '{{SAVINGS}}': '[To Be Completed]',
  '{{BUSINESS_ACCOUNT}}': '$300.00',
  '{{CASH_SUBTOTAL}}': '$300.00+',
  '{{AXM_QUANTITY}}': '200,000,000 @ $0.00033',
  '{{AXM_VALUE}}': '$66,000.00',
  '{{BITCOIN}}': '[To Be Completed]',
  '{{ETHEREUM}}': '[To Be Completed]',
  '{{INVESTMENT_SUBTOTAL}}': '$66,000.00+',
  '{{BUSINESS_NAME}}': 'Axiom Protocol',
  '{{OWNERSHIP}}': '100%',
  '{{BUSINESS_VALUATION}}': '$18,700,000.00',
  '{{VEHICLE}}': 'Personal Vehicle',
  '{{VEHICLE_VALUE}}': '[To Be Completed]',
  '{{OTHER_ASSETS}}': '[To Be Completed]',
  '{{TOTAL_ASSETS}}': '$18,766,000.00+',
  '{{CREDIT_CARDS}}': '[To Be Completed]',
  '{{BILLS}}': '[To Be Completed]',
  '{{TRUCK_LEASE}}': '$37,960.00',
  '{{LOAN_1}}': '$3,768.63',
  '{{LOAN_2}}': '$1,036.46',
  '{{TOTAL_LOANS}}': '$4,805.09',
  '{{TOTAL_LIABILITIES}}': '$42,765.09+',
  '{{NET_WORTH}}': '$18,723,235.00',
  '{{INCOME_SOURCE}}': 'Stevens Transport',
  '{{WEEKLY_INCOME}}': '$1,117.70',
  '{{MONTHLY_INCOME}}': '$4,838.56',
  '{{ANNUAL_INCOME}}': '$58,120.40',
  '{{BUSINESS_REVENUE}}': 'Pre-Revenue ($0)',
  '{{NOTE_1}}': 'Axiom Protocol valuation based on institutional-grade methodologies.',
  '{{NOTE_2}}': 'AXM tokens are separate digital assets and do not represent corporate equity.',
  '{{NOTE_3}}': 'Truck lease obligation is classified as liability, not asset.',
  '{{NOTE_4}}': 'AXM token valuation based on pre-TGE price of $0.00033 per token.',
  '{{NOTE_5}}': 'This document is private and confidential.',
  '{{SIGNATURE_DATE}}': ''
};

const investorReplacements: Record<string, string> = {
  '{{DATE}}': 'December 2026',
  '{{FOUNDER_NAME}}': 'Clarence Fuqua Bey',
  '{{COMPANY_NAME}}': 'Axiom Protocol',
  '{{COMPANY_DESCRIPTION}}': 'Axiom Protocol is a multi-chain RWA, DePIN, and decentralized financial infrastructure ecosystem built on 23 deployed and verified smart contracts on Arbitrum One.',
  '{{CONSERVATIVE_VALUATION}}': '$12,500,000.00',
  '{{BASE_VALUATION}}': '$18,700,000.00',
  '{{OPTIMISTIC_VALUATION}}': '$28,500,000.00',
  '{{VALUATION_TYPE}}': 'Pre-Revenue, Pre-TGE',
  '{{STAGE}}': 'Seed to Series A Equivalent',
  '{{SCORECARD_SCORE}}': '116.5%',
  '{{SCORECARD_VALUATION}}': '$20,970,000.00',
  '{{CONTRACT_COST}}': '$2,221,050.00',
  '{{APP_COST}}': '$850,000.00',
  '{{DOC_COST}}': '$200,000.00',
  '{{INFRA_COST}}': '$225,000.00',
  '{{TOTAL_DEV_COST}}': '$3,496,050.00',
  '{{IP_PREMIUM}}': '$10,488,150.00',
  '{{REPLICATION_VALUE}}': '$10,500,000.00',
  '{{COMPARABLE_RANGE}}': '$15,000,000.00 – $30,000,000.00',
  '{{PATENT_VALUE}}': '$4,500,000.00',
  '{{TRADE_SECRET_VALUE}}': '$2,000,000.00',
  '{{BRAND_VALUE}}': '$150,000.00',
  '{{TOTAL_IP_VALUE}}': '$6,650,000.00',
  '{{CONTRACT_COUNT}}': '23 contracts',
  '{{LINES_OF_CODE}}': '12,807+',
  '{{NETWORK}}': 'Arbitrum One',
  '{{PRODUCT_LIST}}': '• KeyGrow Tokenized Real Estate\n• National Bank of Axiom\n• Axiom DePIN Marketplace\n• Axiom DEX\n• Digital Identity Engine\n• Asset Token Engine',
  '{{CURRENT_NETWORK}}': 'Arbitrum One',
  '{{PLANNED_NETWORK}}': 'Universe Blockchain (L3)',
  '{{COMPLIANCE_LIST}}': '• ISO 20022 Financial Messaging Standard\n• GENIUS Act Alignment\n• Private Identity Registry',
  '{{TOKEN_NAME}}': 'AXM',
  '{{TOTAL_SUPPLY}}': '15,000,000,000',
  '{{FOUNDER_TOKENS}}': '200,000,000',
  '{{FOUNDER_PERCENT}}': '1.33%',
  '{{TOKEN_VALUE}}': '$0.00033',
  '{{FOUNDER_TOKEN_VALUE}}': '$66,000.00',
  '{{CIRCULATING_SUPPLY}}': '0 (Pre-TGE)',
  '{{TOKEN_LEGAL_NOTICE}}': 'AXM is a digital asset and does not represent corporate equity.',
  '{{MILESTONE_1}}': 'Token Generation Event (TGE)',
  '{{TARGET_1}}': 'Q1 2026',
  '{{MILESTONE_2}}': 'Smart Contract Audits',
  '{{TARGET_2}}': 'Q2-Q4 2026',
  '{{MILESTONE_3}}': 'First Tokenized Property',
  '{{TARGET_3}}': 'Post-TGE',
  '{{MILESTONE_4}}': 'DePIN Marketplace Revenue',
  '{{TARGET_4}}': 'Post-TGE',
  '{{MILESTONE_5}}': 'Strategic Partnerships',
  '{{TARGET_5}}': 'Ongoing',
  '{{MILESTONE_6}}': 'Team Expansion',
  '{{TARGET_6}}': 'Post-Funding',
  '{{RISK_1}}': 'Pre-revenue status',
  '{{MITIGATION_1}}': 'Multiple revenue streams planned',
  '{{RISK_2}}': 'Single-founder structure',
  '{{MITIGATION_2}}': 'Advisory board formation',
  '{{RISK_3}}': 'Pending audits',
  '{{MITIGATION_3}}': 'Q2-Q4 2026 audit schedule',
  '{{RISK_4}}': 'Regulatory uncertainty',
  '{{MITIGATION_4}}': 'ISO 20022 + GENIUS Act compliance',
  '{{RISK_5}}': 'Crypto market volatility',
  '{{MITIGATION_5}}': 'Diversified product portfolio',
  '{{INDIGENOUS_NAME}}': 'Hasan Sa\'Raam Bey Al-Moabiyah',
  '{{FOUNDER_ROLE}}': 'Founder and Lead Architect',
  '{{EXPERTISE_LIST}}': '• Blockchain Engineering\n• DePIN Systems Architecture\n• RWA Tokenization\n• Decentralized Finance\n• Identity Systems\n• Governance Design',
  '{{TIER_1_ACCESS}}': 'NDA + Summary Documents',
  '{{TIER_2_ACCESS}}': 'Technical Architecture + Compliance Documents',
  '{{TIER_3_ACCESS}}': 'Treasury Structure + Long-Term Financial Models',
  '{{CONFIDENTIALITY_NOTICE}}': 'This document is CONFIDENTIAL and restricted to approved institutional recipients only. Unauthorized distribution, reproduction, or disclosure is strictly prohibited.',
  '{{YEAR}}': '2026',
  '{{SIGNATURE_DATE}}': ''
};

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('    GOOGLE DOCS PROFESSIONAL TEMPLATE CREATION');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    
    console.log('Step 1: Creating Professional Financial Statement Template...');
    const financialTemplateId = await createProfessionalTemplate('financial');
    
    console.log('\nStep 2: Creating filled Personal Financial Statement from template...');
    const financialDoc = await copyTemplateAndFillData(
      financialTemplateId,
      'PERSONAL FINANCIAL STATEMENT - Clarence Fuqua Bey - December 2026',
      financialReplacements
    );
    
    console.log('\n───────────────────────────────────────────────────────────────────\n');
    
    console.log('Step 3: Creating Professional Investor Packet Template...');
    const investorTemplateId = await createProfessionalTemplate('investor');
    
    console.log('\nStep 4: Creating filled Investor Packet from template...');
    const investorDoc = await copyTemplateAndFillData(
      investorTemplateId,
      'AXIOM PROTOCOL - Institutional Investor Packet - December 2026',
      investorReplacements
    );
    
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('    DOCUMENTS CREATED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    
    console.log('TEMPLATES (reusable):');
    console.log(`  Financial Statement: https://docs.google.com/document/d/${financialTemplateId}/edit`);
    console.log(`  Investor Packet:     https://docs.google.com/document/d/${investorTemplateId}/edit`);
    
    console.log('\nFINAL DOCUMENTS (filled with your data):');
    console.log(`  Personal Financial Statement: ${financialDoc.url}`);
    console.log(`  Investor Packet:              ${investorDoc.url}`);
    
    console.log('\n═══════════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

main();
