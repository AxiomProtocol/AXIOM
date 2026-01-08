import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';
import LandCandidateCard from '../components/land/LandCandidateCard';

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
    if (filter === 'all') return true;
    return c.stage === filter;
  });

  const visibleStages = ['candidate', 'under_review', 'due_diligence', 'ready_for_vote', 'approved_for_execution', 'acquired'];

  return (
    <SiteLayout>
      <Head>
        <title>Land Candidates | Axiom Protocol</title>
        <meta name="description" content="Explore land stewardship candidates under review by the Axiom Protocol community. Transparent due diligence and governance-driven acquisition." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          <div className="max-w-6xl mx-auto px-4 relative">
            <span className="inline-block bg-emerald-600/50 text-emerald-100 px-3 py-1 rounded-full text-sm font-medium mb-4">
              Stewardship Pipeline
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Land Candidates</h1>
            <p className="text-xl text-emerald-100 max-w-2xl">
              Properties under review for potential community stewardship. Acquisition occurs only after governance approval and due diligence completion.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</p>
                <p className="text-sm text-gray-500">Candidates</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.underReview}</p>
                <p className="text-sm text-gray-500">Under Review</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.readyForVote}</p>
                <p className="text-sm text-gray-500">Ready for Vote</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.acquired}</p>
                <p className="text-sm text-gray-500">Acquired</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalAcreage?.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Acres</p>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
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

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {visibleStages.map(stage => (
              <button
                key={stage}
                onClick={() => setFilter(stage)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  filter === stage 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {stage.replace('_', ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'There are currently no land candidates in the pipeline.' 
                  : `No candidates in the "${filter.replace('_', ' ')}" stage.`}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map(candidate => (
                <LandCandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )}

          <div className="mt-12 bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Stewardship Pipeline Process</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-blue-700 font-bold">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Identification</h3>
                <p className="text-sm text-gray-600">
                  Properties are identified through landowner submissions, steward research, or community referrals. Initial screening assesses alignment with stewardship goals.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-amber-700 font-bold">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Due Diligence</h3>
                <p className="text-sm text-gray-600">
                  Candidates undergo thorough review: access verification, title review, environmental screening, and survey confirmation. Progress is tracked publicly.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-green-700 font-bold">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Governance Vote</h3>
                <p className="text-sm text-gray-600">
                  Once due diligence is complete, members vote on acquisition through governance proposals. Only approved candidates proceed to acquisition.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/participate"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View Purpose Pools
            </Link>
            <Link
              href="/landowners/submit"
              className="inline-flex items-center gap-2 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Submit a Property
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
