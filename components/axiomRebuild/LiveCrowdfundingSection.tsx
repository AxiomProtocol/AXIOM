"use client";

import React, { useEffect, useState, useRef } from "react";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce } from "./analytics";

interface Campaign {
  id: number;
  title: string;
  subtitle: string;
  targetAmount: string;
  raisedAmount: string;
  investorCount: number;
  status: string;
  percentFunded: string;
  daysRemaining: number;
  minInvestment: string;
  landOption: {
    location: string;
    acreage: string;
    propertyType: string;
  };
}

interface CrowdfundingStats {
  total: number;
  active: number;
  total_raised: string;
  total_investors: number;
}

interface LiveCrowdfundingSectionProps {
  page?: 'home' | 'keygrow';
}

export function LiveCrowdfundingSection({ page = 'home' }: LiveCrowdfundingSectionProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CrowdfundingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce(`${page}_module_view`, `live_crowdfunding_${page}`, { module: 'live_crowdfunding' });
          }
        });
      },
      { threshold: 0.3 }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch('/api/land-acquisition/campaigns?status=live');
        const data = await res.json();
        if (data.success && data.data) {
          setCampaigns(data.data.campaigns?.slice(0, 2) || []);
          setStats(data.data.stats || null);
        }
      } catch (err) {
        console.error('Failed to fetch campaigns:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "rgba(26,26,46,0.5)" }}>Loading live projects...</div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        padding: "80px 20px",
        background: "linear-gradient(180deg, #ffffff 0%, rgba(0,212,170,0.05) 100%)"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,212,170,0.1)",
              padding: "8px 16px",
              borderRadius: 20,
              marginBottom: 16
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#00d4aa",
              animation: "pulse 2s infinite"
            }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#00d4aa" }}>
              LIVE NOW
            </span>
          </div>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#1a1a2e",
              marginBottom: 16,
              lineHeight: 1.2
            }}
          >
            Active Land Acquisition Projects
          </h2>
          <p
            style={{
              fontSize: 18,
              color: "rgba(26,26,46,0.7)",
              maxWidth: 600,
              margin: "0 auto",
              lineHeight: 1.6
            }}
          >
            Join our community in acquiring real land through SEC Reg CF compliant crowdfunding
          </p>
        </div>

        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              marginBottom: 48,
              maxWidth: 600,
              margin: "0 auto 48px"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#00d4aa" }}>
                {stats.active}
              </div>
              <div style={{ fontSize: 14, color: "rgba(26,26,46,0.6)" }}>
                Active Projects
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#7b68ee" }}>
                {formatCurrency(stats.total_raised)}
              </div>
              <div style={{ fontSize: 14, color: "rgba(26,26,46,0.6)" }}>
                Total Raised
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#d4af37" }}>
                {stats.total_investors}
              </div>
              <div style={{ fontSize: 14, color: "rgba(26,26,46,0.6)" }}>
                Community Investors
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 32
          }}
        >
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(20px)",
                borderRadius: web3Theme.radii.xl,
                overflow: "hidden",
                border: web3Theme.borders.subtle,
                boxShadow: web3Theme.shadows.card,
                transition: "transform 0.3s ease, box-shadow 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = web3Theme.shadows.cardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = web3Theme.shadows.card;
              }}
            >
              <div
                style={{
                  height: 160,
                  background: "linear-gradient(135deg, #00d4aa 0%, #7b68ee 100%)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <div style={{ textAlign: "center", color: "#fff" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🏞️</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>
                    {campaign.landOption.location}
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "rgba(255,255,255,0.2)",
                    backdropFilter: "blur(10px)",
                    padding: "6px 12px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff"
                  }}
                >
                  {campaign.landOption.acreage} Acres
                </div>
              </div>

              <div style={{ padding: 24 }}>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#1a1a2e",
                    marginBottom: 8
                  }}
                >
                  {campaign.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(26,26,46,0.6)",
                    marginBottom: 20,
                    lineHeight: 1.5
                  }}
                >
                  {campaign.subtitle}
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#00d4aa" }}>
                      {formatCurrency(campaign.raisedAmount)} raised
                    </span>
                    <span style={{ fontSize: 14, color: "rgba(26,26,46,0.5)" }}>
                      {campaign.percentFunded}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "rgba(0,212,170,0.1)",
                      borderRadius: 4,
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(parseFloat(campaign.percentFunded), 100)}%`,
                        background: "linear-gradient(90deg, #00d4aa, #7b68ee)",
                        borderRadius: 4,
                        transition: "width 0.5s ease"
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(26,26,46,0.5)",
                      marginTop: 4,
                      textAlign: "right"
                    }}
                  >
                    Goal: {formatCurrency(campaign.targetAmount)}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginBottom: 20,
                    padding: "12px 0",
                    borderTop: "1px solid rgba(26,26,46,0.08)",
                    borderBottom: "1px solid rgba(26,26,46,0.08)"
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                      {campaign.investorCount}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,46,0.5)" }}>
                      Investors
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                      ${campaign.minInvestment}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,46,0.5)" }}>
                      Min. Invest
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                      {campaign.daysRemaining}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,46,0.5)" }}>
                      Days Left
                    </div>
                  </div>
                </div>

                <a
                  href={`/land-acquisition?campaign=${campaign.id}`}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "14px 24px",
                    background: "linear-gradient(135deg, #00d4aa 0%, #00b894 100%)",
                    color: "#fff",
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 15,
                    textDecoration: "none",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,212,170,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  View Project Details
                </a>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <a
            href="/land-acquisition"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 32px",
              background: "transparent",
              border: "2px solid #00d4aa",
              color: "#00d4aa",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 16,
              textDecoration: "none",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#00d4aa";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#00d4aa";
            }}
          >
            View All Land Projects
            <span style={{ fontSize: 20 }}>→</span>
          </a>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
