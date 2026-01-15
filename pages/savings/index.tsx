import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../../components/web3/WalletButton';
import VaultDepositModal from '../../components/web3/VaultDepositModal';
import { useWallet } from '../../lib/web3/useWallet';
import { getVaultPosition } from '../../lib/web3/vaultService';

interface Vault {
  name: string;
  tagline: string;
  description: string;
  currentApy: number;
  minDeposit: number;
  maxDeposit: number;
  status: string;
  lockPeriod: number;
  withdrawalNotice: number;
}

interface Stats {
  totalDeposits: number;
  totalDepositors: number;
  averageDeposit: number;
  totalYieldPaid: number;
  utilizationRate: number;
  reserveRatio: number;
}

interface Tier {
  name: string;
  minBalance: number;
  apyBoost: number;
}

interface ApyHistory {
  month: string;
  apy: number;
}

interface LiveData {
  source: 'blockchain' | 'static';
  axusdCirculating?: number;
  contracts?: { fixFlipVault: string; dscrVault: string; axusd: string };
  lastUpdated: string;
}

export default function SavingsPage() {
  const { isConnected, address } = useWallet();
  const [vault, setVault] = useState<Vault | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [apyHistory, setApyHistory] = useState<ApyHistory[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [position, setPosition] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/savings');
        if (res.ok) {
          const data = await res.json();
          setVault(data.vault);
          setStats(data.stats);
          setTiers(data.tiers || []);
          setApyHistory(data.apyHistory || []);
          setFeatures(data.features || []);
          setLiveData(data.liveData || null);
        }
      } catch (err) {
        console.error('Failed to load savings data');
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
          const pos = await getVaultPosition('savings', address);
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
        <title>Axiom High Yield Savings | Earn Stable Returns</title>
        <meta name="description" content="Earn competitive yields backed by real estate cash flows with Axiom High Yield Savings." />
      </Head>

      <main style={{ background: '#ffffff', minHeight: '100vh' }}>
        <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)' }}>
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
                  background: 'rgba(212, 175, 55, 0.2)', 
                  border: '1px solid rgba(212, 175, 55, 0.4)'
                }}>
                  <span style={{ color: '#d4af37', fontSize: 14, fontWeight: 500 }}>Accredited Investors Only</span>
                </div>
                {liveData?.source === 'blockchain' && (
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '8px 16px', 
                    borderRadius: 9999, 
                    background: 'rgba(34, 197, 94, 0.2)', 
                    border: '1px solid rgba(34, 197, 94, 0.4)'
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginRight: 8 }}></span>
                    <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 500 }}>Live On-Chain Data</span>
                  </div>
                )}
              </div>

              <h1 style={{ fontSize: 48, fontWeight: 700, color: '#ffffff', marginBottom: 16, lineHeight: 1.2 }}>
                High Yield Savings
              </h1>
              <p style={{ fontSize: 20, color: '#9ca3af', maxWidth: 700, margin: '0 auto 24px' }}>
                {vault?.tagline || 'Earn competitive yields backed by real estate cash flows'}
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 8,
                background: 'rgba(212, 175, 55, 0.1)',
                padding: '16px 32px',
                borderRadius: 12,
                marginBottom: 24
              }}>
                <span style={{ fontSize: 56, fontWeight: 700, color: '#d4af37' }}>
                  {loading ? '...' : `${vault?.currentApy || 0}%`}
                </span>
                <span style={{ fontSize: 20, color: '#9ca3af' }}>APY</span>
              </div>

              {isConnected && position && parseFloat(position.positionValue) > 0 && (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  padding: 20, 
                  borderRadius: 12, 
                  border: '2px solid #d4af37',
                  maxWidth: 400,
                  margin: '0 auto 24px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <p style={{ fontSize: 14, color: '#d4af37', marginBottom: 4 }}>Your Savings Balance</p>
                  <p style={{ fontSize: 32, fontWeight: 700, color: '#ffffff' }}>
                    ${parseFloat(position.positionValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>
                    Earning {vault?.currentApy || 8.5}% APY
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowDepositModal(true)}
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
                  {isConnected && position && parseFloat(position.positionValue) > 0 
                    ? 'Deposit / Withdraw' 
                    : isConnected 
                      ? 'Open Account' 
                      : 'Connect & Deposit'}
                </button>
                <Link href="/lending-fund/docs" style={{
                  padding: '16px 32px',
                  background: 'transparent',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 16,
                  border: '2px solid #4b5563'
                }}>
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 48 }}>
              <StatCard label="Total Deposits" value={loading ? '...' : formatUSD(stats?.totalDeposits || 0)} />
              <StatCard label="Depositors" value={loading ? '...' : String(stats?.totalDepositors || 0)} />
              <StatCard label="Yield Paid" value={loading ? '...' : formatUSD(stats?.totalYieldPaid || 0)} />
              <StatCard label="Utilization" value={loading ? '...' : `${stats?.utilizationRate || 0}%`} />
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Why Choose Axiom Savings?</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Your deposits fund real estate loans, generating stable cash-flow-backed yields.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              <FeatureCard 
                icon="📈" 
                title="Competitive Yields" 
                description="Earn significantly more than traditional savings accounts, backed by real asset performance."
              />
              <FeatureCard 
                icon="🔄" 
                title="Monthly Distributions" 
                description="Receive yield distributions monthly. Choose to compound or withdraw earnings."
              />
              <FeatureCard 
                icon="💵" 
                title="AXUSD Settlement" 
                description="All deposits and withdrawals settled in AXUSD stablecoin for transparency and efficiency."
              />
              <FeatureCard 
                icon="🛡️" 
                title="Real Asset Backing" 
                description="Yields generated from performing real estate loans with property collateral."
              />
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px', background: '#f8f9fa' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Tier Benefits</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Higher balances unlock APY boosts and additional benefits
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              {tiers.map((tier, index) => (
                <div key={tier.name} style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: 24,
                  border: index === tiers.length - 1 ? '2px solid #d4af37' : '1px solid #e5e7eb',
                  position: 'relative'
                }}>
                  {index === tiers.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      top: -12,
                      right: 16,
                      background: '#d4af37',
                      color: '#111827',
                      padding: '4px 12px',
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      Best Value
                    </div>
                  )}
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{tier.name}</h3>
                  <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                    Min: {formatUSD(tier.minBalance)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: '#d4af37' }}>
                      +{tier.apyBoost}%
                    </span>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>APY boost</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>APY History</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>Historical yield performance</p>

            <div style={{ 
              display: 'flex', 
              gap: 16, 
              overflowX: 'auto', 
              paddingBottom: 16,
              WebkitOverflowScrolling: 'touch'
            }}>
              {apyHistory.map((item) => (
                <div key={item.month} style={{
                  minWidth: 100,
                  background: '#f8f9fa',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{item.month}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#d4af37' }}>{item.apy}%</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px', background: '#111827' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>Start Earning Today</h2>
            <p style={{ color: '#9ca3af', marginBottom: 32 }}>
              Minimum deposit of just ${vault?.minDeposit || 100}. No lock-up period for standard tier.
            </p>
            <button
              onClick={() => setShowDepositModal(true)}
              style={{
                padding: '16px 48px',
                background: '#d4af37',
                color: '#111827',
                borderRadius: 8,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontSize: 18
              }}
            >
              Open Savings Account
            </button>
          </div>
        </section>
      </main>

      <VaultDepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        productKey="savings"
        productName="High Yield Savings"
        targetApy={`${vault?.currentApy || 8.5}%`}
        minDeposit={String(vault?.minDeposit || 100)}
        onSuccess={() => {
          if (address) {
            getVaultPosition('savings', address).then(setPosition);
          }
        }}
      />
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: 12,
      padding: 20,
      textAlign: 'center'
    }}>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{value}</p>
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
