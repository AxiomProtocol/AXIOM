import { useState, useEffect } from 'react';

interface Disclosure {
  id: number;
  title: string;
  content: string;
  category: string;
}

interface AcknowledgementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  featureId: string;
  featureName: string;
  walletAddress: string;
}

export default function AcknowledgementModal({
  isOpen,
  onClose,
  onComplete,
  featureId,
  featureName,
  walletAddress
}: AcknowledgementModalProps) {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDisclosures();
    }
  }, [isOpen, featureId]);

  const fetchDisclosures = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/disclosures?featureId=${featureId}`);
      if (res.ok) {
        const data = await res.json();
        const requiringAck = (data.disclosures || []).filter((d: any) => d.requires_acknowledgement);
        setDisclosures(requiringAck);
      }
    } catch (error) {
      console.error('Failed to fetch disclosures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (disclosureId: number, checked: boolean) => {
    setAcknowledged(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(disclosureId);
      } else {
        next.delete(disclosureId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (acknowledged.size !== disclosures.length) return;
    
    setSubmitting(true);
    try {
      const promises = disclosures.map(d => 
        fetch('/api/compliance/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disclosureId: d.id,
            userWallet: walletAddress
          })
        })
      );
      
      await Promise.all(promises);
      onComplete();
    } catch (error) {
      console.error('Failed to submit acknowledgements:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const allAcknowledged = acknowledged.size === disclosures.length && disclosures.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Important Disclosures
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Please read and acknowledge the following before using {featureName}
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-2">Loading disclosures...</p>
            </div>
          ) : disclosures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No disclosures required for this feature.</p>
              <button
                onClick={onComplete}
                className="mt-4 px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {disclosures.map((disclosure) => (
                <label
                  key={disclosure.id}
                  className="flex items-start gap-3 p-4 bg-gray-800/50 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={acknowledged.has(disclosure.id)}
                    onChange={(e) => handleCheckboxChange(disclosure.id, e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500 bg-gray-700"
                  />
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm">{disclosure.title}</h4>
                    <p className="text-gray-400 text-sm mt-1">{disclosure.content}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {disclosures.length > 0 && (
          <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allAcknowledged || submitting}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                allAcknowledged && !submitting
                  ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Submitting...' : `Continue (${acknowledged.size}/${disclosures.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
