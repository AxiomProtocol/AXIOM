import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  accent: '#7B68EE',
  dark: '#0a0a0a',
  muted: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

interface DealData {
  propertyType: string;
  acquisitionStructure: string;
  capitalNeed: string;
  exitStrategy: string;
  timeline: string;
  dealValue: string;
  partnerRole: string;
  hasExistingCashflow: boolean;
}

interface ProductRecommendation {
  primary: string;
  secondary: string[];
  protection: string[];
  compliance: string;
  estimatedTerms: {
    ltv: string;
    rate: string;
    duration: string;
    minInvestment: string;
  };
  timeline: string;
  description: string;
}

const steps = [
  { id: 'property', title: 'Property Type', subtitle: 'What are you acquiring?' },
  { id: 'acquisition', title: 'Acquisition', subtitle: 'How are you acquiring it?' },
  { id: 'capital', title: 'Capital Need', subtitle: 'What funding do you need?' },
  { id: 'exit', title: 'Exit Strategy', subtitle: 'What\'s your plan?' },
  { id: 'details', title: 'Deal Details', subtitle: 'A few more specifics' },
  { id: 'results', title: 'Your Stack', subtitle: 'Recommended products' },
];

const propertyOptions = [
  { value: 'residential', label: 'Residential (1-4 units)', icon: '🏠', description: 'Single family, duplex, triplex, quadplex' },
  { value: 'multifamily', label: 'Small Multifamily (5-20 units)', icon: '🏢', description: 'Apartment buildings, mixed-use' },
  { value: 'commercial', label: 'Commercial', icon: '🏬', description: 'Retail, office, industrial' },
  { value: 'land', label: 'Land', icon: '🌍', description: 'Raw land, entitled, development' },
  { value: 'agricultural', label: 'Agricultural', icon: '🌾', description: 'Farmland, timber, ranches' },
];

const acquisitionOptions = [
  { value: 'subject-to', label: 'Subject-To', icon: '📋', description: 'Taking over existing mortgage' },
  { value: 'seller-finance', label: 'Seller Finance', icon: '🤝', description: 'Owner carrying the note' },
  { value: 'cash-purchase', label: 'Cash Purchase', icon: '💵', description: 'Need acquisition capital' },
  { value: 'option', label: 'Option / Assignment', icon: '📄', description: 'Contract assignment or lease option' },
  { value: 'already-own', label: 'Already Own', icon: '🔑', description: 'Refinance or restructure' },
];

const capitalOptions = [
  { value: 'acquisition', label: 'Acquisition Only', icon: '🎯', description: 'Purchase price capital' },
  { value: 'acquisition-rehab', label: 'Acquisition + Rehab', icon: '🔨', description: 'Purchase plus renovation' },
  { value: 'rehab-only', label: 'Rehab / Construction', icon: '🏗️', description: 'Already own, need build capital' },
  { value: 'working-capital', label: 'Working Capital', icon: '💼', description: 'Operating funds' },
  { value: 'refinance', label: 'Refinance / Cash-Out', icon: '🔄', description: 'Pull equity or restructure' },
  { value: 'none', label: 'No Capital Needed', icon: '✅', description: 'Just servicing and protection' },
];

const exitOptions = [
  { value: 'flip', label: 'Flip', icon: '⚡', description: 'Sell within 18 months' },
  { value: 'brrrr', label: 'BRRRR', icon: '🔁', description: 'Rehab → Rent → Refinance' },
  { value: 'buy-hold', label: 'Buy & Hold', icon: '🏦', description: 'Long-term rental' },
  { value: 'develop-sell', label: 'Develop & Sell', icon: '🏗️', description: 'Build and exit' },
  { value: 'land-bank', label: 'Land Bank', icon: '📈', description: 'Hold for appreciation' },
  { value: 'owner-finance', label: 'Owner Finance', icon: '📝', description: 'Sell with seller financing' },
];

const dealValueOptions = [
  { value: 'under-100k', label: 'Under $100K' },
  { value: '100k-250k', label: '$100K - $250K' },
  { value: '250k-500k', label: '$250K - $500K' },
  { value: '500k-1m', label: '$500K - $1M' },
  { value: '1m-5m', label: '$1M - $5M' },
  { value: 'over-5m', label: '$5M+' },
];

const timelineOptions = [
  { value: 'immediate', label: 'Immediate', description: 'Deal under contract now' },
  { value: '30-60', label: '30-60 Days', description: 'Active negotiation' },
  { value: '90-plus', label: '90+ Days', description: 'Pipeline deal' },
];

const partnerRoleOptions = [
  { value: 'operator', label: 'Operator Only', description: 'Managing the deal, not investing' },
  { value: 'operator-investor', label: 'Operator + Investor', description: 'Managing and co-investing' },
  { value: 'syndicator', label: 'Syndicator', description: 'Raising from your network' },
];

function getProductRecommendation(deal: DealData): ProductRecommendation {
  let primary = '';
  let secondary: string[] = [];
  let protection: string[] = [];
  let compliance = 'SEC Reg D 506(c)';
  let estimatedTerms = {
    ltv: '70%',
    rate: '10-14%',
    duration: '6-18 months',
    minInvestment: '$25,000',
  };
  let timeline = '7-14 days';
  let description = '';

  const isSmallDeal = ['under-100k', '100k-250k'].includes(deal.dealValue);
  const isMidDeal = ['250k-500k', '500k-1m'].includes(deal.dealValue);
  const isLargeDeal = ['1m-5m', 'over-5m'].includes(deal.dealValue);
  const isUrgent = deal.timeline === 'immediate';
  const isPipeline = deal.timeline === '90-plus';

  if (deal.propertyType === 'land') {
    if (isSmallDeal || isMidDeal) {
      primary = 'Community Land Funds';
      compliance = 'SEC Reg CF';
      estimatedTerms = {
        ltv: 'N/A',
        rate: 'Equity participation',
        duration: '24-60 months',
        minInvestment: '$100',
      };
      description = 'Crowdfunded land acquisition with community governance and Steward evaluation.';
    } else {
      primary = 'Community Land Funds';
      compliance = 'SEC Reg D 506(c)';
      estimatedTerms = {
        ltv: 'N/A',
        rate: 'Equity participation',
        duration: '24-60 months',
        minInvestment: '$25,000',
      };
      description = 'Private placement land acquisition with accredited investor participation.';
    }
    timeline = '30-45 days';
    protection = ['Steward due diligence', 'Community vote', 'Escrow protection'];
    
    if (deal.exitStrategy === 'develop-sell') {
      secondary = ['Builder & Farmer Credit'];
      description += ' Phased development capital available after acquisition.';
    }
  } else if (deal.acquisitionStructure === 'subject-to') {
    primary = 'Rent Streams';
    secondary = ['Insurance Pool'];
    estimatedTerms = {
      ltv: 'N/A (no acquisition capital)',
      rate: '6-9% yield to investors',
      duration: 'Ongoing',
      minInvestment: isSmallDeal ? '$500' : '$1,000',
    };
    timeline = '14-21 days';
    description = 'Tokenize rental cash flow for investor participation. No acquisition capital needed—Axiom provides servicing, reserves, and protection.';
    protection = ['6-month PITI reserves', 'Payment gap insurance', 'Default protection'];
    
    if (deal.exitStrategy === 'flip') {
      secondary.unshift('AXUSD Real Estate Lending Fund');
      description = 'Subject-To acquisition with rehab capital from Lending Fund. Rent Streams layer provides ongoing protection until sale.';
      timeline = '7-14 days';
    } else if (deal.capitalNeed !== 'none' && deal.capitalNeed !== 'acquisition') {
      secondary.unshift('AXUSD Credit Lines');
      description += ' Credit line available against property equity.';
    }

    if (isSmallDeal) {
      compliance = 'SEC Reg CF';
      estimatedTerms.minInvestment = '$100';
    }
  } else if (deal.acquisitionStructure === 'seller-finance') {
    primary = 'Mortgage Notes';
    secondary = ['Rent Streams'];
    estimatedTerms = {
      ltv: '65%',
      rate: '10-14% APY',
      duration: 'Note term',
      minInvestment: isSmallDeal ? '$5,000' : '$10,000',
    };
    timeline = '14-21 days';
    description = 'Fractional participation in the seller-financed note. First-lien position with monthly distributions.';
    protection = ['First-lien position', 'Payment reserves', 'Default procedures'];

    if (isSmallDeal) {
      compliance = 'SEC Reg CF';
      estimatedTerms.minInvestment = '$100';
    }
  } else if (deal.acquisitionStructure === 'option') {
    primary = 'Community Land Funds';
    secondary = ['AXUSD Real Estate Lending Fund'];
    estimatedTerms = {
      ltv: 'N/A (option)',
      rate: 'Equity + debt hybrid',
      duration: 'Option term + execution',
      minInvestment: isSmallDeal ? '$100' : '$10,000',
    };
    timeline = '21-30 days';
    description = 'Option/assignment deals can be structured through Land Funds for crowdfunding or Lending Fund for execution capital.';
    protection = ['Option escrow', 'Assignment documentation', 'Title verification'];
    compliance = isSmallDeal ? 'SEC Reg CF' : 'SEC Reg D 506(c)';
  } else if (deal.acquisitionStructure === 'already-own') {
    if (deal.capitalNeed === 'refinance') {
      primary = 'DSCR Refinance';
      secondary = ['Rent Streams'];
      estimatedTerms = {
        ltv: '75%',
        rate: '7-9%',
        duration: '30-year fixed',
        minInvestment: 'N/A (credit product)',
      };
      timeline = '21-30 days';
      description = 'Cash-out refinance based on property cash flow. Layer Rent Streams for investor participation in ongoing income.';
      protection = ['DSCR underwriting', 'Appraisal verification', 'Reserve requirements'];
    } else if (deal.capitalNeed === 'rehab-only') {
      primary = 'AXUSD Real Estate Lending Fund';
      estimatedTerms = {
        ltv: '70% of ARV',
        rate: '10-14%',
        duration: '6-12 months',
        minInvestment: '$25,000',
      };
      timeline = '7-14 days';
      description = 'Rehab capital for property you already own. Draw-based funding with progress inspections.';
      protection = ['Construction draws', 'Progress inspections', 'Completion guarantees'];
    } else if (deal.capitalNeed === 'working-capital') {
      primary = 'AXUSD Credit Lines';
      secondary = ['Builder & Farmer Credit'];
      estimatedTerms = {
        ltv: '60%',
        rate: 'From 8% APR',
        duration: 'Revolving or 12-36 months',
        minInvestment: 'N/A (credit product)',
      };
      timeline = '14-21 days';
      description = 'Working capital line against existing equity. Flexible draw and repayment terms.';
      protection = ['Collateral security', 'Covenant monitoring', 'Draw limits'];
    } else {
      primary = 'Rent Streams';
      estimatedTerms = {
        ltv: 'N/A',
        rate: '6-9% yield',
        duration: 'Ongoing',
        minInvestment: '$1,000',
      };
      timeline = '14-21 days';
      description = 'Tokenize rental income from property you own. Bring investors into your cash flow.';
      protection = ['Occupancy requirements', 'Reserve accounts', 'Property insurance'];
      if (isSmallDeal) {
        compliance = 'SEC Reg CF';
        estimatedTerms.minInvestment = '$100';
      }
    }
  } else if (deal.exitStrategy === 'flip' || deal.capitalNeed === 'acquisition-rehab') {
    primary = 'AXUSD Real Estate Lending Fund';
    estimatedTerms = {
      ltv: '70%',
      rate: isUrgent ? '12-14% APY' : '10-14% APY',
      duration: '6-18 months',
      minInvestment: '$25,000',
    };
    timeline = isUrgent ? '5-7 days (expedited)' : '7-14 days';
    description = 'Bridge loan for acquisition and rehab. First-lien position, monthly interest reserves.';
    protection = ['Conservative LTV', 'Payment reserves', 'Backstop vault coverage'];

    if (isUrgent) {
      description += ' Expedited underwriting available for deals under contract.';
    }
  } else if (deal.exitStrategy === 'brrrr') {
    primary = 'AXUSD Real Estate Lending Fund';
    secondary = ['DSCR Refinance', 'Rent Streams'];
    estimatedTerms = {
      ltv: '75% ARV',
      rate: '10-14% (bridge) → 7-9% (DSCR)',
      duration: '12-18 months bridge → 30-year DSCR',
      minInvestment: '$25,000',
    };
    timeline = isUrgent ? '5-7 days (expedited)' : '7-14 days (bridge)';
    description = 'Phased capital: Bridge loan for acquisition/rehab, DSCR refinance after stabilization, then Rent Streams for ongoing distribution.';
    protection = ['Construction draws', 'Stabilization reserves', 'DSCR underwriting'];
  } else if (deal.exitStrategy === 'buy-hold') {
    if (deal.capitalNeed === 'acquisition' || deal.capitalNeed === 'acquisition-rehab') {
      primary = 'AXUSD Real Estate Lending Fund';
      secondary = ['Mortgage Notes', 'Rent Streams'];
      estimatedTerms = {
        ltv: '70%',
        rate: '10-14%',
        duration: '6-18 months (bridge)',
        minInvestment: '$25,000',
      };
      timeline = isUrgent ? '5-7 days' : '7-14 days';
      description = 'Bridge to permanent: Lending Fund for acquisition, convert to Mortgage Note or Rent Streams once stabilized.';
    } else if (deal.capitalNeed === 'refinance') {
      primary = 'DSCR Refinance';
      secondary = ['Rent Streams'];
      estimatedTerms = {
        ltv: '75%',
        rate: '7-9%',
        duration: '30-year fixed',
        minInvestment: 'N/A',
      };
      timeline = '21-30 days';
      description = 'Long-term refinance based on property cash flow. Layer Rent Streams for investor participation.';
    } else {
      primary = 'Rent Streams';
      estimatedTerms = {
        ltv: 'N/A',
        rate: '6-9% yield',
        duration: 'Ongoing',
        minInvestment: isSmallDeal ? '$100' : '$1,000',
      };
      timeline = '14-21 days';
      description = 'Tokenize rental income for investor participation with built-in servicing and reserves.';
      if (isSmallDeal) {
        compliance = 'SEC Reg CF';
      }
    }
    protection = ['DSCR underwriting', 'Occupancy requirements', 'Reserve accounts'];
  } else if (deal.propertyType === 'agricultural' || deal.capitalNeed === 'working-capital') {
    primary = 'Builder & Farmer Credit';
    estimatedTerms = {
      ltv: '60%',
      rate: 'From 8% APR',
      duration: '12-60 months',
      minInvestment: 'N/A (credit product)',
    };
    timeline = isPipeline ? '30-45 days' : '14-30 days';
    description = 'Working capital for development, farming, or construction operations. Collateralized by land or equipment.';
    protection = ['Collateral security', 'Draw schedules', 'Progress inspections'];
  } else if (deal.exitStrategy === 'owner-finance') {
    primary = 'Rent Streams';
    secondary = ['AXUSD Credit Lines'];
    estimatedTerms = {
      ltv: 'N/A',
      rate: '6-9% yield',
      duration: 'Note term',
      minInvestment: isSmallDeal ? '$100' : '$1,000',
    };
    timeline = '14-21 days';
    description = 'Tokenize buyer payment stream. Credit line available for capital needs while carrying the note.';
    protection = ['Buyer default protection', 'Payment reserves', 'Collateral retention'];
    if (isSmallDeal) {
      compliance = 'SEC Reg CF';
    }
  } else if (deal.capitalNeed === 'acquisition' && deal.acquisitionStructure === 'cash-purchase') {
    primary = 'AXUSD Real Estate Lending Fund';
    estimatedTerms = {
      ltv: '70%',
      rate: '10-14%',
      duration: '6-18 months',
      minInvestment: '$25,000',
    };
    timeline = isUrgent ? '5-7 days' : '7-14 days';
    description = 'Acquisition capital for cash purchase. Bridge to stabilization or exit.';
    protection = ['Conservative LTV', 'Payment reserves', 'Backstop vault'];
  } else {
    primary = 'AXUSD Real Estate Lending Fund';
    estimatedTerms = {
      ltv: '70%',
      rate: '10-14%',
      duration: '6-18 months',
      minInvestment: '$25,000',
    };
    timeline = '7-14 days';
    description = 'Flexible bridge capital for real estate acquisitions with institutional-grade underwriting.';
    protection = ['Conservative LTV', 'Payment reserves', 'Backstop vault'];
  }

  if (isLargeDeal) {
    compliance = 'SEC Reg D 506(c)';
    if (estimatedTerms.minInvestment === '$100' || estimatedTerms.minInvestment === '$500') {
      estimatedTerms.minInvestment = '$25,000';
    }
  }

  if (deal.partnerRole === 'syndicator') {
    secondary.push('White-label investor portal');
    description += ' Syndication tools and investor management included.';
  } else if (deal.partnerRole === 'operator-investor') {
    secondary.push('Co-investment participation');
  }

  return {
    primary,
    secondary,
    protection,
    compliance,
    estimatedTerms,
    timeline,
    description,
  };
}

export default function PartnerOnboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [dealData, setDealData] = useState<DealData>({
    propertyType: '',
    acquisitionStructure: '',
    capitalNeed: '',
    exitStrategy: '',
    timeline: '',
    dealValue: '',
    partnerRole: '',
    hasExistingCashflow: false,
  });

  const updateDeal = (field: keyof DealData, value: string | boolean) => {
    setDealData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return dealData.propertyType !== '';
      case 1: return dealData.acquisitionStructure !== '';
      case 2: return dealData.capitalNeed !== '';
      case 3: return dealData.exitStrategy !== '';
      case 4: return dealData.timeline !== '' && dealData.dealValue !== '' && dealData.partnerRole !== '';
      default: return true;
    }
  };

  const recommendation = getProductRecommendation(dealData);

  const renderOptionCard = (
    option: { value: string; label: string; icon?: string; description?: string },
    field: keyof DealData,
    selected: boolean
  ) => (
    <button
      key={option.value}
      onClick={() => updateDeal(field, option.value)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        padding: 20,
        background: selected 
          ? `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}20)` 
          : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? theme.primary : theme.border}`,
        borderRadius: 16,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
      }}
    >
      {option.icon && <span style={{ fontSize: 28 }}>{option.icon}</span>}
      <span style={{ 
        fontSize: 16, 
        fontWeight: 600, 
        color: selected ? theme.primary : '#fff' 
      }}>
        {option.label}
      </span>
      {option.description && (
        <span style={{ fontSize: 13, color: theme.muted, lineHeight: 1.4 }}>
          {option.description}
        </span>
      )}
    </button>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16 
          }}>
            {propertyOptions.map(opt => 
              renderOptionCard(opt, 'propertyType', dealData.propertyType === opt.value)
            )}
          </div>
        );
      
      case 1:
        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16 
          }}>
            {acquisitionOptions.map(opt => 
              renderOptionCard(opt, 'acquisitionStructure', dealData.acquisitionStructure === opt.value)
            )}
          </div>
        );
      
      case 2:
        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16 
          }}>
            {capitalOptions.map(opt => 
              renderOptionCard(opt, 'capitalNeed', dealData.capitalNeed === opt.value)
            )}
          </div>
        );
      
      case 3:
        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16 
          }}>
            {exitOptions.map(opt => 
              renderOptionCard(opt, 'exitStrategy', dealData.exitStrategy === opt.value)
            )}
          </div>
        );
      
      case 4:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#fff' }}>Deal Value</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: 12 
              }}>
                {dealValueOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateDeal('dealValue', opt.value)}
                    style={{
                      padding: '14px 16px',
                      background: dealData.dealValue === opt.value 
                        ? theme.primary 
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${dealData.dealValue === opt.value ? theme.primary : theme.border}`,
                      borderRadius: 10,
                      color: dealData.dealValue === opt.value ? '#000' : '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#fff' }}>Timeline</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: 12 
              }}>
                {timelineOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateDeal('timeline', opt.value)}
                    style={{
                      padding: 16,
                      background: dealData.timeline === opt.value 
                        ? `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}20)` 
                        : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${dealData.timeline === opt.value ? theme.primary : theme.border}`,
                      borderRadius: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ 
                      fontWeight: 600, 
                      color: dealData.timeline === opt.value ? theme.primary : '#fff',
                      marginBottom: 4
                    }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 13, color: theme.muted }}>{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#fff' }}>Your Role</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: 12 
              }}>
                {partnerRoleOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateDeal('partnerRole', opt.value)}
                    style={{
                      padding: 16,
                      background: dealData.partnerRole === opt.value 
                        ? `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}20)` 
                        : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${dealData.partnerRole === opt.value ? theme.primary : theme.border}`,
                      borderRadius: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ 
                      fontWeight: 600, 
                      color: dealData.partnerRole === opt.value ? theme.primary : '#fff',
                      marginBottom: 4
                    }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 13, color: theme.muted }}>{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{
              background: `linear-gradient(135deg, ${theme.primary}15, ${theme.accent}10)`,
              border: `2px solid ${theme.primary}`,
              borderRadius: 20,
              padding: 28,
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                marginBottom: 16 
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: theme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 13, color: theme.muted, marginBottom: 2 }}>Primary Product</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{recommendation.primary}</div>
                </div>
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: 15, 
                color: 'rgba(255,255,255,0.8)', 
                lineHeight: 1.6 
              }}>
                {recommendation.description}
              </p>
            </div>

            {recommendation.secondary.length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 24,
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, color: theme.secondary }}>
                  Secondary Layers
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {recommendation.secondary.map((product, i) => (
                    <span key={i} style={{
                      padding: '8px 16px',
                      background: `${theme.secondary}20`,
                      border: `1px solid ${theme.secondary}50`,
                      borderRadius: 20,
                      fontSize: 14,
                      color: theme.secondary,
                    }}>
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 20,
              }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14, color: theme.muted }}>
                  Estimated Terms
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: theme.muted, fontSize: 14 }}>LTV</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{recommendation.estimatedTerms.ltv}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: theme.muted, fontSize: 14 }}>Rate</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{recommendation.estimatedTerms.rate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: theme.muted, fontSize: 14 }}>Duration</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{recommendation.estimatedTerms.duration}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: theme.muted, fontSize: 14 }}>Min Investment</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{recommendation.estimatedTerms.minInvestment}</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 20,
              }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14, color: theme.muted }}>
                  Risk Protection
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recommendation.protection.map((item, i) => (
                    <div key={i} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10,
                      fontSize: 14,
                      color: '#fff',
                    }}>
                      <span style={{ color: theme.primary }}>✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 20,
              }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14, color: theme.muted }}>
                  Compliance & Timeline
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>Regulation</div>
                    <div style={{ 
                      display: 'inline-block',
                      padding: '6px 12px',
                      background: `${theme.accent}20`,
                      border: `1px solid ${theme.accent}50`,
                      borderRadius: 8,
                      fontSize: 13,
                      color: theme.accent,
                      fontWeight: 600,
                    }}>
                      {recommendation.compliance}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>Est. Funding</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.primary }}>
                      {recommendation.timeline}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: `linear-gradient(135deg, ${theme.dark}, #1a1a2e)`,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
              marginTop: 8,
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#fff' }}>
                Next Steps
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { step: 1, text: 'Submit deal overview with property details and financials' },
                  { step: 2, text: 'Axiom reviews and confirms product fit' },
                  { step: 3, text: 'Execute partnership and funding agreements' },
                  { step: 4, text: 'Capital deploys, system runs' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: theme.primary,
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}>
                      {item.step}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <a
                href="https://axiomprotocol.app/join"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '18px 32px',
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  textAlign: 'center',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Submit Your Deal
              </a>
              <button
                onClick={() => setCurrentStep(0)}
                style={{
                  padding: '18px 32px',
                  background: 'transparent',
                  border: `2px solid ${theme.border}`,
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Start Over
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Partner Onboarding | Axiom Protocol</title>
        <meta name="description" content="Match your real estate deal with the right Axiom capital products. Get a recommended product stack, terms, and next steps." />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${theme.dark} 0%, #0f0f1a 100%)`,
        color: '#fff',
      }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '40px 24px 80px',
        }}>
          <Link href="/partner" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: theme.muted,
            textDecoration: 'none',
            fontSize: 14,
            marginBottom: 32,
          }}>
            ← Back to Partner Framework
          </Link>

          <div style={{ marginBottom: 48 }}>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 800,
              margin: '0 0 12px',
              background: `linear-gradient(135deg, #fff, ${theme.primary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Match Your Deal to Capital
            </h1>
            <p style={{ 
              margin: 0, 
              fontSize: 18, 
              color: theme.muted,
              maxWidth: 600,
            }}>
              Answer a few questions about your deal. We'll show you the right product stack, estimated terms, and next steps.
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 40,
            overflowX: 'auto',
            paddingBottom: 8,
          }}>
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => index <= currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  background: index === currentStep 
                    ? `linear-gradient(135deg, ${theme.primary}30, ${theme.accent}20)`
                    : index < currentStep 
                      ? 'rgba(0, 212, 170, 0.1)' 
                      : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${
                    index === currentStep 
                      ? theme.primary 
                      : index < currentStep 
                        ? `${theme.primary}50` 
                        : theme.border
                  }`,
                  borderRadius: 10,
                  cursor: index <= currentStep ? 'pointer' : 'not-allowed',
                  opacity: index > currentStep ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: index < currentStep 
                    ? theme.primary 
                    : index === currentStep 
                      ? 'transparent' 
                      : 'transparent',
                  border: `2px solid ${
                    index <= currentStep ? theme.primary : theme.border
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: index < currentStep ? '#000' : index === currentStep ? theme.primary : theme.muted,
                }}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: index === currentStep ? '#fff' : theme.muted,
                }}>
                  {step.title}
                </span>
              </button>
            ))}
          </div>

          {currentStep < 5 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ 
                margin: '0 0 8px', 
                fontSize: 24, 
                fontWeight: 700,
                color: '#fff',
              }}>
                {steps[currentStep].subtitle}
              </h2>
            </div>
          )}

          {renderStep()}

          {currentStep < 5 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 40,
              paddingTop: 24,
              borderTop: `1px solid ${theme.border}`,
            }}>
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 0}
                style={{
                  padding: '14px 28px',
                  background: 'transparent',
                  border: `2px solid ${currentStep === 0 ? theme.border : 'rgba(255,255,255,0.3)'}`,
                  borderRadius: 10,
                  color: currentStep === 0 ? theme.muted : '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentStep === 0 ? 0.5 : 1,
                }}
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                style={{
                  padding: '14px 32px',
                  background: canProceed() 
                    ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` 
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 10,
                  color: canProceed() ? '#fff' : theme.muted,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                }}
              >
                {currentStep === 4 ? 'See Your Stack' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
