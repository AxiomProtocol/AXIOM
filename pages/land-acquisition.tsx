import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

interface Stats {
  landOptions: { total: number; active: number; totalValue: string };
  crowdfunding: { total: number; live: number; totalRaised: string; investors: number };
  pools: { total: number; active: number; totalPooled: string; members: number };
  regCF: { maxRaise: number; maxNonAccredited: number; complianceStatus: string };
}

interface Campaign {
  id: number;
  title: string;
  subtitle: string;
  targetAmount: string;
  raisedAmount: string;
  investorCount: number;
  status: string;
  percentFunded: string;
  daysRemaining: number | null;
  featuredImage: string;
  requiresAccreditation: boolean;
  minInvestment: string;
  landOption: {
    location: string;
    acreage: string;
    propertyType: string;
  };
}

interface Pool {
  id: number;
  name: string;
  description: string;
  targetAmount: string;
  monthlyContribution: string;
  memberLimit: number;
  memberCount: number;
  totalContributed: string;
  status: string;
  percentFunded: string;
  spotsRemaining: number;
  landOption: {
    location: string;
    acreage: string;
    purchasePrice: string;
  } | null;
}

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  accent: '#7B68EE',
  dark: '#121212',
  muted: 'rgba(18, 18, 18, 0.74)',
  border: 'rgba(0, 0, 0, 0.06)',
  cardBg: 'rgba(255, 255, 255, 0.85)',
};

export default function LandAcquisitionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'crowdfunding' | 'pools' | 'how-it-works'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showRedirectBanner, setShowRedirectBanner] = useState(true);

  useEffect(() => {
    setMounted(true);
    async function fetchData() {
      try {
        const [statsRes, campaignsRes, poolsRes] = await Promise.all([
          fetch('/api/land-acquisition/stats'),
          fetch('/api/land-acquisition/campaigns'),
          fetch('/api/land-acquisition/pools')
        ]);

        const statsJson = await statsRes.json();
        const campaignsJson = await campaignsRes.json();
        const poolsJson = await poolsRes.json();

        if (statsJson.success) setStats(statsJson.data);
        if (campaignsJson.success) setCampaigns(campaignsJson.data?.campaigns || []);
        if (poolsJson.success) setPools(poolsJson.data?.pools || poolsJson.data || []);
      } catch (error) {
        console.error('Failed to fetch land acquisition data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatCurrency = (value: string | number) => {
    const num = parseFloat(String(value));
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <>
      <Head>
        <title>Land Acquisition | Axiom Protocol</title>
        <meta name="description" content="Community-powered land stewardship through coordinated resource pooling. Participate in land acquisition through governance-approved allocations." />
      </Head>

      <main style={{ background: '#FFFFFF', minHeight: '100vh' }}>
        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>

        {showRedirectBanner && (
          <div style={{
            background: 'linear-gradient(135deg, #00A389 0%, #7B68EE 100%)',
            color: '#FFFFFF',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: 500 }}>
              This page is being updated. Visit our new Land Stewardship Pipeline for the latest.
            </span>
            <Link 
              href="/land"
              style={{
                padding: '8px 20px',
                background: '#FFFFFF',
                color: '#00A389',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              View Land Candidates
            </Link>
            <button
              onClick={() => setShowRedirectBanner(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '4px'
              }}
            >
              x
            </button>
          </div>
        )}
        
        <section style={{ 
          padding: "80px 0 60px 0",
          background: "#FFFFFF",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 170, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 60%, rgba(123, 104, 238, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 20% 80%, rgba(255, 215, 0, 0.04) 0%, transparent 50%)
            `,
            pointerEvents: "none"
          }} />

          <div style={{
            position: "absolute",
            top: "50%",
            right: "-5%",
            width: "400px",
            height: "400px",
            opacity: mounted ? 0.6 : 0,
            transition: "opacity 1s ease",
            pointerEvents: "none"
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(0, 212, 170, 0.1) 100%)",
              borderRadius: "50%",
              filter: "blur(60px)",
              animation: "float 6s ease-in-out infinite"
            }} />
          </div>

          <div style={{
            position: "absolute",
            top: "20%",
            left: "-10%",
            width: "300px",
            height: "300px",
            opacity: mounted ? 0.4 : 0,
            transition: "opacity 1.2s ease 0.3s",
            pointerEvents: "none"
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(123, 104, 238, 0.12) 0%, rgba(0, 212, 170, 0.08) 100%)",
              borderRadius: "50%",
              filter: "blur(50px)",
              animation: "float 8s ease-in-out infinite"
            }} />
          </div>

          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", position: "relative" }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "24px",
              padding: "40px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)",
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              opacity: mounted ? 1 : 0,
              transition: "all 0.8s ease"
            }}>
              <div style={{ 
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(0, 212, 170, 0.1) 100%)",
                padding: "8px 16px",
                borderRadius: "100px",
                marginBottom: "20px"
              }}>
                <span style={{ fontSize: "14px" }}>🏛️</span>
                <span style={{ 
                  fontSize: "14px", 
                  fontWeight: 600, 
                  color: theme.dark,
                  letterSpacing: "0.02em"
                }}>
                  SEC REG CF COMPLIANT
                </span>
              </div>

              <h1 style={{ 
                margin: "0 0 16px 0", 
                fontSize: "clamp(32px, 5vw, 52px)", 
                fontWeight: 700, 
                lineHeight: 1.1,
                color: theme.dark
              }}>
                Community-Powered Land Acquisition
              </h1>

              <h2 style={{ 
                margin: "0 0 20px 0", 
                fontSize: "clamp(18px, 2.5vw, 24px)", 
                fontWeight: 500, 
                color: theme.muted,
                lineHeight: 1.4
              }}>
                Coordinate Land Stewardship Together
              </h2>

              <p style={{ 
                margin: "0 0 24px 0", 
                fontSize: "16px", 
                color: theme.muted,
                maxWidth: "700px",
                lineHeight: 1.6
              }}>
                Pool resources with your community for coordinated land acquisition. 
                Participate through governance-approved allocations and complete due diligence together.
              </p>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
                <button
                  onClick={() => {
                    setActiveTab('crowdfunding');
                    setTimeout(() => {
                      document.getElementById('tab-content')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 24px",
                    background: theme.primary,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 14px rgba(0, 212, 170, 0.3)"
                  }}
                >
                  <span>🌱</span> Explore Campaigns
                </button>
                <button
                  onClick={() => {
                    setActiveTab('pools');
                    setTimeout(() => {
                      document.getElementById('tab-content')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 24px",
                    background: "transparent",
                    color: theme.dark,
                    border: "1px solid rgba(0, 0, 0, 0.18)",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  <span>👥</span> Join Acquisition Pool
                </button>
              </div>

              <p style={{ 
                margin: 0, 
                fontSize: "13px", 
                color: "rgba(18, 18, 18, 0.5)",
                fontStyle: "italic"
              }}>
                Zero out-of-pocket capital required. AXUSD payments accepted. Fractional ownership with governance rights.
              </p>
            </div>
          </div>
        </section>

        <section style={{ 
          borderTop: `1px solid ${theme.border}`,
          padding: "40px 0"
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
              <div style={{
                background: "linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(0, 212, 170, 0.04) 100%)",
                border: "1px solid rgba(255, 215, 0, 0.2)",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏞️</div>
                <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Land Options</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: theme.dark }}>
                  {loading ? '...' : stats?.landOptions.active || 0}
                </div>
                <div style={{ fontSize: "13px", color: theme.primary, fontWeight: 500 }}>
                  {loading ? '...' : formatCurrency(stats?.landOptions.totalValue || '0')} Value
                </div>
              </div>

              <div style={{
                background: "linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(123, 104, 238, 0.04) 100%)",
                border: "1px solid rgba(0, 212, 170, 0.2)",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>💰</div>
                <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Total Raised</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: theme.dark }}>
                  {loading ? '...' : formatCurrency(stats?.crowdfunding.totalRaised || '0')}
                </div>
                <div style={{ fontSize: "13px", color: theme.primary, fontWeight: 500 }}>
                  {loading ? '...' : stats?.crowdfunding.investors || 0} Participants
                </div>
              </div>

              <div style={{
                background: "linear-gradient(135deg, rgba(123, 104, 238, 0.08) 0%, rgba(0, 212, 170, 0.04) 100%)",
                border: "1px solid rgba(123, 104, 238, 0.2)",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>👥</div>
                <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Active Pools</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: theme.dark }}>
                  {loading ? '...' : stats?.pools.active || 0}
                </div>
                <div style={{ fontSize: "13px", color: theme.accent, fontWeight: 500 }}>
                  {loading ? '...' : stats?.pools.members || 0} Members
                </div>
              </div>

              <div style={{
                background: "linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(255, 215, 0, 0.04) 100%)",
                border: "1px solid rgba(0, 212, 170, 0.2)",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏛️</div>
                <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Reg CF Max</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: theme.dark }}>$5M</div>
                <div style={{ fontSize: "13px", color: theme.primary, fontWeight: 500 }}>Per Raise</div>
              </div>
            </div>

            <div style={{ 
              marginTop: "24px", 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "12px" 
            }}>
              <Link href="/land-acquisition/portfolio" style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 20px",
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "12px",
                textDecoration: "none",
                color: theme.dark,
                fontWeight: 500,
                transition: "all 0.2s"
              }}>
                <span>📊</span> My Portfolio
              </Link>
              <Link href="/land-acquisition/market" style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 20px",
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "12px",
                textDecoration: "none",
                color: theme.dark,
                fontWeight: 500,
                transition: "all 0.2s"
              }}>
                <span>🔄</span> Secondary Market
              </Link>
              <Link href="/land-acquisition/voting" style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 20px",
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "12px",
                textDecoration: "none",
                color: theme.dark,
                fontWeight: 500,
                transition: "all 0.2s"
              }}>
                <span>🗳️</span> Token Holder Voting
              </Link>
            </div>
          </div>
        </section>

        <section style={{ borderTop: `1px solid ${theme.border}`, padding: "20px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
              {(['overview', 'crowdfunding', 'pools', 'how-it-works'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "12px 24px",
                    background: activeTab === tab ? theme.primary : "transparent",
                    color: activeTab === tab ? "#FFFFFF" : theme.dark,
                    border: activeTab === tab ? "none" : "1px solid rgba(0, 0, 0, 0.12)",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  {tab === 'overview' && '📊 Overview'}
                  {tab === 'crowdfunding' && '🎯 Crowdfunding'}
                  {tab === 'pools' && '👥 Acquisition Pools'}
                  {tab === 'how-it-works' && '📖 How It Works'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="tab-content" style={{ padding: "40px 0 80px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            
            {activeTab === 'overview' && (
              <div>
                <div style={{
                  background: "linear-gradient(135deg, rgba(255, 215, 0, 0.06) 0%, rgba(0, 212, 170, 0.04) 100%)",
                  border: "1px solid rgba(255, 215, 0, 0.15)",
                  borderRadius: "20px",
                  padding: "40px",
                  marginBottom: "40px"
                }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 700, color: theme.dark }}>
                    The Land Acquisition Flywheel
                  </h3>
                  <p style={{ margin: "0 0 32px", color: theme.muted, maxWidth: 700 }}>
                    A four-phase system that turns community contributions into real land ownership
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
                    {[
                      { icon: "🔍", title: "1. Scout & Option", desc: "Steward Corps identifies land and negotiates purchase options with landowners", color: "rgba(255, 215, 0, 0.15)" },
                      { icon: "🪙", title: "2. Tokenize & Fund", desc: "Land shares tokenized as ERC-1155. Community invests via Reg CF crowdfunding", color: "rgba(0, 212, 170, 0.15)" },
                      { icon: "🤝", title: "3. Pool & Contribute", desc: "SUSU-style monthly contributions build collective purchasing power", color: "rgba(123, 104, 238, 0.15)" },
                      { icon: "🏡", title: "4. Acquire & Develop", desc: "Exercise option, transfer deed. Revenue flows to SEED holders (50%)", color: "rgba(0, 212, 170, 0.15)" }
                    ].map((phase, i) => (
                      <div key={i} style={{
                        background: phase.color,
                        border: "1px solid rgba(0, 0, 0, 0.06)",
                        borderRadius: "16px",
                        padding: "24px",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: "36px", marginBottom: "12px" }}>{phase.icon}</div>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: theme.dark, marginBottom: "8px" }}>{phase.title}</div>
                        <div style={{ fontSize: "14px", color: theme.muted, lineHeight: 1.5 }}>{phase.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <h3 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: 600, color: theme.dark }}>Who Benefits?</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                  <div style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "16px",
                    overflow: "hidden"
                  }}>
                    <img 
                      src="/images/land-acquisition/tokenized_land_shares_tokens.png" 
                      alt="For Investors"
                      style={{ width: "100%", height: "180px", objectFit: "cover" }}
                    />
                    <div style={{ padding: "20px" }}>
                      <h4 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600, color: theme.dark }}>
                        👤 For Investors
                      </h4>
                      <ul style={{ margin: 0, padding: "0 0 0 18px", color: theme.muted, fontSize: "14px" }}>
                        <li>Fractional ownership in real property</li>
                        <li>$100 minimum investment</li>
                        <li>SEED governance voting rights</li>
                        <li>Revenue share from development</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "16px",
                    overflow: "hidden"
                  }}>
                    <img 
                      src="/images/land-acquisition/community_crowdfunding_visualization.png" 
                      alt="For Landowners"
                      style={{ width: "100%", height: "180px", objectFit: "cover" }}
                    />
                    <div style={{ padding: "20px" }}>
                      <h4 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600, color: theme.dark }}>
                        🌾 For Landowners
                      </h4>
                      <ul style={{ margin: 0, padding: "0 0 0 18px", color: theme.muted, fontSize: "14px" }}>
                        <li>Immediate cash flow via option fees</li>
                        <li>Guaranteed buyer at agreed price</li>
                        <li>AXUSD payments (swap to USDC anytime)</li>
                        <li>No carrying costs during option period</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "16px",
                    overflow: "hidden"
                  }}>
                    <img 
                      src="/images/land-acquisition/susu_pooling_community_hands.png" 
                      alt="For the Protocol"
                      style={{ width: "100%", height: "180px", objectFit: "cover" }}
                    />
                    <div style={{ padding: "20px" }}>
                      <h4 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600, color: theme.dark }}>
                        🏛️ For the Protocol
                      </h4>
                      <ul style={{ margin: 0, padding: "0 0 0 18px", color: theme.muted, fontSize: "14px" }}>
                        <li>2.5% platform fee on transactions</li>
                        <li>Land-backed AXUSD stability</li>
                        <li>30% revenue to treasury</li>
                        <li>Real asset backing for ecosystem</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'crowdfunding' && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: theme.dark }}>Active Campaigns</h3>
                    <p style={{ margin: "4px 0 0", color: theme.muted, fontSize: "14px" }}>SEC-compliant Reg CF crowdfunding opportunities</p>
                  </div>
                  <div style={{
                    background: "linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(0, 212, 170, 0.06) 100%)",
                    border: "1px solid rgba(255, 215, 0, 0.2)",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: theme.dark
                  }}>
                    Reg CF: Up to $5M per raise
                  </div>
                </div>

                {loading ? (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{ fontSize: "32px", marginBottom: "16px" }}>⏳</div>
                    <p style={{ color: theme.muted }}>Loading campaigns...</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(255, 215, 0, 0.06) 0%, rgba(0, 212, 170, 0.04) 100%)",
                    border: "1px solid rgba(255, 215, 0, 0.15)",
                    borderRadius: "20px",
                    padding: "60px 40px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "48px", marginBottom: "20px" }}>🏗️</div>
                    <h3 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 600, color: theme.dark }}>Coming Soon</h3>
                    <p style={{ margin: "0 0 20px", color: theme.muted, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                      Our Steward Corps is actively scouting land opportunities. Be the first to invest in community land acquisition campaigns.
                    </p>
                    <div style={{
                      display: "inline-block",
                      background: "rgba(0, 212, 170, 0.1)",
                      border: "1px solid rgba(0, 212, 170, 0.2)",
                      borderRadius: "8px",
                      padding: "12px 20px",
                      fontSize: "14px",
                      color: theme.primary,
                      fontWeight: 500
                    }}>
                      📧 Get notified when campaigns launch
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} style={{
                        background: theme.cardBg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "16px",
                        overflow: "hidden",
                        transition: "all 0.3s ease"
                      }}>
                        <div style={{ height: "180px", background: "linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(0, 212, 170, 0.1) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {campaign.featuredImage ? (
                            <img src={campaign.featuredImage} alt={campaign.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "48px" }}>🏞️</span>
                          )}
                        </div>
                        <div style={{ padding: "20px" }}>
                          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: campaign.status === 'live' ? "rgba(0, 212, 170, 0.1)" : "rgba(123, 104, 238, 0.1)",
                              color: campaign.status === 'live' ? theme.primary : theme.accent
                            }}>
                              {campaign.status?.toUpperCase()}
                            </span>
                          </div>
                          <h4 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 600, color: theme.dark }}>{campaign.title}</h4>
                          <p style={{ margin: "0 0 16px", fontSize: "14px", color: theme.muted }}>{campaign.landOption?.location}</p>
                          
                          <div style={{ marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                              <span style={{ color: theme.muted }}>Progress</span>
                              <span style={{ fontWeight: 600, color: theme.dark }}>{campaign.percentFunded}%</span>
                            </div>
                            <div style={{ height: "8px", background: "rgba(0, 0, 0, 0.06)", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.min(100, parseFloat(campaign.percentFunded || '0'))}%`,
                                background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                                borderRadius: "4px"
                              }} />
                            </div>
                          </div>

                          <button style={{
                            width: "100%",
                            padding: "12px",
                            background: theme.primary,
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}>
                            Invest Now - Min {formatCurrency(campaign.minInvestment || '100')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pools' && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: theme.dark }}>Acquisition Pools</h3>
                    <p style={{ margin: "4px 0 0", color: theme.muted, fontSize: "14px" }}>SUSU-style community pooling for land purchases</p>
                  </div>
                  <div style={{
                    background: "linear-gradient(135deg, rgba(123, 104, 238, 0.1) 0%, rgba(0, 212, 170, 0.06) 100%)",
                    border: "1px solid rgba(123, 104, 238, 0.2)",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: theme.dark
                  }}>
                    Monthly Contributions Build Wealth
                  </div>
                </div>

                {loading ? (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{ fontSize: "32px", marginBottom: "16px" }}>⏳</div>
                    <p style={{ color: theme.muted }}>Loading pools...</p>
                  </div>
                ) : pools.length === 0 ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(123, 104, 238, 0.06) 0%, rgba(0, 212, 170, 0.04) 100%)",
                    border: "1px solid rgba(123, 104, 238, 0.15)",
                    borderRadius: "20px",
                    padding: "60px 40px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "48px", marginBottom: "20px" }}>🤝</div>
                    <h3 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 600, color: theme.dark }}>Pools Forming Soon</h3>
                    <p style={{ margin: "0 0 20px", color: theme.muted, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                      Join a community pool to collectively acquire land through monthly contributions. Pools will be created once land options are secured.
                    </p>
                    <div style={{
                      display: "inline-block",
                      background: "rgba(123, 104, 238, 0.1)",
                      border: "1px solid rgba(123, 104, 238, 0.2)",
                      borderRadius: "8px",
                      padding: "12px 20px",
                      fontSize: "14px",
                      color: theme.accent,
                      fontWeight: 500
                    }}>
                      📧 Get notified when pools open
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "24px" }}>
                    {pools.map((pool) => (
                      <div key={pool.id} style={{
                        background: theme.cardBg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "16px",
                        padding: "24px",
                        transition: "all 0.3s ease"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                          <div>
                            <h4 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 600, color: theme.dark }}>{pool.name}</h4>
                            <p style={{ margin: 0, fontSize: "14px", color: theme.muted }}>{pool.landOption?.location || 'General Acquisition'}</p>
                          </div>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: pool.status === 'active' ? "rgba(0, 212, 170, 0.1)" : "rgba(255, 215, 0, 0.1)",
                            color: pool.status === 'active' ? theme.primary : theme.secondary
                          }}>
                            {pool.status?.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                          <div style={{ background: "rgba(0, 0, 0, 0.03)", borderRadius: "8px", padding: "12px" }}>
                            <div style={{ fontSize: "12px", color: theme.muted }}>Monthly</div>
                            <div style={{ fontSize: "18px", fontWeight: 600, color: theme.dark }}>{formatCurrency(pool.monthlyContribution)}</div>
                          </div>
                          <div style={{ background: "rgba(0, 0, 0, 0.03)", borderRadius: "8px", padding: "12px" }}>
                            <div style={{ fontSize: "12px", color: theme.muted }}>Target</div>
                            <div style={{ fontSize: "18px", fontWeight: 600, color: theme.dark }}>{formatCurrency(pool.targetAmount)}</div>
                          </div>
                          <div style={{ background: "rgba(0, 0, 0, 0.03)", borderRadius: "8px", padding: "12px" }}>
                            <div style={{ fontSize: "12px", color: theme.muted }}>Members</div>
                            <div style={{ fontSize: "18px", fontWeight: 600, color: theme.dark }}>{pool.memberCount}/{pool.memberLimit}</div>
                          </div>
                          <div style={{ background: "rgba(0, 0, 0, 0.03)", borderRadius: "8px", padding: "12px" }}>
                            <div style={{ fontSize: "12px", color: theme.muted }}>Spots Left</div>
                            <div style={{ fontSize: "18px", fontWeight: 600, color: theme.accent }}>{pool.spotsRemaining}</div>
                          </div>
                        </div>

                        <button style={{
                          width: "100%",
                          padding: "12px",
                          background: theme.accent,
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "10px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}>
                          Join Pool - {formatCurrency(pool.monthlyContribution)}/month
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'how-it-works' && (
              <div>
                <div style={{
                  background: "linear-gradient(135deg, rgba(255, 215, 0, 0.06) 0%, rgba(0, 212, 170, 0.04) 100%)",
                  border: "1px solid rgba(255, 215, 0, 0.15)",
                  borderRadius: "20px",
                  padding: "40px",
                  marginBottom: "32px"
                }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 600, color: theme.dark }}>
                    Regulation Crowdfunding (Reg CF)
                  </h3>
                  <p style={{ margin: "0 0 24px", color: theme.muted, fontSize: "14px" }}>
                    SEC exemption allowing companies to raise up to $5M from both accredited and non-accredited investors
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    <div style={{ background: "rgba(255, 215, 0, 0.1)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                      <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Under $124K Income</div>
                      <div style={{ fontSize: "28px", fontWeight: 700, color: theme.dark }}>$2,500</div>
                      <div style={{ fontSize: "12px", color: theme.muted }}>Max annual investment</div>
                    </div>
                    <div style={{ background: "rgba(0, 212, 170, 0.1)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                      <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>$124K+ Income</div>
                      <div style={{ fontSize: "28px", fontWeight: 700, color: theme.dark }}>10%</div>
                      <div style={{ fontSize: "12px", color: theme.muted }}>Of income or net worth</div>
                    </div>
                    <div style={{ background: "rgba(123, 104, 238, 0.1)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                      <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Accredited</div>
                      <div style={{ fontSize: "28px", fontWeight: 700, color: theme.dark }}>Unlimited</div>
                      <div style={{ fontSize: "12px", color: theme.muted }}>No cap applies</div>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: "linear-gradient(135deg, rgba(123, 104, 238, 0.06) 0%, rgba(0, 212, 170, 0.04) 100%)",
                  border: "1px solid rgba(123, 104, 238, 0.15)",
                  borderRadius: "20px",
                  padding: "40px",
                  marginBottom: "32px"
                }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 600, color: theme.dark }}>
                    Pool Mechanics (SUSU-Style)
                  </h3>
                  <p style={{ margin: "0 0 24px", color: theme.muted, fontSize: "14px" }}>
                    Traditional community savings circles reimagined for land acquisition
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    {[
                      { step: "1", title: "Join a Pool", desc: "Choose a pool aligned with your goals. Initial contribution reserves your spot." },
                      { step: "2", title: "Monthly Contributions", desc: "Contribute monthly in AXUSD. Funds accumulate toward the target price." },
                      { step: "3", title: "Collective Purchase", desc: "When funded, the pool exercises the option. Members receive tokenized shares." }
                    ].map((item, i) => (
                      <div key={i} style={{ background: "rgba(123, 104, 238, 0.08)", borderRadius: "12px", padding: "20px" }}>
                        <div style={{
                          width: "32px",
                          height: "32px",
                          background: theme.accent,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFFFFF",
                          fontWeight: 700,
                          fontSize: "14px",
                          marginBottom: "12px"
                        }}>
                          {item.step}
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: theme.dark, marginBottom: "8px" }}>{item.title}</div>
                        <div style={{ fontSize: "14px", color: theme.muted, lineHeight: 1.5 }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: "rgba(0, 212, 170, 0.06)",
                  border: "1px solid rgba(0, 212, 170, 0.15)",
                  borderRadius: "20px",
                  padding: "40px"
                }}>
                  <h3 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: 600, color: theme.dark }}>
                    Smart Contract Architecture
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                    <div style={{ background: "rgba(0, 212, 170, 0.1)", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontSize: "24px", marginBottom: "8px" }}>📝</div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: theme.dark, marginBottom: "4px" }}>LandOptionRegistry</div>
                      <div style={{ fontSize: "13px", color: theme.muted }}>ERC-1155 tokenized land options with KYC/accreditation gating</div>
                    </div>
                    <div style={{ background: "rgba(255, 215, 0, 0.1)", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontSize: "24px", marginBottom: "8px" }}>💰</div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: theme.dark, marginBottom: "4px" }}>RegCFCrowdfunding</div>
                      <div style={{ fontSize: "13px", color: theme.muted }}>SEC-compliant investment tracking with annual limits</div>
                    </div>
                    <div style={{ background: "rgba(123, 104, 238, 0.1)", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontSize: "24px", marginBottom: "8px" }}>🤝</div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: theme.dark, marginBottom: "4px" }}>LandAcquisitionPool</div>
                      <div style={{ fontSize: "13px", color: theme.muted }}>SUSU-style monthly pooling with cycle management</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
