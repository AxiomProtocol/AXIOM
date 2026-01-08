import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';
import LandCandidateCard from '../components/land/LandCandidateCard';

const landImage = "/images/land_stewardship_pipeline_illustration.png";

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
  isAccessVerified?: boolean;
  isTitleReviewed?: boolean;
  isSurveyVerified?: boolean;
  isEnvironmentalScreened?: boolean;
}

interface Stats {
  totalCandidates: number;
  underReview: number;
  readyForVote: number;
  acquired: number;
  totalAcreage: number;
}

export default function LandPage() {
  const [candidates, setCandidates] = useState<LandCandidate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [candidatesRes, statsRes] = await Promise.all([
          fetch('/api/land/candidates'),
          fetch('/api/land/stats')
        ]);

        const candidatesJson = await candidatesRes.json();
        const statsJson = await statsRes.json();

        if (candidatesJson.success) setCandidates(candidatesJson.data || []);
        if (statsJson.success) setStats(statsJson.data);
      } catch (error) {
        console.error('Failed to fetch land data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredCandidates = candidates.filter(c => {
    const matchesStage = filter === 'all' || c.stage === filter;
    const matchesSearch = !searchQuery || 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.county?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.propertyType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.stewardshipIntent?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  const visibleStages = ['candidate', 'under_review', 'due_diligence', 'ready_for_vote', 'approved_for_execution', 'acquired'];

  return (
    <SiteLayout>
      <Head>
        <title>Land Candidates | Axiom Protocol</title>
        <meta name="description" content="Explore land stewardship candidates under review by the Axiom Protocol community. Transparent due diligence and governance-driven acquisition." />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <div style={{
          position: "relative",
          padding: "80px 0 60px 0",
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
              radial-gradient(ellipse 50% 30% at 20% 80%, rgba(34, 197, 94, 0.06) 0%, transparent 50%)
            `,
            pointerEvents: "none"
          }} />

          <div className="max-w-6xl mx-auto px-4" style={{ position: "relative" }}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div style={{ 
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(0, 212, 170, 0.08) 100%)",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  marginBottom: "20px",
                  border: "1px solid rgba(34, 197, 94, 0.2)"
                }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    background: "linear-gradient(135deg, #22C55E 0%, #00A389 100%)",
                    borderRadius: "50%"
                  }} />
                  <span style={{ 
                    fontSize: "13px", 
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#16A34A"
                  }}>Stewardship Pipeline</span>
                </div>
                
                <h1 style={{ 
                  fontSize: "clamp(32px, 5vw, 48px)", 
                  lineHeight: 1.1, 
                  margin: "0 0 16px 0",
                  fontWeight: 700,
                  color: "#0A0F1C"
                }}>Land Candidates</h1>
                
                <p style={{ 
                  fontSize: "18px", 
                  lineHeight: 1.6,
                  color: "rgba(10, 15, 28, 0.65)", 
                  maxWidth: "500px",
                  margin: 0
                }}>
                  Properties under review for potential community stewardship. Acquisition occurs only after governance approval and due diligence completion.
                </p>
              </div>
              
              <div className="hidden lg:block">
                <img 
                  src={landImage} 
                  alt="Land stewardship pipeline illustration"
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "24px",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: "Candidates", value: stats.totalCandidates, color: "#0A0F1C" },
                { label: "Under Review", value: stats.underReview, color: "#D97706" },
                { label: "Ready for Vote", value: stats.readyForVote, color: "#7C3AED" },
                { label: "Acquired", value: stats.acquired, color: "#16A34A" },
                { label: "Total Acres", value: stats.totalAcreage?.toLocaleString(), color: "#0A0F1C" }
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  padding: "20px",
                  textAlign: "center",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)"
                }}>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{
            background: "rgba(255, 215, 0, 0.08)",
            border: "1px solid rgba(255, 215, 0, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "32px"
          }}>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">About Land Candidates</h3>
                <p className="text-sm text-amber-800">
                  Land candidates are properties identified for potential community stewardship. They are not offerings or investments. 
                  Each candidate goes through due diligence review and must be approved by governance vote before any acquisition proceeds.
                  PMA membership is required to participate in voting and resource allocation.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search by name, location, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 48px",
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  fontSize: "15px",
                  background: "#FFFFFF",
                  outline: "none"
                }}
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s",
                background: filter === 'all' 
                  ? "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)" 
                  : "white",
                color: filter === 'all' ? "white" : "#4B5563",
                border: filter === 'all' ? "none" : "1px solid #E5E7EB"
              }}
            >
              All
            </button>
            {visibleStages.map(stage => (
              <button
                key={stage}
                onClick={() => setFilter(stage)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  textTransform: "capitalize",
                  background: filter === stage 
                    ? "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)" 
                    : "white",
                  color: filter === stage ? "white" : "#4B5563",
                  border: filter === stage ? "none" : "1px solid #E5E7EB"
                }}
              >
                {stage.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "24px",
              padding: "64px",
              textAlign: "center"
            }}>
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'There are currently no land candidates in the pipeline.' 
                  : `No candidates in the "${filter.replace(/_/g, ' ')}" stage.`}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map(candidate => (
                <LandCandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )}

          <div style={{
            marginTop: "48px",
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            borderRadius: "24px",
            padding: "40px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06)"
          }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Stewardship Pipeline Process</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div style={{
                  width: "40px",
                  height: "40px",
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px"
                }}>
                  <span className="text-blue-700 font-bold">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Identification</h3>
                <p className="text-sm text-gray-600">
                  Properties are identified through landowner submissions, steward research, or community referrals. Initial screening assesses alignment with stewardship goals.
                </p>
              </div>
              <div>
                <div style={{
                  width: "40px",
                  height: "40px",
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px"
                }}>
                  <span className="text-amber-700 font-bold">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Due Diligence</h3>
                <p className="text-sm text-gray-600">
                  Candidates undergo thorough review: access verification, title review, environmental screening, and survey confirmation. Progress is tracked publicly.
                </p>
              </div>
              <div>
                <div style={{
                  width: "40px",
                  height: "40px",
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.2) 100%)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px"
                }}>
                  <span className="text-green-700 font-bold">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Governance Vote</h3>
                <p className="text-sm text-gray-600">
                  Once due diligence is complete, members vote on acquisition through governance proposals. Only approved candidates proceed to acquisition.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/participate"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)",
                color: "white",
                fontWeight: 600,
                padding: "14px 28px",
                borderRadius: "12px",
                textDecoration: "none"
              }}
            >
              View Purpose Pools
            </Link>
            <Link
              href="/system"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                border: "1px solid #D1D5DB",
                color: "#374151",
                fontWeight: 600,
                padding: "14px 28px",
                borderRadius: "12px",
                textDecoration: "none"
              }}
            >
              How the System Works
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
