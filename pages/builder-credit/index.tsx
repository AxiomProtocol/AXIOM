import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

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
}

interface LoanApplication {
  id: string;
  productId: string;
  amount: number;
  status: 'pending' | 'under-review' | 'approved' | 'funded' | 'repaying';
  createdAt: string;
}

const CREDIT_PRODUCTS: CreditProduct[] = [
  {
    id: 'builder-working-capital',
    name: 'Builder Working Capital',
    type: 'builder',
    description: 'Short-term financing for construction projects, materials, and labor costs on community land.',
    minAmount: 10000,
    maxAmount: 250000,
    termMonths: 12,
    interestRate: 10,
    collateralTypes: ['Work in Progress', 'Equipment', 'Materials'],
    requirements: ['Community land steward status', 'Construction experience', 'Project plan approval'],
    features: ['Draw schedule based on milestones', 'Interest-only during construction', 'Flexible repayment']
  },
  {
    id: 'equipment-financing',
    name: 'Equipment Financing',
    type: 'builder',
    description: 'Finance heavy equipment and tools needed for land development and construction projects.',
    minAmount: 5000,
    maxAmount: 150000,
    termMonths: 36,
    interestRate: 8,
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
    termMonths: 8,
    interestRate: 9,
    collateralTypes: ['Crop Proceeds', 'Equipment'],
    requirements: ['Farming plan', 'Community land access', 'Agricultural experience'],
    features: ['Balloon payment at harvest', 'Input cost coverage', 'Crop insurance required']
  },
  {
    id: 'livestock-credit',
    name: 'Livestock & Ranching Credit',
    type: 'farmer',
    description: 'Financing for livestock purchase, feed, veterinary care, and pasture improvements.',
    minAmount: 10000,
    maxAmount: 200000,
    termMonths: 24,
    interestRate: 9.5,
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
    termMonths: 60,
    interestRate: 8.5,
    collateralTypes: ['Improvements', 'Land Lease Rights', 'Equipment'],
    requirements: ['Engineering plans', 'Permits and approvals', 'Long-term land access'],
    features: ['Progress-based draws', 'Deferred principal start', 'Value-add improvements']
  }
];

export default function BuilderCreditPage() {
  const [selectedType, setSelectedType] = useState<'all' | 'builder' | 'farmer'>('all');
  const [selectedProduct, setSelectedProduct] = useState<CreditProduct | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const filteredProducts = selectedType === 'all' 
    ? CREDIT_PRODUCTS 
    : CREDIT_PRODUCTS.filter(p => p.type === selectedType);

  const totalCapacity = CREDIT_PRODUCTS.reduce((sum, p) => sum + p.maxAmount, 0);

  return (
    <>
      <Head>
        <title>Builder & Farmer Credit | Axiom Protocol</title>
        <meta name="description" content="Working capital for land development and agriculture" />
      </Head>

      <main style={{ minHeight: '100vh', background: '#ffffff' }}>
        <div style={{ background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', padding: '80px 24px', color: '#ffffff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ padding: '4px 12px', background: 'rgba(212, 175, 55, 0.2)', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: '#d4af37' }}>
                PHASE 2
              </span>
              <span style={{ padding: '4px 12px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: '#10b981' }}>
                COMMUNITY CREDIT
              </span>
            </div>
            <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16 }}>Builder & Farmer Credit</h1>
            <p style={{ fontSize: 20, color: '#9ca3af', maxWidth: 700 }}>
              Working capital for land development and agriculture. Access financing to build, grow, and develop community land into productive assets.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, marginTop: 48 }}>
              <StatCard label="Products Available" value={CREDIT_PRODUCTS.length.toString()} />
              <StatCard label="Max Credit Line" value={`$${(Math.max(...CREDIT_PRODUCTS.map(p => p.maxAmount)) / 1000)}K`} />
              <StatCard label="Rates From" value="8%" suffix="APR" />
              <StatCard label="Terms Up To" value="60" suffix="months" />
            </div>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                )}
                {type === 'all' ? 'All Products' : type === 'builder' ? 'Builder Credit' : 'Farmer Credit'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            {filteredProducts.map((product) => (
              <div key={product.id} style={{ background: '#f9fafb', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
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
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: product.type === 'builder' ? '#3b82f6' : '#10b981'
                    }}>
                      {product.type} Credit
                    </span>
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
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Term Length</p>
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
                      <span key={feature} style={{ padding: '4px 10px', background: '#e5e7eb', borderRadius: 6, fontSize: 12, color: '#374151' }}>
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => { setSelectedProduct(product); setShowApplyModal(true); }}
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
                  Apply for Credit
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
                icon="🏛️" 
                title="Community-Backed" 
                description="Credit is funded by community capital, creating a circular economy that benefits all members."
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
            
            <div style={{ background: '#fef3c7', padding: 16, borderRadius: 8, marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: '#92400e' }}>
                <strong>Note:</strong> Credit applications require membership in the Axiom community and connection to community land projects.
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
    </>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 20 }}>
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: '#ffffff' }}>
        {value}
        {suffix && <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{suffix}</span>}
      </p>
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
