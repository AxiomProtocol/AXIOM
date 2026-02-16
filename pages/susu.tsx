import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DesignLawLayout } from '../components/design-law/DesignLawLayout';

interface AnalyticsStats {
  totalHubs: number;
  totalGroups: number;
  activeGroups: number;
  graduatedGroups: number;
  totalMembers: number;
}

interface Hub {
  id: number;
  hub_id: string;
  hub_name: string;
  description: string;
  region_id: string;
  region_display: string;
  region_type: string;
  member_count: number;
  is_active: boolean;
}

interface Group {
  id: number;
  group_id: string;
  display_name: string;
  description: string;
  hub_id: number;
  contribution_amount: number;
  cycle_length_days: number;
  member_count: number;
  max_members: number;
  min_members_to_activate: number;
  trust_score: number;
  status: 'forming' | 'active' | 'graduated';
  region_display: string;
  is_active: boolean;
}

type TabId = 'overview' | 'discover' | 'practice' | 'create';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'discover', label: 'Discover' },
  { id: 'practice', label: 'My Practice' },
  { id: 'create', label: 'Create' },
];

const STATUS_STYLES: Record<string, string> = {
  forming: 'border border-dl-gold text-dl-gold',
  active: 'border border-dl-forest text-dl-forest',
  graduated: 'border border-dl-navy text-dl-navy',
};

export default function WealthPracticePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState('');
  const [filterHubId, setFilterHubId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [createForm, setCreateForm] = useState({
    hubId: '',
    displayName: '',
    description: '',
    contributionAmount: 50,
    cycleLengthDays: 30,
    minMembersToActivate: 3,
    maxMembers: 10,
  });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [createError, setCreateError] = useState('');

  const [showHubForm, setShowHubForm] = useState(false);
  const [hubForm, setHubForm] = useState({
    hubName: '',
    description: '',
    city: '',
    region: '',
    regionType: 'metro',
    interest: '',
  });
  const [creatingHub, setCreatingHub] = useState(false);
  const [hubCreateMsg, setHubCreateMsg] = useState('');
  const [hubCreateError, setHubCreateError] = useState('');

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
    }
    if (activeTab === 'discover' || activeTab === 'create') {
      fetchDiscoverData();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const res = await fetch('/api/wealth-practice/analytics');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setStatsError(data.error || 'Failed to load analytics');
      }
    } catch {
      setStatsError('Failed to load analytics');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchDiscoverData = async () => {
    setDiscoverLoading(true);
    setDiscoverError('');
    try {
      const params = new URLSearchParams();
      if (filterHubId) params.append('hubId', filterHubId);
      if (searchQuery) params.append('q', searchQuery);

      const [hubsRes, groupsRes] = await Promise.all([
        fetch('/api/wealth-practice/hubs'),
        fetch(`/api/wealth-practice/groups?${params.toString()}`),
      ]);

      const hubsData = await hubsRes.json();
      const groupsData = await groupsRes.json();

      if (hubsData.success) setHubs(hubsData.hubs || []);
      if (groupsData.success) setGroups(groupsData.groups || []);
      if (!hubsData.success && !groupsData.success) {
        setDiscoverError('Failed to load data');
      }
    } catch {
      setDiscoverError('Failed to load data');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDiscoverData();
  };

  const handleCreateGroup = async () => {
    if (!createForm.hubId) {
      setCreateError('Please select a hub');
      return;
    }
    if (!createForm.displayName.trim()) {
      setCreateError('Please enter a display name');
      return;
    }

    setCreating(true);
    setCreateError('');
    setCreateMsg('');

    try {
      const res = await fetch('/api/wealth-practice/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setCreateMsg('Wealth Practice group created successfully.');
        setCreateForm({
          hubId: '',
          displayName: '',
          description: '',
          contributionAmount: 50,
          cycleLengthDays: 30,
          minMembersToActivate: 3,
          maxMembers: 10,
        });
      } else {
        setCreateError(data.error || 'Failed to create group');
      }
    } catch {
      setCreateError('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateHub = async () => {
    if (!hubForm.hubName.trim()) {
      setHubCreateError('Hub name is required');
      return;
    }
    if (!hubForm.city.trim()) {
      setHubCreateError('City is required');
      return;
    }
    if (!hubForm.region.trim()) {
      setHubCreateError('State/region is required');
      return;
    }

    setCreatingHub(true);
    setHubCreateError('');
    setHubCreateMsg('');

    try {
      const res = await fetch('/api/wealth-practice/hubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hubForm),
      });
      const data = await res.json();
      if (data.success) {
        setHubCreateMsg('Interest Hub created successfully.');
        setHubForm({ hubName: '', description: '', city: '', region: '', regionType: 'metro', interest: '' });
        setShowHubForm(false);
        fetchDiscoverData();
      } else {
        setHubCreateError(data.error || 'Failed to create hub');
      }
    } catch {
      setHubCreateError('Failed to create hub');
    } finally {
      setCreatingHub(false);
    }
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>The Wealth Practice | Axiom Protocol</title>
      </Head>

      <div className="mb-8">
        <h1 className="font-dl-serif text-3xl text-dl-navy font-bold">The Wealth Practice</h1>
        <p className="text-dl-gray mt-1">Community Group Economics Engine</p>
      </div>

      <div className="border-b border-dl-border mb-8">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm transition-none ${
                activeTab === tab.id
                  ? 'border-b-2 border-dl-navy text-dl-navy font-bold'
                  : 'text-dl-gray hover:text-dl-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div>
          <h2 className="font-dl-serif text-xl text-dl-navy font-bold mb-4">Trust Pipeline</h2>
          <p className="text-dl-gray text-sm mb-6">
            A structured group savings framework with deterministic scheduling, participant-level transparency, and cryptographic audit trails.
          </p>

          <div className="flex flex-col md:flex-row items-stretch mb-10">
            <div className="flex-1 border border-dl-border p-6">
              <div className="font-dl-serif text-lg text-dl-navy font-bold mb-2">1. Interest Hub</div>
              <p className="text-dl-gray text-sm">Regional community hub. Signal intent and connect with participants in your area.</p>
            </div>
            <div className="hidden md:flex items-center px-4 text-dl-gray text-2xl">&rarr;</div>
            <div className="md:hidden flex justify-center py-2 text-dl-gray text-2xl">&darr;</div>
            <div className="flex-1 border border-dl-border p-6">
              <div className="font-dl-serif text-lg text-dl-navy font-bold mb-2">2. Purpose Group</div>
              <p className="text-dl-gray text-sm">Goal-oriented group with contribution cycles. Build trust through consistent participation.</p>
            </div>
            <div className="hidden md:flex items-center px-4 text-dl-gray text-2xl">&rarr;</div>
            <div className="md:hidden flex justify-center py-2 text-dl-gray text-2xl">&darr;</div>
            <div className="flex-1 border border-dl-border p-6">
              <div className="font-dl-serif text-lg text-dl-navy font-bold mb-2">3. On-Chain Pool</div>
              <p className="text-dl-gray text-sm">Graduated group deployed to automated control layers. Transparent, verifiable, and self-executing.</p>
            </div>
          </div>

          <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-4">Key Metrics</h3>
          {statsLoading && <p className="text-dl-gray text-sm">Loading...</p>}
          {statsError && <p className="text-sm" style={{ color: '#991b1b' }}>{statsError}</p>}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Hubs', value: stats.totalHubs },
                { label: 'Total Groups', value: stats.totalGroups },
                { label: 'Active Groups', value: stats.activeGroups },
                { label: 'Graduated Groups', value: stats.graduatedGroups },
                { label: 'Total Members', value: stats.totalMembers },
              ].map((item) => (
                <div key={item.label} className="border border-dl-border p-4">
                  <div className="font-dl-mono text-2xl text-dl-navy">{item.value}</div>
                  <div className="text-dl-gray text-xs mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 border border-dl-border p-6">
            <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-3">Physical-Digital Bridge</h3>
            <p className="text-dl-gray text-sm mb-4">
              When a Purpose Group graduates to an On-Chain Pool, its pooled capital can be directed toward community land acquisition. 
              Acquired land produces food and housing that flows back to group members through participation credits.
            </p>
            <div className="flex flex-col md:flex-row items-stretch">
              <div className="flex-1 border border-dl-forest p-4">
                <div className="text-dl-forest text-xs uppercase font-dl-mono mb-1">Capital Source</div>
                <div className="font-dl-serif text-dl-navy font-bold">Wealth Practice Groups</div>
                <p className="text-dl-gray text-xs mt-1">Members contribute, groups graduate, capital pools on-chain</p>
              </div>
              <div className="hidden md:flex items-center px-4 text-dl-forest text-2xl">&rarr;</div>
              <div className="md:hidden flex justify-center py-2 text-dl-forest text-2xl">&darr;</div>
              <div className="flex-1 border border-dl-forest p-4">
                <div className="text-dl-forest text-xs uppercase font-dl-mono mb-1">Capital Deployment</div>
                <div className="font-dl-serif text-dl-navy font-bold">Land Acquisition Pools</div>
                <p className="text-dl-gray text-xs mt-1">Pooled capital funds community land purchases</p>
              </div>
              <div className="hidden md:flex items-center px-4 text-dl-forest text-2xl">&rarr;</div>
              <div className="md:hidden flex justify-center py-2 text-dl-forest text-2xl">&darr;</div>
              <div className="flex-1 border border-dl-forest p-4">
                <div className="text-dl-forest text-xs uppercase font-dl-mono mb-1">Community Output</div>
                <div className="font-dl-serif text-dl-navy font-bold">Produce &amp; Housing</div>
                <p className="text-dl-gray text-xs mt-1">Acquired land generates food distribution and housing access</p>
              </div>
            </div>
            <div className="mt-4">
              <a href="/land" className="text-dl-navy text-sm font-bold border-b border-dl-navy hover:text-dl-forest">
                View Land Acquisition Pipeline &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'discover' && (
        <div>
          <h2 className="font-dl-serif text-xl text-dl-navy font-bold mb-4">Discover</h2>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
            />
            <select
              value={filterHubId}
              onChange={(e) => setFilterHubId(e.target.value)}
              className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
            >
              <option value="">All Hubs</option>
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.id}>{hub.region_display}</option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              className="border border-dl-navy bg-dl-bg text-dl-navy px-6 py-2 text-sm font-bold hover:bg-dl-navy hover:text-white transition-none"
            >
              Search
            </button>
          </div>

          {discoverLoading && <p className="text-dl-gray text-sm">Loading...</p>}
          {discoverError && <p className="text-sm" style={{ color: '#991b1b' }}>{discoverError}</p>}

          {!discoverLoading && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-dl-serif text-lg text-dl-navy font-bold">Interest Hubs</h3>
                <button
                  onClick={() => setShowHubForm(!showHubForm)}
                  className="border border-dl-navy bg-dl-bg text-dl-navy px-4 py-1.5 text-sm font-bold hover:bg-dl-navy hover:text-white transition-none"
                >
                  {showHubForm ? 'Cancel' : 'Create Hub'}
                </button>
              </div>

              {hubCreateMsg && (
                <div className="border border-dl-forest bg-dl-bg p-3 mb-4">
                  <p className="text-dl-forest text-sm">{hubCreateMsg}</p>
                </div>
              )}

              {showHubForm && (
                <div className="border border-dl-border p-6 mb-6">
                  <h4 className="font-dl-serif text-dl-navy font-bold mb-4">New Interest Hub</h4>
                  <p className="text-dl-gray text-sm mb-4">Create a hub for your city or region. Other participants can discover it and form Wealth Practice groups within it.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Hub Name</label>
                      <input
                        type="text"
                        value={hubForm.hubName}
                        onChange={(e) => setHubForm({ ...hubForm, hubName: e.target.value })}
                        placeholder="e.g. Atlanta Wealth Builders"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Interest / Focus</label>
                      <input
                        type="text"
                        value={hubForm.interest}
                        onChange={(e) => setHubForm({ ...hubForm, interest: e.target.value })}
                        placeholder="e.g. Homeownership, Land Stewardship, Food Security"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">City</label>
                      <input
                        type="text"
                        value={hubForm.city}
                        onChange={(e) => setHubForm({ ...hubForm, city: e.target.value })}
                        placeholder="e.g. Atlanta"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">State / Region</label>
                      <input
                        type="text"
                        value={hubForm.region}
                        onChange={(e) => setHubForm({ ...hubForm, region: e.target.value })}
                        placeholder="e.g. Georgia"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Region Type</label>
                      <select
                        value={hubForm.regionType}
                        onChange={(e) => setHubForm({ ...hubForm, regionType: e.target.value })}
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                      >
                        <option value="metro">Metro Area</option>
                        <option value="state">State</option>
                        <option value="county">County</option>
                        <option value="rural">Rural</option>
                        <option value="national">National</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-dl-navy text-sm font-bold mb-1">Description (optional)</label>
                    <textarea
                      value={hubForm.description}
                      onChange={(e) => setHubForm({ ...hubForm, description: e.target.value })}
                      placeholder="Describe the purpose and community focus of this hub..."
                      rows={2}
                      className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none resize-none"
                    />
                  </div>

                  {hubCreateError && <p className="text-sm mb-3" style={{ color: '#991b1b' }}>{hubCreateError}</p>}

                  <button
                    onClick={handleCreateHub}
                    disabled={creatingHub}
                    className="border border-dl-navy bg-dl-navy text-white px-6 py-2 text-sm font-bold hover:bg-dl-bg hover:text-dl-navy transition-none disabled:opacity-50"
                  >
                    {creatingHub ? 'Creating...' : 'Create Interest Hub'}
                  </button>
                </div>
              )}

              {hubs.length === 0 && !showHubForm ? (
                <div className="border border-dl-border bg-dl-bg p-6 mb-8 text-center">
                  <p className="text-dl-gray text-sm mb-2">No Interest Hubs yet. Be the first to create one for your city or region.</p>
                  <button
                    onClick={() => setShowHubForm(true)}
                    className="border border-dl-navy bg-dl-bg text-dl-navy px-4 py-1.5 text-sm font-bold hover:bg-dl-navy hover:text-white transition-none mt-2"
                  >
                    Create the First Hub
                  </button>
                </div>
              ) : hubs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {hubs.map((hub) => (
                    <div key={hub.id} className="border border-dl-border p-4">
                      <div className="font-dl-serif text-dl-navy font-bold">{hub.hub_name || hub.region_display}</div>
                      <div className="font-dl-mono text-xs text-dl-gray mt-1">{hub.region_display} &middot; {hub.region_type}</div>
                      <div className="font-dl-mono text-sm text-dl-forest mt-1">{hub.member_count} members</div>
                      {hub.description && (
                        <p className="text-dl-gray text-xs mt-2">{hub.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-4">
                Wealth Practice Groups
                {groups.length > 0 && <span className="text-dl-gray font-normal ml-2 text-sm">({groups.length})</span>}
              </h3>
              {groups.length === 0 ? (
                <p className="text-dl-gray text-sm">No groups found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((group) => (
                    <div key={group.id} className="border border-dl-border p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-dl-serif text-dl-navy font-bold">
                          {group.display_name || group.group_id}
                        </div>
                        <span className={`text-xs px-2 py-0.5 uppercase ${STATUS_STYLES[group.status] || 'border border-dl-border text-dl-gray'}`}>
                          {group.status}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-dl-gray text-xs mb-3">{group.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <span className="text-dl-gray">Contribution:</span>
                          <span className="font-dl-mono text-dl-navy ml-1">${group.contribution_amount}</span>
                        </div>
                        <div>
                          <span className="text-dl-gray">Cycle:</span>
                          <span className="font-dl-mono text-dl-navy ml-1">{group.cycle_length_days}d</span>
                        </div>
                        <div>
                          <span className="text-dl-gray">Members:</span>
                          <span className="font-dl-mono text-dl-navy ml-1">{group.member_count}/{group.max_members}</span>
                        </div>
                        <div>
                          <span className="text-dl-gray">Region:</span>
                          <span className="text-dl-navy ml-1">{group.region_display || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-dl-gray">Trust Score</span>
                          <span className="font-dl-mono text-dl-navy">{group.trust_score}/100</span>
                        </div>
                        <div className="w-full border border-dl-border h-2 bg-dl-bg">
                          <div
                            className="h-full bg-dl-forest"
                            style={{ width: `${group.trust_score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'practice' && (
        <div>
          <h2 className="font-dl-serif text-xl text-dl-navy font-bold mb-4">My Practice</h2>
          <div className="border border-dl-border p-8 text-center">
            <p className="text-dl-gray text-sm">Connect your wallet to view your groups.</p>
            <p className="text-dl-gray text-xs mt-2">Wallet-connected features will display your active Wealth Practice circles, contribution history, and group status.</p>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div>
          <h2 className="font-dl-serif text-xl text-dl-navy font-bold mb-4">Create a Wealth Practice Group</h2>
          <p className="text-dl-gray text-sm mb-6">
            Establish a new purpose group within an existing Interest Hub. Groups require minimum participation thresholds before activation.
          </p>

          <div className="border border-dl-border p-6 max-w-2xl">
            <div className="mb-4">
              <label className="block text-dl-navy text-sm font-bold mb-1">Select Hub</label>
              <select
                value={createForm.hubId}
                onChange={(e) => setCreateForm({ ...createForm, hubId: e.target.value })}
                className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
              >
                <option value="">— Select a hub —</option>
                {hubs.map((hub) => (
                  <option key={hub.id} value={hub.id}>{hub.region_display}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-dl-navy text-sm font-bold mb-1">Display Name</label>
              <input
                type="text"
                value={createForm.displayName}
                onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                placeholder="e.g. Atlanta Homeownership Circle"
                className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-dl-navy text-sm font-bold mb-1">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Describe the purpose and goals of this group..."
                rows={3}
                className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-dl-navy text-sm font-bold mb-1">Contribution Amount ($)</label>
                <input
                  type="number"
                  value={createForm.contributionAmount}
                  onChange={(e) => setCreateForm({ ...createForm, contributionAmount: Number(e.target.value) })}
                  min={1}
                  className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-dl-navy text-sm font-bold mb-1">Cycle Length (Days)</label>
                <select
                  value={createForm.cycleLengthDays}
                  onChange={(e) => setCreateForm({ ...createForm, cycleLengthDays: Number(e.target.value) })}
                  className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-dl-navy text-sm font-bold mb-1">Min Members to Activate</label>
                <input
                  type="number"
                  value={createForm.minMembersToActivate}
                  onChange={(e) => setCreateForm({ ...createForm, minMembersToActivate: Number(e.target.value) })}
                  min={2}
                  className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-dl-navy text-sm font-bold mb-1">Max Members</label>
                <input
                  type="number"
                  value={createForm.maxMembers}
                  onChange={(e) => setCreateForm({ ...createForm, maxMembers: Number(e.target.value) })}
                  min={2}
                  className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                />
              </div>
            </div>

            {createError && (
              <div className="border border-dl-border p-3 mb-4 text-sm" style={{ color: '#991b1b' }}>
                {createError}
              </div>
            )}
            {createMsg && (
              <div className="border border-dl-forest p-3 mb-4 text-sm text-dl-forest">
                {createMsg}
              </div>
            )}

            <button
              onClick={handleCreateGroup}
              disabled={creating}
              className="border border-dl-navy bg-dl-navy text-white px-6 py-2 text-sm font-bold hover:bg-dl-bg hover:text-dl-navy transition-none disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      )}
    </DesignLawLayout>
  );
}
