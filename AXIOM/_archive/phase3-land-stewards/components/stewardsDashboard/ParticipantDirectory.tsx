import React, { useState } from 'react';

type ParticipantSegment = 'all' | 'new' | 'highReliability' | 'atRisk' | 'stewardCandidates' | 'landScouts';

interface Participant {
  wallet: string;
  displayName?: string;
  joinDate: string;
  activityScore: number;
  participationPath?: string;
  flags?: string[];
}

interface ParticipantDirectoryProps {
  participants: Participant[];
  onSelectParticipant?: (wallet: string) => void;
  loading?: boolean;
}

export function ParticipantDirectory({ participants, onSelectParticipant, loading }: ParticipantDirectoryProps) {
  const [segment, setSegment] = useState<ParticipantSegment>('all');
  const [search, setSearch] = useState('');

  const segments: { id: ParticipantSegment; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New (14d)' },
    { id: 'highReliability', label: 'High Reliability' },
    { id: 'atRisk', label: 'At Risk' },
    { id: 'stewardCandidates', label: 'Steward Candidates' },
    { id: 'landScouts', label: 'Land Scouts' }
  ];

  const filterParticipants = (list: Participant[]) => {
    let filtered = list;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.wallet.toLowerCase().includes(searchLower) ||
        p.displayName?.toLowerCase().includes(searchLower)
      );
    }

    const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    
    switch (segment) {
      case 'new':
        filtered = filtered.filter(p => new Date(p.joinDate).getTime() > fourteenDaysAgo);
        break;
      case 'highReliability':
        filtered = filtered.filter(p => p.activityScore >= 80);
        break;
      case 'atRisk':
        filtered = filtered.filter(p => p.flags?.includes('atRisk') || p.activityScore < 30);
        break;
      case 'stewardCandidates':
        filtered = filtered.filter(p => p.activityScore >= 70 && p.participationPath === 'steward');
        break;
      case 'landScouts':
        filtered = filtered.filter(p => p.participationPath === 'land');
        break;
    }

    return filtered;
  };

  const formatWallet = (wallet: string) => `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  const filteredParticipants = filterParticipants(participants);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00D4AA';
    if (score >= 50) return '#FFB800';
    return '#FF6B6B';
  };

  if (loading) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <p style={{ color: '#666' }}>Loading participants...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {segments.map(seg => (
            <button
              key={seg.id}
              onClick={() => setSegment(seg.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: 'none',
                background: segment === seg.id ? 'rgba(0,212,170,0.15)' : 'rgba(0,0,0,0.04)',
                color: segment === seg.id ? '#00D4AA' : '#666',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {seg.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by wallet or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.1)',
            fontSize: '13px',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {filteredParticipants.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No participants found
          </div>
        ) : (
          filteredParticipants.map((p) => (
            <div
              key={p.wallet}
              onClick={() => onSelectParticipant?.(p.wallet)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: onSelectParticipant ? 'pointer' : 'default',
                transition: 'background 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0,212,170,0.2) 0%, rgba(123,104,238,0.2) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}>
                  👤
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                    {p.displayName || formatWallet(p.wallet)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>
                    Joined {new Date(p.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div style={{
                padding: '4px 10px',
                borderRadius: '12px',
                background: `${getScoreColor(p.activityScore)}15`,
                color: getScoreColor(p.activityScore),
                fontSize: '12px',
                fontWeight: 600
              }}>
                {p.activityScore}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(0,0,0,0.02)',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Showing {filteredParticipants.length} of {participants.length} participants
      </div>
    </div>
  );
}

export default ParticipantDirectory;
