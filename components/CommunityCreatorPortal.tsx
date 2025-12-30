import { useState, useEffect } from 'react';

interface HubData {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  groupCount: number;
  status: 'active' | 'pending' | 'featured';
  createdAt: string;
}

interface MarketingKit {
  id: string;
  name: string;
  type: 'flyer' | 'social' | 'banner' | 'email';
  description: string;
}

interface Props {
  walletAddress?: string;
}

const MARKETING_KITS: MarketingKit[] = [
  { id: '1', name: 'Welcome Flyer', type: 'flyer', description: 'Printable PDF to share with potential members' },
  { id: '2', name: 'Social Media Pack', type: 'social', description: 'Ready-to-post captions and hashtags' },
  { id: '3', name: 'Web Banner Guide', type: 'banner', description: 'Brand guidelines and banner specs' },
  { id: '4', name: 'Email Template', type: 'email', description: 'Copy-paste email to invite friends' },
];

export default function CommunityCreatorPortal({ walletAddress }: Props) {
  const [myHubs, setMyHubs] = useState<HubData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHubName, setNewHubName] = useState('');
  const [newHubDescription, setNewHubDescription] = useState('');
  const [newHubType, setNewHubType] = useState('interest');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadKit = async (kit: MarketingKit) => {
    setDownloading(kit.id);
    try {
      const response = await fetch(`/api/marketing/download/${kit.type}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Axiom_${kit.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchMyHubs();
    } else {
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchMyHubs = async () => {
    try {
      const res = await fetch(`/api/hubs/my-hubs?address=${walletAddress}`);
      const data = await res.json();
      if (data.success) {
        setMyHubs(data.hubs || []);
      }
    } catch (error) {
      console.error('Failed to fetch hubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHub = async () => {
    if (!newHubName.trim()) {
      setError('Please enter a hub name');
      return;
    }
    if (!newHubDescription.trim()) {
      setError('Please enter a description');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/hubs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHubName,
          description: newHubDescription,
          type: newHubType,
          walletAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Hub created successfully!');
        setShowCreateModal(false);
        setNewHubName('');
        setNewHubDescription('');
        fetchMyHubs();
      } else {
        setError(data.error || 'Failed to create hub');
      }
    } catch (error) {
      setError('Failed to create hub');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🌟</span> Community Creator Portal
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Create Interest Hubs and grow your community with marketing kits
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all"
          >
            + Create Hub
          </button>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">My Hubs</div>
            <div className="text-3xl font-bold text-purple-400">{myHubs.length}</div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Total Members</div>
            <div className="text-3xl font-bold text-blue-400">
              {myHubs.reduce((sum, h) => sum + h.memberCount, 0)}
            </div>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Active Groups</div>
            <div className="text-3xl font-bold text-green-400">
              {myHubs.reduce((sum, h) => sum + h.groupCount, 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Your Interest Hubs</h4>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin text-4xl mb-2">⏳</div>
            <p className="text-gray-400">Loading your hubs...</p>
          </div>
        ) : myHubs.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/50 rounded-xl border border-dashed border-gray-600">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-gray-400 mb-2">No hubs created yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Create your first Interest Hub to start building your community
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-all"
            >
              Create Your First Hub
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {myHubs.map(hub => (
              <div 
                key={hub.id}
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{hub.name}</span>
                      {hub.status === 'featured' && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{hub.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-400 font-bold">{hub.memberCount}</div>
                    <div className="text-xs text-gray-500">members</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>{hub.groupCount} groups</span>
                  <span>Created {new Date(hub.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <h4 className="text-sm font-semibold text-white mb-3 mt-6">Marketing Kit</h4>
        <p className="text-xs text-gray-400 mb-4">
          Use these professionally designed materials to promote your hub and attract members
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MARKETING_KITS.map(kit => (
            <div 
              key={kit.id}
              onClick={() => handleDownloadKit(kit)}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-yellow-500/30 transition-all cursor-pointer group"
            >
              <div className="aspect-video bg-gray-700 rounded-lg mb-2 flex items-center justify-center text-2xl group-hover:bg-yellow-500/20 transition-all relative">
                {downloading === kit.id ? (
                  <div className="animate-spin text-yellow-500">⏳</div>
                ) : (
                  <>
                    {kit.type === 'flyer' && '📄'}
                    {kit.type === 'social' && '📱'}
                    {kit.type === 'banner' && '🖼️'}
                    {kit.type === 'email' && '✉️'}
                  </>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/50 rounded-lg">
                  <span className="text-yellow-500 text-sm font-medium">Download</span>
                </div>
              </div>
              <div className="text-sm font-medium text-white">{kit.name}</div>
              <div className="text-xs text-gray-500">{kit.description}</div>
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Create Interest Hub</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Hub Name</label>
                <input
                  type="text"
                  value={newHubName}
                  onChange={(e) => setNewHubName(e.target.value)}
                  placeholder="e.g., Tech Entrepreneurs NYC"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={newHubDescription}
                  onChange={(e) => setNewHubDescription(e.target.value)}
                  placeholder="Describe what your hub is about..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Hub Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'interest', label: 'Interest', icon: '💡' },
                    { id: 'location', label: 'Location', icon: '📍' },
                    { id: 'profession', label: 'Profession', icon: '💼' },
                    { id: 'community', label: 'Community', icon: '🤝' },
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setNewHubType(type.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        newHubType === type.id
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <span className="mr-2">{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateHub}
                disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Hub'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
