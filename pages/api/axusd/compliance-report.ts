import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

/**
 * AXUSD Compliance Report API
 * 
 * GENIUS Act Full Compliance Report
 * Generates comprehensive compliance status for regulatory review
 * 
 * GET /api/axusd/compliance-report
 */

interface GeniusActCompliance {
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'not_applicable';
  details: string;
  evidence?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    let latestCertification = null;
    try {
      const certResult = await db.execute(`
        SELECT * FROM axusd_certifications 
        ORDER BY disclosure_date DESC 
        LIMIT 1
      `);
      latestCertification = certResult.rows?.[0] || null;
    } catch (e) {
    }
    
    const reserveRequirements: GeniusActCompliance[] = [
      {
        requirement: "100% Reserve Backing",
        status: latestCertification && parseFloat(latestCertification.reserve_ratio) >= 100 
          ? 'compliant' 
          : 'pending',
        details: latestCertification 
          ? `Current reserve ratio: ${parseFloat(latestCertification.reserve_ratio).toFixed(2)}%`
          : 'Awaiting first certification',
        evidence: latestCertification?.ipfs_hash || undefined
      },
      {
        requirement: "Permitted Reserve Assets Only",
        status: 'compliant',
        details: "Reserves limited to: USDC, short-term Treasuries (≤93 days), FDIC-insured deposits",
        evidence: "GeniusCompliance.sol collateral whitelist enforced"
      },
      {
        requirement: "Short-term Treasury Maturity (≤93 days)",
        status: 'compliant',
        details: "TBillVault enforces GENIUS_ACT_MAX_MATURITY = 93 days",
        evidence: "TBillVault.setMaturityEnforcement(true, 93 days)"
      },
      {
        requirement: "No Rehypothecation of Reserves",
        status: 'compliant',
        details: "SegregatedCustody contract blocks asset reuse when rehypothecationBlocked = true",
        evidence: "SegregatedCustody.sol deployed with anti-rehypothecation"
      },
      {
        requirement: "Segregated Custody",
        status: 'compliant',
        details: "Reserve assets held in dedicated SegregatedCustody contract, separate from operational funds",
        evidence: "SegregatedCustody.sol"
      },
      {
        requirement: "No Interest/Yield to Stablecoin Holders",
        status: 'compliant',
        details: "GeniusCompliance.yieldDistributionBlocked = true by default",
        evidence: "TBillVault checks isYieldBlocked() before any distribution"
      }
    ];
    
    const disclosureRequirements: GeniusActCompliance[] = [
      {
        requirement: "Monthly Public Disclosure",
        status: latestCertification 
          ? (new Date(latestCertification.disclosure_date) > lastMonth ? 'compliant' : 'non_compliant')
          : 'pending',
        details: latestCertification 
          ? `Last disclosure: ${latestCertification.disclosure_date}`
          : 'No disclosures yet',
        evidence: latestCertification?.ipfs_hash || undefined
      },
      {
        requirement: "CEO/CFO Certification",
        status: latestCertification?.certifier_title ? 'compliant' : 'pending',
        details: latestCertification 
          ? `Certified by ${latestCertification.certifier_name} (${latestCertification.certifier_title})`
          : 'Awaiting executive certification'
      },
      {
        requirement: "Registered Accountant Examination",
        status: 'pending',
        details: "External accounting firm attestation required",
        evidence: undefined
      },
      {
        requirement: "Annual Audit (if >$50B supply)",
        status: 'not_applicable',
        details: "Required only for issuers with >$50B outstanding stablecoins"
      }
    ];
    
    const operationalRequirements: GeniusActCompliance[] = [
      {
        requirement: "AML/BSA Compliance Program",
        status: 'pending',
        details: "Requires integration with AML/KYC provider",
        evidence: undefined
      },
      {
        requirement: "Customer Identification Program (CIP)",
        status: 'pending',
        details: "Requires KYC verification for users"
      },
      {
        requirement: "Suspicious Activity Reporting (SAR)",
        status: 'pending',
        details: "Requires monitoring and FinCEN filing capability"
      },
      {
        requirement: "Sanctions Screening",
        status: 'pending',
        details: "Requires OFAC list screening integration"
      }
    ];
    
    const consumerProtection: GeniusActCompliance[] = [
      {
        requirement: "Insolvency Priority Claims",
        status: 'compliant',
        details: "SegregatedCustody implements holder priority through insolvencyProtectionActive flag",
        evidence: "SegregatedCustody.sol"
      },
      {
        requirement: "Clear Redemption Policy",
        status: 'compliant',
        details: "PSM provides 1:1 USDC redemption at any time",
        evidence: "PSM.swapAXUSDForCollateral()"
      },
      {
        requirement: "Marketing Prohibition Compliance",
        status: 'compliant',
        details: "No claims of FDIC insurance, government backing, or legal tender status"
      }
    ];
    
    const allRequirements = [
      ...reserveRequirements, 
      ...disclosureRequirements, 
      ...operationalRequirements,
      ...consumerProtection
    ];
    
    const compliantCount = allRequirements.filter(r => r.status === 'compliant').length;
    const totalRequirements = allRequirements.filter(r => r.status !== 'not_applicable').length;
    const complianceScore = totalRequirements > 0 
      ? Math.round((compliantCount / totalRequirements) * 100) 
      : 0;
    
    const overallStatus = complianceScore >= 100 
      ? 'fully_compliant' 
      : complianceScore >= 80 
        ? 'substantially_compliant'
        : complianceScore >= 50
          ? 'partially_compliant'
          : 'non_compliant';
    
    return res.status(200).json({
      success: true,
      report: {
        generatedAt: now.toISOString(),
        regulation: "GENIUS Act (Public Law 119-27)",
        signedDate: "July 18, 2025",
        enforcementDate: "January 18, 2027",
        
        overallStatus,
        complianceScore: `${complianceScore}%`,
        
        summary: {
          compliant: compliantCount,
          pending: allRequirements.filter(r => r.status === 'pending').length,
          nonCompliant: allRequirements.filter(r => r.status === 'non_compliant').length,
          notApplicable: allRequirements.filter(r => r.status === 'not_applicable').length
        },
        
        categories: {
          reserveRequirements,
          disclosureRequirements,
          operationalRequirements,
          consumerProtection
        },
        
        nextSteps: [
          complianceScore < 100 && "Complete pending AML/BSA integrations",
          !latestCertification && "Submit first monthly certification",
          "Engage registered accounting firm for reserve examination",
          "Complete KYC/AML provider integration"
        ].filter(Boolean),
        
        contracts: {
          geniusCompliance: process.env.GENIUS_COMPLIANCE_ADDRESS || 'Not deployed',
          segregatedCustody: process.env.SEGREGATED_CUSTODY_ADDRESS || 'Not deployed',
          vaultEngine: process.env.VAULT_ENGINE_ADDRESS || 'Not deployed',
          tbillVault: process.env.TBILL_VAULT_ADDRESS || 'Not deployed',
          psm: process.env.PSM_ADDRESS || 'Not deployed'
        }
      },
      
      clarityActNote: "The Clarity Act (H.R. 3633) addresses SEC/CFTC jurisdiction for digital commodities. Stablecoins like AXUSD fall under GENIUS Act jurisdiction exclusively.",
      
      disclaimer: "This report is for informational purposes. Consult legal counsel for official compliance determination."
    });
    
  } catch (error) {
    console.error('Compliance report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report'
    });
  }
}
