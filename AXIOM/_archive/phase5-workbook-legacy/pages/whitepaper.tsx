import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  accent: '#7B68EE',
  dark: '#121212',
  muted: 'rgba(18, 18, 18, 0.7)',
  border: 'rgba(0, 0, 0, 0.08)',
};

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function WhitepaperPage() {
  const [activeSection, setActiveSection] = useState('executive-summary');

  const sections: Section[] = [
    {
      id: 'executive-summary',
      title: '1. Executive Summary',
      content: (
        <>
          <p>
            Axiom Protocol introduces a land-first economic model that transforms how communities acquire, 
            develop, and own real estate. Instead of treating land as one feature among many, we place 
            land acquisition at the center of everything we build.
          </p>
          <p>
            Our thesis is simple: <strong>Communities that control land control their future.</strong>
          </p>
          <p>
            The KeyGrow Program enables everyday people to participate in land ownership through three 
            integrated pathways: SEC-compliant crowdfunding (Reg CF), SUSU-style community pooling, 
            and tokenized land options. Each pathway removes traditional barriers to land investment 
            while maintaining full regulatory compliance.
          </p>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1), rgba(123, 104, 238, 0.1))',
            borderRadius: 16,
            padding: 24,
            margin: '24px 0'
          }}>
            <h4 style={{ margin: '0 0 16px', color: theme.primary }}>Core Principles</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><strong>Land First:</strong> Every protocol feature serves the mission of community land acquisition</li>
              <li><strong>Zero Barrier Entry:</strong> Invest with as little as $100 through compliant pathways</li>
              <li><strong>Community Stewardship:</strong> Local stewards evaluate, activate, and manage land projects</li>
              <li><strong>On-Chain Transparency:</strong> All ownership, votes, and transactions are verifiable</li>
              <li><strong>Regulatory Compliance:</strong> SEC Reg CF, proper disclosures, investor protections</li>
            </ul>
          </div>
        </>
      )
    },
    {
      id: 'problem',
      title: '2. The Problem',
      content: (
        <>
          <h3>Land Ownership is Broken</h3>
          <p>
            For generations, land ownership has been the foundation of wealth creation. Yet today, 
            the path to land ownership is blocked for most Americans:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, margin: '24px 0' }}>
            {[
              { title: 'High Capital Requirements', desc: 'Down payments of 20-30% plus closing costs exclude most first-time buyers' },
              { title: 'Fragmented Information', desc: 'Land deals happen in private networks inaccessible to everyday people' },
              { title: 'Complex Due Diligence', desc: 'Zoning, surveys, environmental studies require expertise most lack' },
              { title: 'Illiquid Investments', desc: 'Once purchased, land is difficult to sell or fractionalize' },
              { title: 'No Community Pooling', desc: 'No legal structures for groups to pool capital for land acquisition' },
              { title: 'Regulatory Barriers', desc: 'Securities laws make fractional real estate investment complex' }
            ].map((item, i) => (
              <div key={i} style={{
                background: '#fff',
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 20
              }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 16, color: theme.dark }}>{item.title}</h4>
                <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <h3>The Result</h3>
          <p>
            Wealth inequality grows as land concentrates in fewer hands. Communities lose control of 
            their neighborhoods. Generational wealth-building through land ownership becomes a privilege 
            rather than an opportunity.
          </p>
        </>
      )
    },
    {
      id: 'solution',
      title: '3. The Solution: KeyGrow Program',
      content: (
        <>
          <p>
            The KeyGrow Program is Axiom's land-first solution. It creates a complete pipeline from 
            land sourcing to community ownership, with each stage designed for accessibility and compliance.
          </p>
          
          <h3>The Land Acquisition Flywheel</h3>
          <div style={{
            background: '#f8fafc',
            borderRadius: 16,
            padding: 24,
            margin: '24px 0'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { step: 1, title: 'Property Sourcing', desc: 'Landowners submit properties or stewards import listings from Zillow, Realtor, Redfin, LoopNet, LandWatch' },
                { step: 2, title: 'Admin Review', desc: 'Protocol admins verify property data, assess opportunity quality, and score leads' },
                { step: 3, title: 'Steward Assignment', desc: 'Local stewards are assigned to conduct on-ground due diligence' },
                { step: 4, title: 'Steward Evaluation', desc: 'Stewards submit detailed reports: site visits, risk assessments, development potential' },
                { step: 5, title: 'Community Vote', desc: 'Token holders vote on whether to proceed with acquisition' },
                { step: 6, title: 'Final Approval', desc: 'Approved properties become tokenized land options available for investment' }
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: theme.primary,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>{item.step}</div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{item.title}</h4>
                    <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h3>Three Paths to Participation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, margin: '24px 0' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1), rgba(0, 212, 170, 0.05))',
              borderRadius: 16,
              padding: 24,
              border: `2px solid ${theme.primary}`
            }}>
              <h4 style={{ margin: '0 0 12px', color: theme.primary }}>Reg CF Crowdfunding</h4>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: theme.muted }}>
                SEC-compliant crowdfunding campaigns for individual land projects. Invest $100-$124,000 
                based on your income and net worth.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: theme.dark }}>
                <li>Full SEC compliance</li>
                <li>KYC verification</li>
                <li>Risk disclosures</li>
                <li>48-hour cancellation right</li>
              </ul>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05))',
              borderRadius: 16,
              padding: 24,
              border: `2px solid ${theme.secondary}`
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#B8860B' }}>SUSU Pooling</h4>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: theme.muted }}>
                Community savings circles inspired by traditional rotating savings groups. Pool monthly 
                contributions toward specific land acquisitions.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: theme.dark }}>
                <li>Monthly contributions</li>
                <li>Community governance</li>
                <li>Insurance fund protection</li>
                <li>Shared ownership</li>
              </ul>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.1), rgba(123, 104, 238, 0.05))',
              borderRadius: 16,
              padding: 24,
              border: `2px solid ${theme.accent}`
            }}>
              <h4 style={{ margin: '0 0 12px', color: theme.accent }}>Land Option Tokens</h4>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: theme.muted }}>
                ERC-1155 tokens representing fractional ownership rights in land acquisition options. 
                Trade, hold, or use as collateral.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: theme.dark }}>
                <li>Fractional ownership</li>
                <li>On-chain verification</li>
                <li>Transferable rights</li>
                <li>DeFi composability</li>
              </ul>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'steward-corps',
      title: '4. Steward Corps',
      content: (
        <>
          <p>
            The Steward Corps is Axiom's distributed network of local leaders who bridge digital 
            protocol operations with on-ground land activation. Stewards are the human layer that 
            makes community land acquisition possible.
          </p>

          <h3>Steward Responsibilities</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, margin: '24px 0' }}>
            {[
              { icon: '🔍', title: 'Due Diligence', desc: 'Site visits, neighbor interviews, infrastructure assessment' },
              { icon: '📋', title: 'Evaluation Reports', desc: 'Detailed risk scores, development potential, market analysis' },
              { icon: '🤝', title: 'Landowner Relations', desc: 'Negotiate terms, manage communications, build trust' },
              { icon: '🌱', title: 'Land Activation', desc: 'Oversee initial development, community engagement, progress updates' },
              { icon: '📊', title: 'Progress Reporting', desc: 'Weekly updates, milestone tracking, issue escalation' },
              { icon: '🗳️', title: 'Governance Participation', desc: 'Vote on proposals, represent regional interests' }
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 12,
                padding: 16,
                background: '#f8fafc',
                borderRadius: 12
              }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: 13, color: theme.muted }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3>5-Stage Selection Process</h3>
          <p>
            Stewards undergo a rigorous selection process to ensure quality and commitment:
          </p>
          <ol style={{ paddingLeft: 20 }}>
            <li><strong>Application:</strong> Submit background, experience, and regional expertise</li>
            <li><strong>Interview:</strong> Video call assessment of communication and judgment</li>
            <li><strong>Training:</strong> Complete Axiom stewardship curriculum</li>
            <li><strong>Probation:</strong> 90-day trial period with mentor oversight</li>
            <li><strong>Activation:</strong> Full steward status with regional assignment</li>
          </ol>

          <h3>Steward Compensation</h3>
          <p>
            Stewards earn through multiple channels: per-evaluation fees, successful acquisition bonuses, 
            ongoing management fees for activated land, and AXM token incentives for exceptional performance.
          </p>
        </>
      )
    },
    {
      id: 'tokenization',
      title: '5. Tokenization & Settlement',
      content: (
        <>
          <h3>LandOptionRegistry (ERC-1155)</h3>
          <p>
            The LandOptionRegistry smart contract tokenizes approved land acquisition opportunities 
            as ERC-1155 tokens. Each token represents a fractional ownership right in a specific 
            land option.
          </p>
          <div style={{
            background: '#1a1a2e',
            borderRadius: 12,
            padding: 20,
            margin: '24px 0',
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#e2e8f0',
            overflow: 'auto'
          }}>
            <pre style={{ margin: 0 }}>{`contract LandOptionRegistry is ERC1155, Ownable {
    struct LandOption {
        string propertyId;
        string location;
        uint256 totalShares;
        uint256 pricePerShare;
        uint256 optionExpiry;
        bool active;
    }
    
    mapping(uint256 => LandOption) public landOptions;
    
    function createLandOption(...) external onlyOwner;
    function purchaseShares(uint256 tokenId, uint256 amount) external;
    function exerciseOption(uint256 tokenId) external;
}`}</pre>
          </div>

          <h3>AXUSD Settlement Layer</h3>
          <p>
            All land transactions settle in AXUSD, Axiom's hybrid stablecoin. AXUSD provides:
          </p>
          <ul>
            <li><strong>Price Stability:</strong> Pegged to USD through CDP + PSM mechanism</li>
            <li><strong>On-Chain Settlement:</strong> Instant, verifiable transactions</li>
            <li><strong>DeFi Integration:</strong> Composable with other protocol features</li>
            <li><strong>Yield Generation:</strong> T-Bill backing provides organic yield</li>
          </ul>

          <h3>Token Flow</h3>
          <div style={{
            background: '#f8fafc',
            borderRadius: 16,
            padding: 24,
            margin: '24px 0',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '8px 16px', background: theme.primary, color: '#fff', borderRadius: 8 }}>Investor AXUSD</span>
              <span style={{ color: theme.muted }}>→</span>
              <span style={{ padding: '8px 16px', background: theme.secondary, color: '#000', borderRadius: 8 }}>Land Option Purchase</span>
              <span style={{ color: theme.muted }}>→</span>
              <span style={{ padding: '8px 16px', background: theme.accent, color: '#fff', borderRadius: 8 }}>ERC-1155 Token</span>
              <span style={{ color: theme.muted }}>→</span>
              <span style={{ padding: '8px 16px', background: theme.dark, color: '#fff', borderRadius: 8 }}>Land Ownership</span>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'compliance',
      title: '6. SEC Reg CF Compliance',
      content: (
        <>
          <p>
            Axiom operates under SEC Regulation Crowdfunding (Reg CF), enabling compliant securities 
            offerings for land acquisition. This provides investor protection while democratizing 
            access to real estate investment.
          </p>

          <h3>Investment Limits</h3>
          <div style={{
            background: '#f8fafc',
            borderRadius: 16,
            padding: 24,
            margin: '24px 0'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: `2px solid ${theme.border}` }}>Investor Type</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: `2px solid ${theme.border}` }}>Annual Limit</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: `2px solid ${theme.border}` }}>Calculation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>Non-Accredited (income & net worth &lt; $124K)</td>
                  <td style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>Up to $6,200</td>
                  <td style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>Greater of $2,500 or 5% of greater of income/net worth</td>
                </tr>
                <tr>
                  <td style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>Non-Accredited (income or net worth ≥ $124K)</td>
                  <td style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>Up to $124,000</td>
                  <td style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>10% of lesser of income or net worth</td>
                </tr>
                <tr>
                  <td style={{ padding: 12 }}>Accredited Investor</td>
                  <td style={{ padding: 12 }}>No individual limit</td>
                  <td style={{ padding: 12 }}>Subject only to offering's $5M cap</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Required Disclosures</h3>
          <p>
            Before investing, all participants must acknowledge six mandatory risk disclosures:
          </p>
          <ol>
            <li><strong>Risk of Loss:</strong> Investment may result in complete loss of principal</li>
            <li><strong>Illiquidity:</strong> Securities have no public market and may be difficult to sell</li>
            <li><strong>No Guarantee:</strong> Projected returns are estimates only, not promises</li>
            <li><strong>Cancellation Right:</strong> 48-hour cancellation window before offering closes</li>
            <li><strong>Reg CF Limits:</strong> Annual limits apply across all Reg CF investments</li>
            <li><strong>Development Risk:</strong> Land projects face zoning, permitting, and market risks</li>
          </ol>

          <h3>KYC Verification</h3>
          <p>
            All investors complete identity verification including:
          </p>
          <ul>
            <li>Full legal name and date of birth</li>
            <li>Annual income and net worth for limit calculation</li>
            <li>Last 4 digits of SSN for identity confirmation</li>
            <li>Employment status and investment experience</li>
          </ul>
          <p>
            All acknowledgments are logged with IP address and timestamp for audit purposes.
          </p>
        </>
      )
    },
    {
      id: 'governance',
      title: '7. Governance Model',
      content: (
        <>
          <p>
            Axiom governance ensures community control over land acquisition decisions while 
            maintaining operational efficiency. The model combines token-weighted voting with 
            steward expertise.
          </p>

          <h3>Governance Layers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, margin: '24px 0' }}>
            <div style={{
              background: '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 20
            }}>
              <h4 style={{ margin: '0 0 12px', color: theme.primary }}>Community Voting</h4>
              <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>
                AXM token holders vote on land acquisition proposals. Voting power is proportional 
                to token holdings, with SEED stakers receiving additional weight.
              </p>
            </div>
            <div style={{
              background: '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 20
            }}>
              <h4 style={{ margin: '0 0 12px', color: theme.secondary }}>Steward Council</h4>
              <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>
                Senior stewards form a council that reviews proposals, provides expert recommendations, 
                and can veto clearly problematic acquisitions.
              </p>
            </div>
            <div style={{
              background: '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 20
            }}>
              <h4 style={{ margin: '0 0 12px', color: theme.accent }}>Protocol Multisig</h4>
              <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>
                A 4-of-7 multisig executes approved proposals, manages treasury, and handles 
                emergency situations requiring rapid response.
              </p>
            </div>
          </div>

          <h3>Proposal Process</h3>
          <ol>
            <li>Steward submits land evaluation report with recommendation</li>
            <li>7-day community discussion period</li>
            <li>5-day voting period (simple majority required)</li>
            <li>48-hour timelock before execution</li>
            <li>Multisig executes approved acquisition</li>
          </ol>
        </>
      )
    },
    {
      id: 'tokenomics',
      title: '8. Tokenomics',
      content: (
        <>
          <h3>AXM Token</h3>
          <p>
            AXM is the governance and utility token of Axiom Protocol. It aligns incentives across 
            all participants in the land acquisition ecosystem.
          </p>

          <div style={{
            background: '#f8fafc',
            borderRadius: 16,
            padding: 24,
            margin: '24px 0'
          }}>
            <h4 style={{ margin: '0 0 16px' }}>Token Utility</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { title: 'Governance', desc: 'Vote on land acquisitions and protocol upgrades' },
                { title: 'Staking (SEED)', desc: 'Lock AXM for enhanced voting power and yield' },
                { title: 'Fee Discounts', desc: 'Reduced platform fees for AXM holders' },
                { title: 'Steward Rewards', desc: 'Stewards earn AXM for successful evaluations' }
              ].map((item, i) => (
                <div key={i} style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
                  <h5 style={{ margin: '0 0 4px', fontSize: 14 }}>{item.title}</h5>
                  <p style={{ margin: 0, fontSize: 13, color: theme.muted }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <h3>AXUSD Stablecoin</h3>
          <p>
            AXUSD is the settlement currency for all land transactions. Its hybrid design combines:
          </p>
          <ul>
            <li><strong>Collateralized Debt Positions (CDP):</strong> Mint AXUSD by depositing collateral</li>
            <li><strong>Peg Stability Module (PSM):</strong> 1:1 swaps with approved stablecoins</li>
            <li><strong>T-Bill Vault:</strong> Protocol reserves backed by US Treasury Bills</li>
          </ul>

          <h3>Value Accrual</h3>
          <p>
            Protocol fees from land transactions flow to:
          </p>
          <ul>
            <li>40% - SEED stakers (proportional to locked AXM)</li>
            <li>30% - Treasury for operations and development</li>
            <li>20% - Steward rewards pool</li>
            <li>10% - AXM buyback and burn</li>
          </ul>
        </>
      )
    },
    {
      id: 'roadmap',
      title: '9. Roadmap',
      content: (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, margin: '24px 0' }}>
            {[
              {
                phase: 'Phase 1: Foundation',
                status: 'Complete',
                items: [
                  'Core smart contracts deployed on Arbitrum One',
                  'Property submission and import system',
                  '6-stage approval workflow',
                  'SEC Reg CF compliance framework',
                  'Steward application and onboarding'
                ]
              },
              {
                phase: 'Phase 2: Growth',
                status: 'In Progress',
                items: [
                  'First 10 land acquisitions',
                  'SUSU pooling launch',
                  'Social campaign and referral system',
                  'Regional steward expansion',
                  'Mobile app beta'
                ]
              },
              {
                phase: 'Phase 3: Scale',
                status: 'Planned',
                items: [
                  '100+ land options tokenized',
                  'Cross-chain deployment (Universe L3)',
                  'Institutional investor partnerships',
                  'Secondary market for land tokens',
                  'International expansion'
                ]
              },
              {
                phase: 'Phase 4: Ecosystem',
                status: 'Vision',
                items: [
                  'First Axiom community development breaks ground',
                  'DePIN infrastructure on acquired land',
                  'Inter-community economic network',
                  'Full protocol decentralization',
                  'Model replication by other communities'
                ]
              }
            ].map((phase, i) => (
              <div key={i} style={{
                background: '#fff',
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 24,
                borderLeft: `4px solid ${
                  phase.status === 'Complete' ? theme.primary :
                  phase.status === 'In Progress' ? theme.secondary :
                  phase.status === 'Planned' ? theme.accent : theme.muted
                }`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0 }}>{phase.phase}</h4>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: phase.status === 'Complete' ? 'rgba(0, 212, 170, 0.1)' :
                               phase.status === 'In Progress' ? 'rgba(255, 215, 0, 0.2)' :
                               'rgba(0, 0, 0, 0.05)',
                    color: phase.status === 'Complete' ? theme.primary :
                           phase.status === 'In Progress' ? '#B8860B' : theme.muted
                  }}>{phase.status}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {phase.items.map((item, j) => (
                    <li key={j} style={{ marginBottom: 4, fontSize: 14, color: theme.muted }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )
    },
    {
      id: 'get-started',
      title: '10. Get Started',
      content: (
        <>
          <p>
            Join the land-first movement today. Whether you're a landowner, investor, or aspiring 
            steward, there's a path for you.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, margin: '24px 0' }}>
            <Link href="/landowners/submit" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, #00D4AA, #00B894)',
                borderRadius: 16,
                padding: 24,
                color: '#fff',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}>
                <h4 style={{ margin: '0 0 8px' }}>Submit Property</h4>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
                  Own land? Submit it for community acquisition consideration.
                </p>
              </div>
            </Link>
            <Link href="/land-acquisition" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                borderRadius: 16,
                padding: 24,
                color: '#000',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}>
                <h4 style={{ margin: '0 0 8px' }}>Invest in Land</h4>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>
                  Browse active campaigns and pool with your community.
                </p>
              </div>
            </Link>
            <Link href="/stewards/apply" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, #7B68EE, #6C5CE7)',
                borderRadius: 16,
                padding: 24,
                color: '#fff',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}>
                <h4 style={{ margin: '0 0 8px' }}>Become a Steward</h4>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
                  Lead your region's land acquisition efforts.
                </p>
              </div>
            </Link>
          </div>

          <div style={{
            background: '#f8fafc',
            borderRadius: 16,
            padding: 24,
            marginTop: 32,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px' }}>Communities that control land control their future.</h3>
            <p style={{ margin: 0, color: theme.muted }}>
              Join Axiom and build wealth together, on-chain.
            </p>
          </div>
        </>
      )
    }
  ];

  return (
    <>
      <Head>
        <title>Whitepaper | Axiom Protocol - Land First</title>
        <meta name="description" content="Axiom Protocol Whitepaper: A land-first economic model for community land acquisition through SEC-compliant crowdfunding, SUSU pooling, and tokenized ownership." />
      </Head>

      <main style={{ background: '#fff', minHeight: '100vh' }}>
        <section style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          padding: '80px 24px 60px',
          color: '#fff',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              background: 'rgba(0, 212, 170, 0.2)',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 500,
              color: theme.primary,
              marginBottom: 16
            }}>
              Version 2.0 - Land First
            </div>
            <h1 style={{ 
              margin: '0 0 16px',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 700
            }}>
              Axiom Protocol Whitepaper
            </h1>
            <p style={{ 
              margin: 0,
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              opacity: 0.8,
              lineHeight: 1.6
            }}>
              Community-powered land acquisition through tokenization, stewardship, 
              and SEC-compliant crowdfunding.
            </p>
          </div>
        </section>

        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '40px 24px',
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 40
        }}>
          <nav style={{
            position: 'sticky',
            top: 100,
            alignSelf: 'start',
            background: '#f8fafc',
            borderRadius: 16,
            padding: 16,
            maxHeight: 'calc(100vh - 140px)',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, color: theme.muted, textTransform: 'uppercase' }}>
              Contents
            </h3>
            {sections.map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSection(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  textDecoration: 'none',
                  color: activeSection === section.id ? theme.primary : theme.dark,
                  background: activeSection === section.id ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
                  fontWeight: activeSection === section.id ? 600 : 400,
                  marginBottom: 4,
                  transition: 'all 0.2s'
                }}
              >
                {section.title}
              </a>
            ))}
          </nav>

          <article>
            {sections.map(section => (
              <section
                key={section.id}
                id={section.id}
                style={{
                  marginBottom: 48,
                  paddingBottom: 48,
                  borderBottom: `1px solid ${theme.border}`
                }}
              >
                <h2 style={{ 
                  margin: '0 0 24px',
                  fontSize: 28,
                  fontWeight: 700,
                  color: theme.dark
                }}>
                  {section.title}
                </h2>
                <div style={{ 
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: theme.dark
                }}>
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>

        <style jsx global>{`
          @media (max-width: 900px) {
            main > div {
              grid-template-columns: 1fr !important;
            }
            nav {
              position: relative !important;
              top: 0 !important;
            }
          }
        `}</style>
      </main>
    </>
  );
}
