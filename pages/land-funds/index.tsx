import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LAND_ACQUISITION_CONTRACTS } from '../../shared/contracts';
import WalletButton from '../../components/web3/WalletButton';
import InvestmentModal from '../../components/web3/InvestmentModal';
import { useWallet } from '../../lib/web3/useWallet';
import HeroSection from '../../components/land-funds/HeroSection';
import InvestmentCalculator from '../../components/land-funds/InvestmentCalculator';
import TrustBadges from '../../components/land-funds/TrustBadges';
import QuickSignupFlow from '../../components/land-funds/QuickSignupFlow';

interface LandParcel {
  id: string;
  optionId?: number;
  name: string;
  location: string;
  acreage: number;
  targetPrice: number;
  currentFunding: number;
  contributors: number;
  status: 'sourcing' | 'due-diligence' | 'funding' | 'acquired' | 'development';
  imageUrl?: string;
  description: string;
  features: string[];
  stewardApplications: number;
  fundingProgress: number;
  regCFCompliant: boolean;
  onChain: boolean;
}

interface ContractStatus {
  landOptionRegistry: { address: string; connected: boolean };
  landAcquisitionPool: { address: string; connected: boolean };
  regCFCrowdfunding: { address: string; connected: boolean };
  builderFarmerCredit: { address: string; connected: boolean };
}

const DEMO_PARCELS: LandParcel[] = [
  {
    id: 'parcel-1',
    name: 'Heritage Meadows',
    location: 'Holmes County, Mississippi',
    acreage: 120,
    targetPrice: 360000,
    currentFunding: 288000,
    contributors: 42,
    status: 'funding',
    description: 'Prime agricultural land with existing water rights and road access. Ideal for community farming and sustainable agriculture initiatives.',
    features: ['Water Rights', 'Road Access', 'Fertile Soil', 'Creek Frontage'],
    stewardApplications: 8,
    fundingProgress: 80,
    regCFCompliant: true,
    onChain: false
  },
  {
    id: 'parcel-2',
    name: 'Pine Ridge Tract',
    location: 'Attala County, Mississippi',
    acreage: 85,
    targetPrice: 212500,
    currentFunding: 212500,
    contributors: 31,
    status: 'acquired',
    description: 'Mixed-use land with mature timber and pasture areas. Recently acquired and now entering the development planning phase.',
    features: ['Timber Value', 'Pasture Land', 'Power Available', 'County Road'],
    stewardApplications: 5,
    fundingProgress: 100,
    regCFCompliant: true,
    onChain: false
  },
  {
    id: 'parcel-3',
    name: 'Freedom Springs',
    location: 'Leake County, Mississippi',
    acreage: 200,
    targetPrice: 500000,
    currentFunding: 125000,
    contributors: 18,
    status: 'due-diligence',
    description: 'Large parcel with natural springs and diverse terrain. Currently undergoing environmental assessment and title verification.',
    features: ['Natural Springs', 'Diverse Terrain', 'Wildlife Habitat', 'Privacy'],
    stewardApplications: 12,
    fundingProgress: 25,
    regCFCompliant: true,
    onChain: false
  }
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  'sourcing': { label: 'Sourcing', color: '#6b7280', bg: '#f3f4f6' },
  'due-diligence': { label: 'Due Diligence', color: '#92400e', bg: '#fef3c7' },
  'funding': { label: 'Open for Funding', color: '#065f46', bg: '#d1fae5' },
  'acquired': { label: 'Acquired', color: '#1e40af', bg: '#dbeafe' },
  'development': { label: 'In Development', color: '#7c3aed', bg: '#ede9fe' }
};

export default function LandFundsPage() {
  const router = useRouter();
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showStewardModal, setShowStewardModal] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<LandParcel | null>(null);
  const [contractStatus, setContractStatus] = useState<ContractStatus | null>(null);
  const [connectivityChecked, setConnectivityChecked] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(0);
  const [showSignupFlow, setShowSignupFlow] = useState(false);
  const [foundingMembersRemaining, setFoundingMembersRemaining] = useState(7342);
  const { isConnected, isCorrectChain } = useWallet();

  useEffect(() => {
    const { utm_source, utm_medium, utm_campaign, utm_content, utm_term, ref } = router.query;
    if (utm_source || utm_campaign || ref) {
      fetch('/api/land-funds/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'page_view',
          utmSource: utm_source,
          utmMedium: utm_medium,
          utmCampaign: utm_campaign,
          utmContent: utm_content,
          utmTerm: utm_term,
          referralCode: ref,
          landingPage: '/land-funds'
        })
      }).catch(console.error);
    }

    fetch('/api/land-funds/founding-status')
      .then(res => res.json())
      .then(data => setFoundingMembersRemaining(data.remaining))
      .catch(() => {});
  }, [router.query]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const connectivityRes = await fetch('/api/phase2/test-connectivity');
        if (connectivityRes.ok) {
          const data = await connectivityRes.json();
          setContractStatus(data.contracts);
          setConnectivityChecked(true);
        }

        const optionsRes = await fetch('/api/phase2/land-options');
        if (optionsRes.ok) {
          const data = await optionsRes.json();
          if (data.options && data.options.length > 0) {
            const onChainParcels: LandParcel[] = data.options.map((opt: any) => ({
              id: `option-${opt.optionId}`,
              optionId: opt.optionId,
              name: opt.parcelId || `Land Option #${opt.optionId}`,
              location: opt.location || 'Mississippi',
              acreage: opt.acreage,
              targetPrice: parseFloat(opt.purchasePrice),
              currentFunding: (opt.sharesSold / opt.totalShares) * parseFloat(opt.purchasePrice),
              contributors: opt.investorCount,
              status: mapContractStatus(opt.status),
              description: `On-chain land option with ${opt.totalShares} total shares. ${opt.regCFCompliant ? 'SEC Reg CF compliant.' : ''}`,
              features: opt.regCFCompliant ? ['SEC Reg CF', 'ERC1155 Tokenized', 'On-Chain'] : ['ERC1155 Tokenized', 'On-Chain'],
              stewardApplications: 0,
              fundingProgress: opt.fundingProgress,
              regCFCompliant: opt.regCFCompliant,
              onChain: true
            }));
            setParcels([...onChainParcels, ...DEMO_PARCELS]);
          } else {
            setParcels(DEMO_PARCELS);
          }
        } else {
          setParcels(DEMO_PARCELS);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setParcels(DEMO_PARCELS);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  function mapContractStatus(status: string): 'sourcing' | 'due-diligence' | 'funding' | 'acquired' | 'development' {
    switch (status) {
      case 'Draft': return 'sourcing';
      case 'Active': return 'funding';
      case 'OptionFeePaid':
      case 'ExerciseReady': return 'due-diligence';
      case 'Exercised': return 'acquired';
      default: return 'sourcing';
    }
  }

  const filteredParcels = selectedStatus === 'all' 
    ? parcels 
    : parcels.filter(p => p.status === selectedStatus);

  const totalAcreage = parcels.reduce((sum, p) => sum + p.acreage, 0);
  const totalFunding = parcels.reduce((sum, p) => sum + p.currentFunding, 0);
  const totalContributors = parcels.reduce((sum, p) => sum + p.contributors, 0);
  const onChainCount = parcels.filter(p => p.onChain).length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Loading land opportunities...</p>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>Connecting to Arbitrum One...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Community Land Funds | Axiom Protocol</title>
        <meta name="description" content="Collective ownership of strategic land parcels through community pooling" />
      </Head>

      <main style={{ minHeight: '100vh', background: '#ffffff' }}>
        <HeroSection
          totalAcreage={totalAcreage}
          totalFunding={totalFunding}
          totalContributors={totalContributors}
          activeParcelCount={parcels.length}
          onInvestClick={() => setShowSignupFlow(true)}
          foundingMembersRemaining={foundingMembersRemaining}
        />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 48, marginBottom: 64 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
                Start Building Wealth Today
              </h2>
              <p style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
                For generations, land ownership has been the foundation of wealth in America. 
                Now you can own a piece of strategic land for as little as $100/month.
              </p>
              <TrustBadges variant="vertical" showDisclosure={true} />
            </div>
            <InvestmentCalculator 
              parcelPrice={360000}
              parcelName="Heritage Meadows"
              onInvestClick={() => setShowSignupFlow(true)}
            />
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['all', 'funding', 'due-diligence', 'acquired', 'sourcing'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    background: selectedStatus === status ? '#111827' : '#f3f4f6',
                    color: selectedStatus === status ? '#ffffff' : '#6b7280',
                    transition: 'all 0.2s'
                  }}
                >
                  {status === 'all' ? 'All Parcels' : statusConfig[status]?.label || status}
                </button>
              ))}
            </div>
            
            <Link href="/steward-corps" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: '#d4af37',
              color: '#111827',
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 14
            }}>
              Become a Steward
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            {filteredParcels.map((parcel) => (
              <div key={parcel.id} style={{ background: '#f9fafb', borderRadius: 16, overflow: 'hidden', border: parcel.onChain ? '2px solid #3b82f6' : '1px solid #e5e7eb' }}>
                <div style={{ height: 160, background: parcel.onChain ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #374151 0%, #1f2937 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {parcel.onChain ? (
                    <div style={{ textAlign: 'center' }}>
                      <svg style={{ width: 40, height: 40, color: '#ffffff', marginBottom: 8 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <p style={{ color: '#ffffff', fontSize: 12, fontWeight: 600 }}>ON-CHAIN VERIFIED</p>
                    </div>
                  ) : (
                    <svg style={{ width: 48, height: 48, color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: statusConfig[parcel.status].bg,
                      color: statusConfig[parcel.status].color
                    }}>
                      {statusConfig[parcel.status].label}
                    </span>
                  </div>
                </div>
                
                <div style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{parcel.name}</h3>
                  <p style={{ color: '#6b7280', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {parcel.location}
                  </p>
                  
                  <p style={{ color: '#374151', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>{parcel.description}</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {parcel.features.map((feature) => (
                      <span key={feature} style={{ 
                        padding: '4px 10px', 
                        background: feature === 'On-Chain' || feature === 'ERC1155 Tokenized' ? '#dbeafe' : '#e5e7eb', 
                        color: feature === 'On-Chain' || feature === 'ERC1155 Tokenized' ? '#1e40af' : '#374151',
                        borderRadius: 6, 
                        fontSize: 12
                      }}>
                        {feature}
                      </span>
                    ))}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Acreage</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{parcel.acreage} acres</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Target Price</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>${parcel.targetPrice.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {(parcel.status === 'funding' || parcel.fundingProgress > 0) && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, color: '#374151' }}>{Math.round(parcel.fundingProgress)}% funded</span>
                        <span style={{ fontSize: 14, color: '#6b7280' }}>{parcel.contributors} contributors</span>
                      </div>
                      <div style={{ height: 8, background: '#e5e7eb', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(parcel.fundingProgress, 100)}%`,
                          background: parcel.onChain ? 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                          borderRadius: 9999,
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    {parcel.status === 'funding' && (
                      <button
                        onClick={() => {
                          if (!parcel.optionId || !parcel.onChain) {
                            window.location.href = `/lending-fund/invest?product=land-funds&parcel=${parcel.id}`;
                            return;
                          }
                          setSelectedParcel(parcel);
                          setSelectedCampaignId(parcel.optionId);
                          setShowInvestModal(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          background: parcel.onChain ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          borderRadius: 8,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 14,
                          textAlign: 'center'
                        }}
                      >
                        Invest AXUSD
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedParcel(parcel); setShowStewardModal(true); }}
                      style={{
                        flex: parcel.status === 'funding' ? 0 : 1,
                        padding: '12px 20px',
                        background: '#111827',
                        color: '#ffffff',
                        borderRadius: 8,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14
                      }}
                    >
                      Apply as Steward
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 64, background: '#f9fafb', borderRadius: 20, padding: 48, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 16, textAlign: 'center' }}>
              How Community Land Funds Work
            </h2>
            <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: 600, margin: '0 auto 40px' }}>
              A transparent, community-driven process for acquiring and developing land together.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
              <ProcessStep number={1} title="Land Sourcing" description="Our team identifies strategic parcels with development potential and community value." />
              <ProcessStep number={2} title="Due Diligence" description="Environmental, legal, and financial assessments ensure each parcel meets our standards." />
              <ProcessStep number={3} title="Community Funding" description="Members pool AXUSD to collectively fund land acquisition via SEC Reg CF." />
              <ProcessStep number={4} title="Steward Assignment" description="Qualified stewards are selected to manage and develop the land." />
              <ProcessStep number={5} title="Development" description="Land is developed according to community-approved plans and steward expertise." />
            </div>
          </div>
        </div>
      </main>

      {showStewardModal && selectedParcel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 500, width: '100%', padding: 32 }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Apply as Steward</h3>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>for {selectedParcel.name}</p>
            
            <p style={{ color: '#374151', marginBottom: 24, lineHeight: 1.6 }}>
              Stewards are community members who take responsibility for managing and developing acquired land. 
              This role requires commitment, skills, and alignment with Axiom values.
            </p>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/steward-corps" style={{
                flex: 1,
                padding: '12px 20px',
                background: '#d4af37',
                color: '#111827',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 14,
                textAlign: 'center'
              }}>
                Join Steward Corps
              </Link>
              <button
                onClick={() => setShowStewardModal(false)}
                style={{
                  padding: '12px 20px',
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

      {showInvestModal && selectedParcel && (
        <InvestmentModal
          isOpen={showInvestModal}
          onClose={() => setShowInvestModal(false)}
          campaignId={selectedCampaignId}
          campaignTitle={selectedParcel.name}
          onSuccess={() => {
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }}
        />
      )}

      <QuickSignupFlow
        isOpen={showSignupFlow}
        onClose={() => setShowSignupFlow(false)}
        parcelName={selectedParcel?.name || 'Heritage Meadows'}
        parcelId={selectedParcel?.id || 'parcel-1'}
        onComplete={(data) => {
          console.log('Signup complete:', data);
          fetch('/api/land-funds/founding-status')
            .then(res => res.json())
            .then(data => setFoundingMembersRemaining(data.remaining))
            .catch(() => {});
        }}
      />
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

function ContractBadge({ name, connected }: { name: string; connected: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444' }} />
      <span style={{ fontSize: 12, color: connected ? '#10b981' : '#ef4444' }}>{name}</span>
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
