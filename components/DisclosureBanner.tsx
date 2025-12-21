import { useState, useEffect } from 'react';

interface Disclosure {
  id: number;
  title: string;
  content: string;
  category: string;
  requires_acknowledgement: boolean;
  display_location: string;
}

interface DisclosureBannerProps {
  featureId: string;
  location?: string;
  onAcknowledge?: (disclosureId: number) => void;
  walletAddress?: string;
  compact?: boolean;
}

const categoryStyles: Record<string, { bg: string; border: string; icon: string }> = {
  tokenomics: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '📋' },
  regulatory: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '📋' },
  keygrow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '🏠' },
  treasury: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '💰' },
  security: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '🔒' },
  governance: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '🗳️' },
  depin: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '⚡' },
  banking: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '🏦' },
  smart_contract: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '📜' },
  kyc_aml: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '🔍' },
  general: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: 'ℹ️' },
  default: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: 'ℹ️' }
};

export default function DisclosureBanner({ 
  featureId, 
  location, 
  onAcknowledge,
  walletAddress,
  compact = false 
}: DisclosureBannerProps) {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetchDisclosures();
  }, [featureId, location]);

  useEffect(() => {
    if (walletAddress && disclosures.length > 0) {
      checkAcknowledgements();
    }
  }, [walletAddress, disclosures]);

  const fetchDisclosures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ featureId });
      if (location) params.append('location', location);
      
      const res = await fetch(`/api/compliance/disclosures?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDisclosures(data.disclosures || []);
      }
    } catch (error) {
      console.error('Failed to fetch disclosures:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAcknowledgements = async () => {
    if (!walletAddress) return;
    
    try {
      const disclosureIds = disclosures.map(d => d.id).join(',');
      const res = await fetch(`/api/compliance/acknowledge?wallet=${walletAddress}&disclosureIds=${disclosureIds}`);
      if (res.ok) {
        const data = await res.json();
        setAcknowledged(new Set(data.acknowledgedIds || []));
      }
    } catch (error) {
      console.error('Failed to check acknowledgements:', error);
    }
  };

  const handleAcknowledge = async (disclosureId: number) => {
    if (!walletAddress) return;
    
    try {
      const res = await fetch('/api/compliance/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disclosureId,
          userWallet: walletAddress
        })
      });
      
      if (res.ok) {
        setAcknowledged(prev => new Set([...prev, disclosureId]));
        onAcknowledge?.(disclosureId);
      }
    } catch (error) {
      console.error('Failed to acknowledge disclosure:', error);
    }
  };

  if (loading || disclosures.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {disclosures.map((disclosure) => {
        const style = categoryStyles[disclosure.category] || categoryStyles.default;
        const isAcknowledged = acknowledged.has(disclosure.id);
        const isExpanded = expanded === disclosure.id;
        
        return (
          <div
            key={disclosure.id}
            className={`${style.bg} ${style.border} border rounded-lg p-4 transition-all`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-xl">{style.icon}</span>
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    {disclosure.title}
                    {disclosure.requires_acknowledgement && isAcknowledged && (
                      <span className="text-green-400 text-xs">✓ Acknowledged</span>
                    )}
                  </h4>
                  {compact && !isExpanded ? (
                    <button 
                      onClick={() => setExpanded(disclosure.id)}
                      className="text-gray-400 text-xs hover:text-white underline"
                    >
                      Read more
                    </button>
                  ) : (
                    <p className="text-white/90 text-sm mt-1">{disclosure.content}</p>
                  )}
                </div>
              </div>
              
              {disclosure.requires_acknowledgement && !isAcknowledged && (
                walletAddress ? (
                  <button
                    onClick={() => handleAcknowledge(disclosure.id)}
                    className="ml-4 px-3 py-1 bg-yellow-500/20 border border-yellow-500 text-yellow-400 text-xs rounded hover:bg-yellow-500/30 transition-colors whitespace-nowrap"
                  >
                    I Understand
                  </button>
                ) : (
                  <span className="ml-4 px-3 py-1 bg-gray-700/50 border border-gray-500 text-gray-200 text-xs rounded whitespace-nowrap">
                    Connect wallet to acknowledge
                  </span>
                )
              )}
            </div>
            
            {compact && isExpanded && (
              <button 
                onClick={() => setExpanded(null)}
                className="text-gray-400 text-xs hover:text-white underline mt-2"
              >
                Show less
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
