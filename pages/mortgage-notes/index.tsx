import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../../components/web3/WalletButton';
import VaultDepositModal from '../../components/web3/VaultDepositModal';
import { useWallet } from '../../lib/web3/useWallet';
import { getVaultPosition } from '../../lib/web3/vaultService';

interface Note {
  id: string;
  propertyAddress: string;
  propertyType: string;
  loanAmount: number;
  interestRate: number;
  ltv: number;
  term: number;
  status: string;
  nextPaymentDate: string;
  originationDate: string;
}

interface Stats {
  totalNotesValue: number;
  activeNotes: number;
  averageYield: number;
  totalInvestors: number;
  totalDistributed: number;
  averageLoanTerm: number;
  performingRate: number;
}

interface Fund {
  name: string;
  tagline: string;
  description: string;
  targetApy: string;
  minInvestment: number;
  status: string;
}

interface LiveData {
  source: 'blockchain' | 'static';
  contracts?: { vault: string; manager: string };
  lastUpdated: string;
}

export default function MortgageNotesPage() {
  const { isConnected, address } = useWallet();
  const [fund, setFund] = useState<Fund | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [position, setPosition] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/mortgage-notes');
        if (res.ok) {
          const data = await res.json();
          setFund(data.fund);
          setStats(data.stats);
          setNotes(data.notes || []);
          setLiveData(data.liveData || null);
        }
      } catch (err) {
        console.error('Failed to load mortgage notes data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function loadPosition() {
      if (isConnected && address) {
        try {
          const pos = await getVaultPosition('mortgage-notes', address);
          setPosition(pos);
        } catch (e) {
          console.error('Error loading position:', e);
        }
      }
    }
    loadPosition();
  }, [isConnected, address]);

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <>
      <Head>
        <title>Axiom Mortgage Notes | Fractional Loan Ownership</title>
        <meta name="description" content="Invest in fractional ownership of performing real estate loans backed by property collateral." />
      </Head>

      <main style={{ background: '#ffffff', minHeight: '100vh' }}>
        <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <WalletButton />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  padding: '8px 16px', 
                  borderRadius: 9999, 
                  background: 'rgba(212, 175, 55, 0.1)', 
                  border: '1px solid rgba(212, 175, 55, 0.3)'
                }}>
                  <span style={{ color: '#b8860b', fontSize: 14, fontWeight: 500 }}>SEC Reg D 506(c) | Accredited Investors</span>
                </div>
                {liveData?.source === 'blockchain' && (
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '8px 16px', 
                    borderRadius: 9999, 
                    background: 'rgba(34, 197, 94, 0.1)', 
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginRight: 8, animation: 'pulse 2s infinite' }}></span>
                    <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 500 }}>Live On-Chain Data</span>
                  </div>
                )}
              </div>

              <h1 style={{ fontSize: 48, fontWeight: 700, color: '#111827', marginBottom: 16, lineHeight: 1.2 }}>
                Axiom Mortgage Notes
              </h1>
              <p style={{ fontSize: 20, color: '#6b7280', maxWidth: 700, margin: '0 auto 32px' }}>
                {fund?.tagline || 'Fractional ownership in performing real estate loans'}
              </p>

              {isConnected && position && parseFloat(position.positionValue) > 0 && (
                <div style={{ 
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)', 
                  padding: 20, 
                  borderRadius: 12, 
                  border: '2px solid #d4af37',
                  maxWidth: 400,
                  margin: '0 auto 32px'
                }}>
                  <p style={{ fontSize: 14, color: '#92400e', marginBottom: 4 }}>Your Position</p>
                  <p style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>
                    ${parseFloat(position.positionValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p style={{ fontSize: 12, color: '#78716c' }}>
                    {parseFloat(position.shares).toFixed(4)} vault shares
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
                <button
                  onClick={() => setShowInvestModal(true)}
                  style={{
                    padding: '16px 32px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    borderRadius: 8,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {isConnected ? 'Invest Now' : 'Connect & Invest'}
                </button>
                <Link href="/lending-fund/docs" style={{
                  padding: '16px 32px',
                  background: 'transparent',
                  color: '#374151',
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 16,
                  border: '2px solid #e5e7eb'
                }}>
                  View Documents
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, maxWidth: 900, margin: '0 auto' }}>
                <StatCard label="Total Notes Value" value={loading ? '...' : formatUSD(stats?.totalNotesValue || 0)} />
                <StatCard label="Active Notes" value={loading ? '...' : String(stats?.activeNotes || 0)} />
                <StatCard label="Target APY" value={fund?.targetApy || '10-14%'} highlight />
                <StatCard label="Performing Rate" value={loading ? '...' : `${stats?.performingRate || 0}%`} />
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>How It Works</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Invest in a diversified portfolio of short-term real estate loans and earn monthly interest.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              <FeatureCard 
                icon="🏠" 
                title="Property-Backed" 
                description="Every note is secured by real property with conservative LTV ratios (typically 65-70%)."
              />
              <FeatureCard 
                icon="💰" 
                title="Monthly Income" 
                description="Receive monthly interest payments from borrower loan payments, settled in AXUSD."
              />
              <FeatureCard 
                icon="📊" 
                title="Diversified Portfolio" 
                description="Your investment is spread across multiple notes, reducing single-property risk."
              />
              <FeatureCard 
                icon="🔒" 
                title="Professional Servicing" 
                description="Axiom Nexus handles all loan servicing, collections, and borrower management."
              />
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px', background: '#f8f9fa' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Active Notes Portfolio</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Current performing loans in the portfolio
            </p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ color: '#6b7280' }}>Loading notes...</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {notes.map((note) => (
                  <div key={note.id} style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: 20,
                    border: '1px solid #e5e7eb',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 16,
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Property</p>
                      <p style={{ fontWeight: 600, color: '#111827' }}>{note.propertyAddress}</p>
                      <p style={{ fontSize: 13, color: '#6b7280' }}>{note.propertyType}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Loan Amount</p>
                      <p style={{ fontWeight: 600, color: '#111827' }}>{formatUSD(note.loanAmount)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Interest Rate</p>
                      <p style={{ fontWeight: 600, color: '#d4af37' }}>{note.interestRate}%</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>LTV</p>
                      <p style={{ fontWeight: 600, color: '#111827' }}>{note.ltv}%</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Status</p>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 500,
                        background: note.status === 'Performing' ? '#d1fae5' : '#fee2e2',
                        color: note.status === 'Performing' ? '#065f46' : '#991b1b'
                      }}>
                        {note.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Ready to Invest?</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Join {stats?.totalInvestors || 0} investors earning stable yields from real estate-backed notes.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowInvestModal(true)}
                style={{
                  padding: '16px 32px',
                  background: '#d4af37',
                  color: '#111827',
                  borderRadius: 8,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Start Investing
              </button>
              <Link href="/dscr/investor/reports" style={{
                padding: '16px 32px',
                background: '#111827',
                color: '#ffffff',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                Investor Portal
              </Link>
            </div>
          </div>
        </section>
      </main>

      <VaultDepositModal
        isOpen={showInvestModal}
        onClose={() => setShowInvestModal(false)}
        productKey="mortgage-notes"
        productName="Axiom Mortgage Notes"
        targetApy={fund?.targetApy || '10-14%'}
        minDeposit="100"
        onSuccess={() => {
          if (address) {
            getVaultPosition('mortgage-notes', address).then(setPosition);
          }
        }}
      />
    </>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      padding: 20,
      border: highlight ? '2px solid #d4af37' : '1px solid #e5e7eb',
      textAlign: 'center'
    }}>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: highlight ? '#d4af37' : '#111827' }}>{value}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: 12,
      padding: 24,
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}
