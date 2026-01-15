import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { LAND_ACQUISITION_CONTRACTS } from '../../shared/contracts';
import WalletButton from '../../components/web3/WalletButton';
import CreditApplicationModal from '../../components/web3/CreditApplicationModal';
import { useWallet } from '../../lib/web3/useWallet';

interface CreditTier {
  type: string;
  maxLTV: number;
  interestRateBps: number;
  interestRatePercent: number;
  maxTermMonths: number;
  minCollateralValue: string;
}

interface CreditProduct {
  id: string;
  name: string;
  type: 'builder' | 'farmer';
  description: string;
  minAmount: number;
  maxAmount: number;
  termMonths: number;
  interestRate: number;
  collateralTypes: string[];
  requirements: string[];
  features: string[];
  onChain?: boolean;
}

interface ContractStatus {
  address: string;
  connected: boolean;
}

const DEFAULT_CREDIT_PRODUCTS: CreditProduct[] = [
  {
    id: 'builder-working-capital',
    name: 'Builder Working Capital',
    type: 'builder',
    description: 'Short-term financing for construction projects, materials, and labor costs on community land.',
    minAmount: 10000,
    maxAmount: 250000,
    termMonths: 24,
    interestRate: 12,
    collateralTypes: ['Work in Progress', 'Equipment', 'Materials'],
    requirements: ['Community land steward status', 'Construction experience', 'Project plan approval'],
    features: ['70% Max LTV', 'Draw schedule based on milestones', 'Interest-only during construction']
  },
  {
    id: 'equipment-financing',
    name: 'Equipment Financing',
    type: 'builder',
    description: 'Finance heavy equipment and tools needed for land development and construction projects.',
    minAmount: 5000,
    maxAmount: 150000,
    termMonths: 24,
    interestRate: 12,
    collateralTypes: ['Equipment being financed'],
    requirements: ['Equipment quote or invoice', 'Insurance coverage', 'Steward or community member status'],
    features: ['Equipment serves as collateral', 'Fixed monthly payments', 'Ownership at term end']
  },
  {
    id: 'farmer-seasonal-credit',
    name: 'Seasonal Farm Credit',
    type: 'farmer',
    description: 'Working capital for planting seasons including seeds, fertilizer, equipment rental, and labor.',
    minAmount: 5000,
    maxAmount: 100000,
    termMonths: 36,
    interestRate: 10,
    collateralTypes: ['Crop Proceeds', 'Equipment'],
    requirements: ['Farming plan', 'Community land access', 'Agricultural experience'],
    features: ['65% Max LTV', 'Balloon payment at harvest', 'Crop insurance required']
  },
  {
    id: 'livestock-credit',
    name: 'Livestock & Ranching Credit',
    type: 'farmer',
    description: 'Financing for livestock purchase, feed, veterinary care, and pasture improvements.',
    minAmount: 10000,
    maxAmount: 200000,
    termMonths: 36,
    interestRate: 10,
    collateralTypes: ['Livestock', 'Equipment', 'Land Improvements'],
    requirements: ['Livestock management plan', 'Adequate land access', 'Veterinary relationship'],
    features: ['Flexible draw schedule', 'Livestock as collateral', 'Herd expansion focus']
  },
  {
    id: 'infrastructure-credit',
    name: 'Farm Infrastructure',
    type: 'farmer',
    description: 'Longer-term financing for barns, irrigation systems, fencing, and permanent improvements.',
    minAmount: 25000,
    maxAmount: 500000,
    termMonths: 36,
    interestRate: 10,
    collateralTypes: ['Improvements', 'Land Lease Rights', 'Equipment'],
    requirements: ['Engineering plans', 'Permits and approvals', 'Long-term land access'],
    features: ['Progress-based draws', 'Deferred principal start', 'Value-add improvements']
  }
];

export default function BuilderCreditPage() {
  const [selectedType, setSelectedType] = useState<'all' | 'builder' | 'farmer'>('all');
  const [selectedProduct, setSelectedProduct] = useState<CreditProduct | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showOnChainApply, setShowOnChainApply] = useState(false);
  const [creditTiers, setCreditTiers] = useState<CreditTier[]>([]);
  const [contractStatus, setContractStatus] = useState<ContractStatus | null>(null);
  const [products, setProducts] = useState<CreditProduct[]>(DEFAULT_CREDIT_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [creditStats, setCreditStats] = useState({ totalApplications: 0, totalLoans: 0 });
  const { isConnected } = useWallet();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const connectivityRes = await fetch('/api/phase2/test-connectivity');
        if (connectivityRes.ok) {
          const data = await connectivityRes.json();
          setContractStatus(data.contracts.builderFarmerCredit);
          if (data.creditTiers && data.creditTiers.length > 0) {
            setCreditTiers(data.creditTiers);
            const updatedProducts = DEFAULT_CREDIT_PRODUCTS.map(p => {
              const tier = data.creditTiers.find((t: CreditTier) => t.type.toLowerCase() === p.type);
              if (tier) {
                return {
                  ...p,
                  interestRate: tier.interestRatePercent,
                  termMonths: tier.maxTermMonths,
                  onChain: true,
                  features: [
                    `${tier.maxLTV}% Max LTV`,
                    ...p.features.filter(f => !f.includes('Max LTV'))
                  ]
                };
              }
              return p;
            });
            setProducts(updatedProducts);
          }
        }

        const statsRes = await fetch('/api/phase2/credit');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setCreditStats(stats);
        }
      } catch (error) {
        console.error('Error fetching credit data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = selectedType === 'all' 
    ? products 
    : products.filter(p => p.type === selectedType);

  const builderTier = creditTiers.find(t => t.type === 'Builder');
  const farmerTier = creditTiers.find(t => t.type === 'Farmer');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Loading credit products...</p>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>Connecting to Arbitrum One...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Builder & Farmer Credit | Axiom Protocol</title>
        <meta name="description" content="Working capital for land development and agriculture" />
      </Head>

      <main style={{ minHeight: '100vh', background: '#ffffff' }}>
        <div style={{ background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', padding: '80px 24px', color: '#ffffff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 12px', background: 'rgba(212, 175, 55, 0.2)', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: '#d4af37' }}>
                PHASE 2
              </span>
              <span style={{ padding: '4px 12px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: '#10b981' }}>
                COMMUNITY CREDIT
              </span>
              {contractStatus?.connected && (
                <span style={{ padding: '4px 12px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>
                  ON-CHAIN CONNECTED
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16 }}>Builder & Farmer Credit</h1>
                <p style={{ fontSize: 20, color: '#9ca3af', maxWidth: 700 }}>
                  Working capital for land development and agriculture. Access financing to build, grow, and develop community land into productive assets.
                </p>
              </div>
              <WalletButton />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, marginTop: 48 }}>
              <StatCard label="Products Available" value={products.length.toString()} />
              <StatCard 
                label="Builder Rate" 
                value={builderTier ? `${builderTier.interestRatePercent}%` : '12%'} 
                suffix="APR"
                highlight={builderTier ? 'On-chain verified' : undefined}
              />
              <StatCard 
                label="Farmer Rate" 
                value={farmerTier ? `${farmerTier.interestRatePercent}%` : '10%'} 
                suffix="APR"
                highlight={farmerTier ? 'On-chain verified' : undefined}
              />
              <StatCard 
                label="Terms Up To" 
                value={Math.max(builderTier?.maxTermMonths || 24, farmerTier?.maxTermMonths || 36).toString()} 
                suffix="months" 
              />
            </div>

            {contractStatus && (
              <div style={{ marginTop: 32, padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>SMART CONTRACT STATUS</p>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: contractStatus.connected ? '#10b981' : '#ef4444' }} />
                    <span style={{ fontSize: 12, color: contractStatus.connected ? '#10b981' : '#ef4444' }}>BuilderFarmerCredit</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                    {LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT.slice(0, 10)}...{LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT.slice(-8)}
                  </span>
                </div>
                {creditStats.totalApplications > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 24 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Applications: <strong style={{ color: '#ffffff' }}>{creditStats.totalApplications}</strong></span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Active Loans: <strong style={{ color: '#ffffff' }}>{creditStats.totalLoans}</strong></span>
                  </div>
                )}
              </div>
            )}

            {creditTiers.length > 0 && (
              <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {creditTiers.map(tier => (
                  <div key={tier.type} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: tier.type === 'Builder' ? '#3b82f6' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {tier.type === 'Builder' ? (
                          <svg style={{ width: 18, height: 18, color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                          </svg>
                        ) : (
                          <svg style={{ width: 18, height: 18, color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{tier.type} Credit Tier</h4>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>On-chain parameters</p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#6b7280' }}>Max LTV</p>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>{tier.maxLTV}%</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#6b7280' }}>Interest Rate</p>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>{tier.interestRatePercent}% APR</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#6b7280' }}>Max Term</p>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>{tier.maxTermMonths} months</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#6b7280' }}>Min Collateral</p>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>${parseFloat(tier.minCollateralValue).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'builder', 'farmer'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  background: selectedType === type ? '#111827' : '#f3f4f6',
                  color: selectedType === type ? '#ffffff' : '#6b7280',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {type === 'builder' && (
                  <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
                {type === 'farmer' && (
                  <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
                  </svg>
                )}
                {type === 'all' ? 'All Products' : type === 'builder' ? 'Builder Credit' : 'Farmer Credit'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            {filteredProducts.map((product) => (
              <div key={product.id} style={{ background: '#f9fafb', borderRadius: 16, padding: 24, border: product.onChain ? '2px solid #3b82f6' : '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: product.type === 'builder' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {product.type === 'builder' ? (
                      <svg style={{ width: 24, height: 24, color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    ) : (
                      <svg style={{ width: 24, height: 24, color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{product.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: product.type === 'builder' ? '#3b82f6' : '#10b981'
                      }}>
                        {product.type} Credit
                      </span>
                      {product.onChain && (
                        <span style={{ fontSize: 10, color: '#3b82f6', background: '#dbeafe', padding: '2px 6px', borderRadius: 4 }}>
                          ON-CHAIN
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{product.description}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Amount Range</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${(product.minAmount / 1000).toFixed(0)}K - ${(product.maxAmount / 1000).toFixed(0)}K</p>
                  </div>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Interest Rate</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{product.interestRate}% APR</p>
                  </div>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Max Term</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{product.termMonths} months</p>
                  </div>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Collateral</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{product.collateralTypes[0]}</p>
                  </div>
                </div>
                
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' }}>Features</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {product.features.map((feature) => (
                      <span key={feature} style={{ 
                        padding: '4px 10px', 
                        background: feature.includes('LTV') ? '#dbeafe' : '#e5e7eb',
                        color: feature.includes('LTV') ? '#1d4ed8' : '#374151',
                        borderRadius: 6, 
                        fontSize: 12 
                      }}>
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => { 
                    setSelectedProduct(product); 
                    if (product.onChain) {
                      setShowOnChainApply(true);
                    } else {
                      setShowApplyModal(true);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: product.type === 'builder' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    borderRadius: 8,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  {product.onChain ? 'Apply On-Chain' : 'Apply for Credit'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 64, background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(184, 134, 11, 0.1) 100%)', borderRadius: 20, padding: 48, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24, textAlign: 'center' }}>
              Why Choose Axiom Credit?
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
              <BenefitCard 
                icon="🔗" 
                title="On-Chain Transparency" 
                description="Credit terms and loan status verified on Arbitrum One. Full transparency with immutable records."
              />
              <BenefitCard 
                icon="⚡" 
                title="Fast Decisions" 
                description="Streamlined underwriting with decisions in days, not weeks. Get funded when you need it."
              />
              <BenefitCard 
                icon="🤝" 
                title="Flexible Terms" 
                description="Repayment structures aligned with your cash flow - harvest cycles, construction milestones, or monthly payments."
              />
              <BenefitCard 
                icon="📈" 
                title="Build Credit" 
                description="Successful repayment builds your on-chain credit score, unlocking larger credit lines and better rates."
              />
            </div>
          </div>

          <div style={{ marginTop: 64, background: '#f9fafb', borderRadius: 20, padding: 48, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 16, textAlign: 'center' }}>
              Application Process
            </h2>
            <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: 600, margin: '0 auto 40px' }}>
              From application to funding in as few as 5 business days.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              <ProcessStep number={1} title="Apply Online" description="Complete our streamlined application with your project details and funding needs." />
              <ProcessStep number={2} title="Documentation" description="Upload required documents: project plans, financial statements, and collateral info." />
              <ProcessStep number={3} title="Underwriting" description="Our team reviews your application and conducts due diligence." />
              <ProcessStep number={4} title="Approval" description="Receive your credit terms and sign the agreement." />
              <ProcessStep number={5} title="Funding" description="AXUSD is deposited to your wallet, ready to deploy on your project." />
            </div>
          </div>
        </div>
      </main>

      {showApplyModal && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 500, width: '100%', padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Apply for {selectedProduct.name}</h3>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              ${selectedProduct.minAmount.toLocaleString()} - ${selectedProduct.maxAmount.toLocaleString()} at {selectedProduct.interestRate}% APR
            </p>
            
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Requirements</h4>
              <ul style={{ paddingLeft: 20, color: '#6b7280', fontSize: 14, lineHeight: 1.8 }}>
                {selectedProduct.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Accepted Collateral</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedProduct.collateralTypes.map((type) => (
                  <span key={type} style={{ padding: '6px 12px', background: '#f3f4f6', borderRadius: 6, fontSize: 13, color: '#374151' }}>
                    {type}
                  </span>
                ))}
              </div>
            </div>
            
            <div style={{ background: '#dbeafe', padding: 16, borderRadius: 8, marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: '#1e40af' }}>
                <strong>On-Chain Credit:</strong> Your application and loan terms will be recorded on Arbitrum One for full transparency and immutability.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/steward-corps" style={{
                flex: 1,
                padding: '14px 20px',
                background: selectedProduct.type === 'builder' ? '#3b82f6' : '#10b981',
                color: '#ffffff',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 14,
                textAlign: 'center'
              }}>
                Start Application
              </Link>
              <button
                onClick={() => setShowApplyModal(false)}
                style={{
                  padding: '14px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  borderRadius: 8,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnChainApply && selectedProduct && (
        <CreditApplicationModal
          isOpen={showOnChainApply}
          onClose={() => setShowOnChainApply(false)}
          creditType={selectedProduct.type}
          productName={selectedProduct.name}
          maxLTV={creditTiers.find(t => t.type.toLowerCase() === selectedProduct.type)?.maxLTV || 70}
          interestRate={selectedProduct.interestRate}
          maxTermMonths={selectedProduct.termMonths}
          minCollateral={creditTiers.find(t => t.type.toLowerCase() === selectedProduct.type)?.minCollateralValue || '25000'}
          onSuccess={() => {
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }}
        />
      )}
    </>
  );
}

function StatCard({ label, value, suffix, highlight }: { label: string; value: string; suffix?: string; highlight?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 20 }}>
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: '#ffffff' }}>
        {value}
        {suffix && <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{suffix}</span>}
      </p>
      {highlight && <p style={{ fontSize: 11, color: '#3b82f6', marginTop: 4 }}>{highlight}</p>}
    </div>
  );
}

function BenefitCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ background: '#ffffff', padding: 24, borderRadius: 12 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

function ProcessStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 700,
        margin: '0 auto 16px'
      }}>
        {number}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}
