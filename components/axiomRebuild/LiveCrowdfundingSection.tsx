"use client";

import React, { useEffect, useState, useRef } from "react";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce } from "./analytics";

interface LandCandidate {
  id: number;
  name: string;
  location?: string;
  county?: string;
  state?: string;
  acreage?: string;
  askingPrice?: string;
  propertyType?: string;
  stage: string;
  stewardshipIntent?: string;
  publicSummary?: string;
  featuredImageUrl?: string;
  dueDiligenceProgress?: number;
}

interface LandStats {
  totalCandidates: number;
  totalAcreage: number;
  underReview: number;
  readyForVote: number;
  acquired: number;
}

interface LiveCrowdfundingSectionProps {
  page?: 'home' | 'keygrow';
}

export function LiveCrowdfundingSection({ page = 'home' }: LiveCrowdfundingSectionProps) {
  const [candidates, setCandidates] = useState<LandCandidate[]>([]);
  const [stats, setStats] = useState<LandStats | null>(null);
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
    async function fetchLandData() {
      try {
        const [candidatesRes, statsRes] = await Promise.all([
          fetch('/api/land/candidates'),
          fetch('/api/land/stats')
        ]);
        
        const candidatesData = await candidatesRes.json();
        const statsData = await statsRes.json();
        
        if (candidatesData.success && candidatesData.data) {
          setCandidates(candidatesData.data.slice(0, 3) || []);
        }
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
        }
      } catch (err) {
        console.error('Failed to fetch land candidates:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLandData();
  }, []);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const getStageLabel = (stage: string) => {
    const stages: Record<string, string> = {
      'candidate': 'New Candidate',
      'under_review': 'Under Review',
      'due_diligence': 'Due Diligence',
      'ready_for_vote': 'Ready for Vote',
      'approved_for_execution': 'Approved',
      'acquired': 'Acquired'
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'candidate': '#7b68ee',
      'under_review': '#00d4aa',
      'due_diligence': '#f59e0b',
      'ready_for_vote': '#3b82f6',
      'approved_for_execution': '#22c55e',
      'acquired': '#10b981'
    };
    return colors[stage] || '#00d4aa';
  };

  const getPropertyIcon = (propertyType?: string) => {
    const icons: Record<string, string> = {
      'agricultural': '🌾',
      'mixed_use': '🏡',
      'urban': '🏙️',
      'recreational': '🏕️',
      'residential': '🏠'
    };
    return icons[propertyType || ''] || '🏞️';
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "rgba(26,26,46,0.5)" }}>Loading land candidates...</div>
      </div>
    );
  }

  if (candidates.length === 0) {
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
              STEWARDSHIP PIPELINE
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
            Active Land Candidates
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
            Properties under review for potential community stewardship through structured participation
          </p>
        </div>

        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 24,
              marginBottom: 48,
              maxWidth: 700,
              margin: "0 auto 48px"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#00d4aa" }}>
                {stats.totalCandidates}
              </div>
              <div style={{ fontSize: 14, color: "rgba(26,26,46,0.6)" }}>
                Total Candidates
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#7b68ee" }}>
                {stats.totalAcreage}
              </div>
              <div style={{ fontSize: 14, color: "rgba(26,26,46,0.6)" }}>
                Total Acres
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}>
                {stats.underReview}
              </div>
              <div style={{ fontSize: 14, color: "rgba(26,26,46,0.6)" }}>
                Under Review
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#22c55e" }}>
                {stats.acquired}
              </div>
              <div style={{ fontSize: 14, color: "rgba(26,26,46,0.6)" }}>
                Acquired
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
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
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
                  background: candidate.featuredImageUrl 
                    ? `url(${candidate.featuredImageUrl}) center/cover`
                    : "linear-gradient(135deg, #00d4aa 0%, #7b68ee 100%)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {!candidate.featuredImageUrl && (
                  <div style={{ textAlign: "center", color: "#fff" }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>{getPropertyIcon(candidate.propertyType)}</div>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>
                      {candidate.location || `${candidate.county}, ${candidate.state}`}
                    </div>
                  </div>
                )}
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
                  {candidate.acreage} Acres
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    background: getStageColor(candidate.stage),
                    padding: "6px 12px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    textTransform: "uppercase"
                  }}
                >
                  {getStageLabel(candidate.stage)}
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
                  {candidate.name}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(26,26,46,0.6)",
                    marginBottom: 20,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}
                >
                  {candidate.publicSummary || candidate.stewardshipIntent}
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
                      Due Diligence Progress
                    </span>
                    <span style={{ fontSize: 14, color: "rgba(26,26,46,0.5)" }}>
                      {candidate.dueDiligenceProgress || 0}%
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
                        width: `${candidate.dueDiligenceProgress || 0}%`,
                        background: "linear-gradient(90deg, #00d4aa, #7b68ee)",
                        borderRadius: 4,
                        transition: "width 0.5s ease"
                      }}
                    />
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
                      {formatCurrency(candidate.askingPrice || '0')}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,46,0.5)" }}>
                      Asking Price
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                      {candidate.acreage}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,46,0.5)" }}>
                      Acres
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", textTransform: "capitalize" }}>
                      {candidate.propertyType?.replace('_', ' ') || 'Land'}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,46,0.5)" }}>
                      Type
                    </div>
                  </div>
                </div>

                <a
                  href={`/land/${candidate.id}`}
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
                  View Candidate Details
                </a>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <a
            href="/land"
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
            View All Land Candidates
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
