import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAccount } from 'wagmi';
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
  contribution_frequency: string;
  rotation_method: string;
  member_count: number;
  max_members: number;
  min_members_to_activate: number;
  trust_score: number;
  status: 'forming' | 'active' | 'graduated';
  region_display: string;
  is_active: boolean;
  created_at: string;
}

interface MyGroupMembership {
  id: number;
  group_id: number;
  position: number;
  status: string;
  joined_at: string;
  display_name: string;
  description: string;
  contribution_amount: number;
  cycle_length_days: number;
  contribution_frequency: string;
  rotation_method: string;
  member_count: number;
  max_members: number;
  region_display: string;
  hub_name: string;
  group_status: string;
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
  const { address: connectedAddress } = useAccount();
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
    contributionFrequency: 'monthly' as string,
    rotationMethod: 'round-robin' as string,
    minMembersToActivate: 3,
    maxMembers: 10,
  });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [createError, setCreateError] = useState('');

  const [myGroups, setMyGroups] = useState<MyGroupMembership[]>([]);
  const [myPracticeLoading, setMyPracticeLoading] = useState(false);
  const [myPracticeError, setMyPracticeError] = useState('');
  const [practiceAddress, setPracticeAddress] = useState('');

  const [participant, setParticipant] = useState<{
    id: number; walletAddress: string; participantRef: string; fullName: string; email: string; status: string;
    cardStatus?: string; cardLast4?: string;
    accountBalance?: { availableBalanceCents: number; currentBalanceCents: number; currency: string } | null;
    accountAccessMode?: 'dedicated' | 'virtual-only';
    virtualRoutingNumber?: string; virtualAccountNumber?: string;
  } | null>(null);
  const [participantHolds, setParticipantHolds] = useState<Array<{
    id: number; groupId: string | null; groupDisplayName: string | null; amountCents: number; depositedAmountCents: number; status: string; fundedAt: string | null;
  }>>([]);
  const [regForm, setRegForm] = useState({
    fullName: '', email: '', phone: '',
    dateOfBirth: '', ssn: '', addressLine1: '', city: '', state: '', zip: '',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState('');
  const [regError, setRegError] = useState('');
  const [participantLoading, setParticipantLoading] = useState(false);

  // Join flow state (gated by insurance status check)
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
  const [joinWallet, setJoinWallet] = useState('');
  type JoinStatus = 'idle' | 'checking' | 'needs-registration' | 'needs-funding' | 'pending-funding' | 'ready' | 'joining' | 'success' | 'error';
  const [joinStatus, setJoinStatus] = useState<JoinStatus>('idle');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinInsuranceData, setJoinInsuranceData] = useState<Record<string, unknown> | null>(null);

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

  // Sync wagmi connected wallet → practiceAddress + joinWallet automatically
  useEffect(() => {
    if (connectedAddress) {
      setPracticeAddress(connectedAddress);
      setJoinWallet(connectedAddress);
    }
  }, [connectedAddress]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
    }
    if (activeTab === 'discover' || activeTab === 'create') {
      fetchDiscoverData();
    }
    if (activeTab === 'practice' && practiceAddress) {
      fetchMyPractice(practiceAddress);
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

  const fetchMyPractice = async (address: string) => {
    setMyPracticeLoading(true);
    setMyPracticeError('');
    try {
      const res = await fetch(`/api/wealth-practice/my-groups?memberAddress=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data.success) {
        setMyGroups(data.groups || []);
      } else {
        setMyPracticeError(data.error || 'Failed to load your groups');
      }
    } catch {
      setMyPracticeError('Failed to load your groups');
    } finally {
      setMyPracticeLoading(false);
    }
  };

  const handleLookupPractice = () => {
    if (practiceAddress.trim()) {
      fetchMyPractice(practiceAddress.trim());
      fetchParticipantInfo(practiceAddress.trim());
    }
  };

  const fetchParticipantInfo = async (address: string) => {
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) return;
    setParticipantLoading(true);
    try {
      const res = await fetch(`/api/banking/participant/status?wallet=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data.registered) {
        setParticipant({
          id: 0,
          walletAddress: address,
          participantRef: data.participantRef,
          fullName: data.fullName,
          email: '',
          status: data.status,
          cardStatus: data.cardStatus ?? undefined,
          cardLast4: data.cardLast4 ?? undefined,
          accountBalance: data.accountBalance ?? null,
          accountAccessMode: data.accountAccessMode ?? 'virtual-only',
          virtualRoutingNumber: data.virtualRoutingNumber ?? undefined,
          virtualAccountNumber: data.virtualAccountNumber ?? undefined,
        });
        setParticipantHolds(data.insuranceHolds || []);
      } else {
        setParticipant(null);
        setParticipantHolds([]);
      }
    } catch {
      setParticipant(null);
    } finally {
      setParticipantLoading(false);
    }
  };

  const handleRegisterParticipant = async () => {
    if (!practiceAddress.trim() || !/^0x[a-fA-F0-9]{40}$/i.test(practiceAddress.trim())) {
      setRegError('A valid wallet address is required');
      return;
    }
    if (!regForm.fullName.trim()) { setRegError('Full legal name is required'); return; }
    if (!regForm.email.trim() || !regForm.email.includes('@')) { setRegError('Valid email address is required'); return; }
    if (!regForm.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(regForm.dateOfBirth)) { setRegError('Date of birth required (YYYY-MM-DD)'); return; }
    if (!regForm.ssn || regForm.ssn.replace(/\D/g, '').length !== 9) { setRegError('Full Social Security Number required (9 digits)'); return; }
    if (!regForm.addressLine1.trim()) { setRegError('Street address required'); return; }
    if (!regForm.city.trim()) { setRegError('City required'); return; }
    if (!regForm.state || !/^[A-Z]{2}$/.test(regForm.state)) { setRegError('State required (2-letter code, e.g. TX)'); return; }
    if (!regForm.zip || !/^\d{5}$/.test(regForm.zip)) { setRegError('ZIP code required (5 digits)'); return; }
    setRegLoading(true);
    setRegError('');
    setRegMsg('');
    try {
      const res = await fetch('/api/banking/participant/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: practiceAddress.trim(),
          fullName: regForm.fullName.trim(),
          email: regForm.email.trim(),
          phone: regForm.phone.trim() || undefined,
          dateOfBirth: regForm.dateOfBirth,
          ssn: regForm.ssn.replace(/\D/g, ''),
          addressLine1: regForm.addressLine1.trim(),
          city: regForm.city.trim(),
          state: regForm.state.trim().toUpperCase(),
          zip: regForm.zip.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setParticipant(data.participant);
        setRegMsg('Axiom Nexus account provisioned. Your dedicated account number is ready.');
        setRegForm({ fullName: '', email: '', phone: '', dateOfBirth: '', ssn: '', addressLine1: '', city: '', state: '', zip: '' });
        fetchParticipantInfo(practiceAddress.trim());
      } else {
        setRegError(data.error || 'Registration failed');
      }
    } catch {
      setRegError('Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const getNextRotationDate = (joinedAt: string, cycleDays: number) => {
    const joined = new Date(joinedAt);
    const now = new Date();
    const elapsed = now.getTime() - joined.getTime();
    const cycleMs = cycleDays * 24 * 60 * 60 * 1000;
    const cyclesPassed = Math.floor(elapsed / cycleMs);
    const nextDate = new Date(joined.getTime() + (cyclesPassed + 1) * cycleMs);
    return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFrequencyLabel = (freq: string) => {
    const map: Record<string, string> = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };
    return map[freq] || freq;
  };

  const getRotationLabel = (method: string) => {
    const map: Record<string, string> = { 'round-robin': 'Round Robin', random: 'Random', 'need-based': 'Need-Based' };
    return map[method] || method;
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
          contributionFrequency: 'monthly',
          rotationMethod: 'round-robin',
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

  // Open inline join panel for a group
  const handleStartJoin = (groupId: number) => {
    setJoiningGroupId(prev => prev === groupId ? null : groupId);
    setJoinStatus('idle');
    setJoinError(null);
    setJoinSuccess(null);
    setJoinInsuranceData(null);
  };

  // Check insurance status then gate join or show deposit instructions.
  // Wallet is derived from the connected wagmi address — no manual wallet input required.
  const handleCheckInsuranceAndJoin = async (group: Group) => {
    if (!connectedAddress) {
      setJoinError('Connect your wallet to continue.');
      return;
    }
    setJoinStatus('checking');
    setJoinError(null);
    try {
      // Participant path: SIWE derives wallet on server — no ?wallet= param sent
      const insRes = await fetch(
        `/api/banking/wealth-practice/insurance/status?groupId=${group.id}`
      );
      const insData = await insRes.json();
      setJoinInsuranceData(insData);

      if (!insData.registered) {
        setJoinStatus('needs-registration');
        return;
      }

      const holdStatus: string = insData.groupHoldStatus ?? '';
      if (holdStatus === 'funded') {
        // Insurance is funded — proceed with group join
        setJoinStatus('joining');
        const joinRes = await fetch('/api/wealth-practice/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: String(group.id), memberAddress: connectedAddress }),
        });
        const joinData = await joinRes.json();
        if (joinData.success) {
          setJoinStatus('success');
          setJoinSuccess(`You have joined ${group.display_name || 'the group'}. Your membership is now active.`);
        } else {
          setJoinStatus('error');
          setJoinError(joinData.error || 'Join failed. Please try again.');
        }
      } else if (holdStatus === 'pending' || holdStatus === 'partial') {
        setJoinStatus('pending-funding');
      } else {
        // No hold yet — initiate hold creation + return deposit instructions
        const contributionAmountCents = Math.round(parseFloat(String(group.contribution_amount || '0')) * 100);
        const fundRes = await fetch('/api/banking/wealth-practice/insurance/fund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // walletAddress included for dev-mode SIWE fallback (fund.ts checks siweWallet === '__dev__')
            walletAddress: connectedAddress,
            groupId: String(group.id),
            groupDisplayName: group.display_name || `Group #${group.id}`,
            contributionAmountCents,
          }),
        });
        const fundData = await fundRes.json();
        if (fundRes.ok) {
          setJoinInsuranceData({ ...insData, ...fundData });
          setJoinStatus('needs-funding');
        } else {
          setJoinStatus('error');
          setJoinError(fundData.error || 'Failed to create insurance hold. Please try again.');
        }
      }
    } catch {
      setJoinStatus('error');
      setJoinError('Network error. Please check your connection and try again.');
    }
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>The Wealth Practice | Axiom Protocol</title>
      </Head>

      <div className="border border-dl-gold bg-dl-bg p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-dl-gold text-xs uppercase font-dl-mono font-bold border border-dl-gold px-2 py-0.5">Pilot Mode</span>
          <p className="text-dl-navy text-sm">
            Launching in <span className="font-bold">Atlanta</span>, <span className="font-bold">Houston</span>, and <span className="font-bold">Charlotte</span> — the first three cities activating community group economics.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="font-dl-serif text-2xl sm:text-3xl text-dl-navy font-bold">The Wealth Practice</h1>
        <p className="text-dl-gray mt-1">Community Group Economics Engine</p>
      </div>

      <div className="border-b border-dl-border mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm min-h-[44px] whitespace-nowrap transition-none ${
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

          <div className="mt-8 border border-dl-navy p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <div className="font-dl-mono text-xs text-dl-navy uppercase mb-1">Capital Pathway</div>
                <h3 className="font-dl-serif text-lg text-dl-navy font-bold">Where This Leads</h3>
              </div>
              <span className="font-dl-mono text-[10px] border border-dl-navy px-2 py-0.5 text-dl-navy uppercase self-start">Stage 1 of 2</span>
            </div>
            <p className="text-dl-gray text-sm mb-5">
              The Wealth Practice is the community foundation layer of the Axiom capital stack. Groups that complete the three-stage trust pipeline — Interest Hub, Purpose Group, On-Chain Pool — qualify for consideration in the Syndication program. No accreditation is required to begin.
            </p>
            <div className="flex flex-col md:flex-row items-stretch gap-0 md:gap-0 mb-5">
              <div className="flex-1 border border-dl-forest p-4">
                <div className="font-dl-mono text-[10px] text-dl-forest uppercase mb-1">Stage 1</div>
                <div className="font-dl-serif text-sm text-dl-navy font-bold">The Wealth Practice</div>
                <p className="text-dl-gray text-xs mt-1">Community savings groups. Three-stage trust pipeline. No accreditation required. Open to any participant.</p>
              </div>
              <div className="hidden md:flex items-center px-3 text-dl-navy text-xl">&rarr;</div>
              <div className="md:hidden flex justify-center py-2 text-dl-navy text-xl">&darr;</div>
              <div className="flex-1 border border-dl-navy p-4">
                <div className="font-dl-mono text-[10px] text-dl-navy uppercase mb-1">Stage 2</div>
                <div className="font-dl-serif text-sm text-dl-navy font-bold">Syndication</div>
                <p className="text-dl-gray text-xs mt-1">Institutional capital formation. Structured offerings (Reg D 506(c)). Graduated groups surface as qualified pipeline candidates.</p>
              </div>
            </div>
            <Link href="/syndication" className="font-dl-mono text-xs text-dl-navy font-bold border-b border-dl-navy hover:text-dl-forest">
              View Syndication Offerings &rarr;
            </Link>
          </div>
        </div>
      )}

      {(!practiceAddress || (!myPracticeLoading && myGroups.length === 0)) && (
        <div className="mb-10 border border-dl-forest bg-dl-bg border-l-4 border-l-dl-forest px-6 py-5">
          <p className="text-xs font-dl-mono text-dl-forest uppercase tracking-wider mb-2">No Capital to Start?</p>
          <p className="text-sm text-dl-gray leading-relaxed mb-3">
            If you have a steady W-2 income but need short-term liquidity to cover your first Wealth Practice contribution,
            Community Entry Credit provides an income-backed credit line — no crypto collateral required. Your GEF participation record is the signal.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/community-credit" className="inline-block border border-dl-forest text-dl-forest px-4 py-2 text-xs font-bold hover:bg-dl-forest hover:text-white">
              Apply for Community Entry Credit
            </Link>
            <Link href="/start" className="inline-block border border-dl-navy text-dl-navy px-4 py-2 text-xs font-bold hover:bg-dl-navy hover:text-white">
              View the Full Journey
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'discover' && (
        <div>
          <h2 className="font-dl-serif text-xl text-dl-navy font-bold mb-4">Discover</h2>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
            />
            <select
              value={filterHubId}
              onChange={(e) => setFilterHubId(e.target.value)}
              className="border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
            >
              <option value="">All Hubs</option>
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.id}>{hub.region_display}</option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              className="border border-dl-navy bg-dl-bg text-dl-navy px-6 py-2.5 min-h-[44px] text-sm font-bold hover:bg-dl-navy hover:text-white transition-none"
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
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Interest / Focus</label>
                      <input
                        type="text"
                        value={hubForm.interest}
                        onChange={(e) => setHubForm({ ...hubForm, interest: e.target.value })}
                        placeholder="e.g. Homeownership, Land Stewardship, Food Security"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
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
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">State / Region</label>
                      <input
                        type="text"
                        value={hubForm.region}
                        onChange={(e) => setHubForm({ ...hubForm, region: e.target.value })}
                        placeholder="e.g. Georgia"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Region Type</label>
                      <select
                        value={hubForm.regionType}
                        onChange={(e) => setHubForm({ ...hubForm, regionType: e.target.value })}
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
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
                    className="border border-dl-navy bg-dl-navy text-white px-6 py-3 min-h-[44px] text-sm font-bold hover:bg-dl-bg hover:text-dl-navy transition-none disabled:opacity-50"
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
                    className="border border-dl-navy bg-dl-bg text-dl-navy px-4 py-2.5 min-h-[44px] text-sm font-bold hover:bg-dl-navy hover:text-white transition-none mt-2"
                  >
                    Create the First Hub
                  </button>
                </div>
              ) : hubs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
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
                          <span className="text-dl-gray">Frequency:</span>
                          <span className="font-dl-mono text-dl-navy ml-1">{getFrequencyLabel(group.contribution_frequency || 'monthly')}</span>
                        </div>
                        <div>
                          <span className="text-dl-gray">Rotation:</span>
                          <span className="font-dl-mono text-dl-navy ml-1">{getRotationLabel(group.rotation_method || 'round-robin')}</span>
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
                      <div className="mb-3">
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

                      {/* Join CTA */}
                      {group.status === 'active' && (group.member_count || 0) < (group.max_members || 12) ? (
                        <button
                          onClick={() => handleStartJoin(group.id)}
                          className="w-full border border-dl-navy bg-dl-navy text-white text-xs font-dl-mono uppercase tracking-wider py-2 hover:bg-dl-bg hover:text-dl-navy transition-none"
                        >
                          {joiningGroupId === group.id ? 'Close' : 'Join Group'}
                        </button>
                      ) : (
                        <div className="text-center text-xs font-dl-mono text-dl-gray py-2 border border-dl-border">
                          {group.status !== 'active' ? 'Inactive' : 'Full'}
                        </div>
                      )}

                      {/* Inline join flow panel — insurance gating */}
                      {joiningGroupId === group.id && (
                        <div className="border border-dl-border mt-3 p-4 bg-dl-bg-alt">
                          {joinStatus === 'success' ? (
                            <p className="text-xs text-dl-forest font-semibold">{joinSuccess}</p>
                          ) : (
                            <>
                              <p className="text-xs text-dl-gray mb-3 leading-relaxed">
                                To join this group, your Axiom Nexus Account must have a funded insurance hold
                                of <strong className="text-dl-navy">${((Math.round(parseFloat(String(group.contribution_amount || '0')) * 100)) / 4 / 100).toFixed(2)}</strong> (1-week equivalent of the ${group.contribution_amount}/mo contribution).
                              </p>
                              {connectedAddress ? (
                                <div className="flex gap-2 mb-3">
                                  <div className="flex-1 border border-dl-border bg-dl-bg px-3 py-2 text-xs text-dl-navy font-dl-mono min-h-[36px] flex items-center">
                                    {connectedAddress.slice(0, 8)}···{connectedAddress.slice(-6)}
                                  </div>
                                  <button
                                    onClick={() => handleCheckInsuranceAndJoin(group)}
                                    disabled={joinStatus === 'checking' || joinStatus === 'joining'}
                                    className="border border-dl-navy bg-dl-navy text-white text-xs font-dl-mono uppercase px-4 py-2 disabled:opacity-50"
                                  >
                                    {joinStatus === 'checking' ? 'Checking…' : joinStatus === 'joining' ? 'Joining…' : 'Continue'}
                                  </button>
                                </div>
                              ) : (
                                <div className="mb-3 border border-dl-border p-3 text-xs text-dl-gray">
                                  Connect your wallet to continue joining this group.
                                </div>
                              )}

                              {joinError && (
                                <p className="text-xs text-red-700 mb-2">{joinError}</p>
                              )}

                              {joinStatus === 'needs-registration' && (
                                <div className="border border-dl-border p-3 text-xs text-dl-gray leading-relaxed">
                                  <strong className="text-dl-navy block mb-1">Nexus Account Required</strong>
                                  This wallet address is not registered with the Axiom Nexus Account banking layer.
                                  {' '}
                                  <a href="/banking/my-account" className="text-dl-navy underline">Register your account</a> first, then return here to join.
                                </div>
                              )}

                              {(joinStatus === 'needs-funding' || joinStatus === 'pending-funding') && joinInsuranceData && (
                                <div className="border border-dl-gold p-3 text-xs leading-relaxed">
                                  <strong className="text-dl-navy block mb-2">
                                    {joinStatus === 'pending-funding' ? 'Deposit Pending Settlement' : 'Insurance Hold Required'}
                                  </strong>
                                  {joinStatus === 'pending-funding' ? (
                                    <p className="text-dl-gray">
                                      Your insurance deposit is on its way — we are waiting for ACH settlement (1–2 business days).
                                      You can join this group once the hold is confirmed funded.
                                    </p>
                                  ) : (
                                    <>
                                      <p className="text-dl-gray mb-2">
                                        Send exactly <strong className="text-dl-navy">${(Number((joinInsuranceData as Record<string, unknown>).amountCents ?? 0) / 100).toFixed(2)}</strong> via ACH with the memo below to activate your hold:
                                      </p>
                                      {(() => {
                                        const instr = (joinInsuranceData as Record<string, unknown>).depositInstructions as Record<string, unknown> | undefined;
                                        return instr ? (
                                          <div className="font-dl-mono text-dl-navy space-y-1">
                                            <div>Bank: <span className="text-dl-gray">{String(instr.bankName ?? '')}</span></div>
                                            <div>Routing: <span className="text-dl-gray">{String(instr.routingNumber ?? '')}</span></div>
                                            {instr.accountNumber && <div>Account: <span className="text-dl-gray">{String(instr.accountNumber)}</span></div>}
                                            <div>Memo: <span className="text-dl-gray font-semibold">{String(instr.memo ?? '')}</span></div>
                                          </div>
                                        ) : null;
                                      })()}
                                      <p className="text-dl-gray mt-2">Once your deposit settles, return here to complete joining.</p>
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
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

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Enter your wallet address or member ID..."
              value={practiceAddress}
              onChange={(e) => setPracticeAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupPractice()}
              className="flex-1 border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
            />
            <button
              onClick={handleLookupPractice}
              className="border border-dl-navy bg-dl-navy text-white px-6 py-2.5 min-h-[44px] text-sm font-bold hover:bg-dl-bg hover:text-dl-navy transition-none"
            >
              View My Groups
            </button>
          </div>

          {myPracticeLoading && <p className="text-dl-gray text-sm">Loading...</p>}
          {myPracticeError && <p className="text-sm" style={{ color: '#991b1b' }}>{myPracticeError}</p>}

          {!myPracticeLoading && !myPracticeError && myGroups.length === 0 && practiceAddress && (
            <div className="border border-dl-border p-8 text-center">
              <p className="text-dl-gray text-sm">No groups found for this address.</p>
              <p className="text-dl-gray text-xs mt-2">Join a group from the Discover tab to get started.</p>
            </div>
          )}

          {!myPracticeLoading && !practiceAddress && (
            <div className="border border-dl-border p-8 text-center">
              <p className="text-dl-gray text-sm">Enter your wallet address or member ID to view your groups.</p>
              <p className="text-dl-gray text-xs mt-2">Your active Wealth Practice circles, contribution schedule, and rotation dates will appear here.</p>
            </div>
          )}

          {myGroups.length > 0 && (
            <div className="space-y-4">
              {myGroups.map((mg) => (
                <div key={mg.id} className="border border-dl-border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-dl-serif text-dl-navy font-bold text-lg">{mg.display_name || `Group #${mg.group_id}`}</div>
                      <div className="font-dl-mono text-xs text-dl-gray">{mg.hub_name} &middot; {mg.region_display}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 uppercase ${STATUS_STYLES[mg.group_status] || 'border border-dl-border text-dl-gray'}`}>
                      {mg.group_status}
                    </span>
                  </div>
                  {mg.description && <p className="text-dl-gray text-sm mb-4">{mg.description}</p>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="border border-dl-border p-3">
                      <div className="text-dl-gray text-xs">Contribution</div>
                      <div className="font-dl-mono text-dl-navy font-bold">${mg.contribution_amount}</div>
                      <div className="text-dl-gray text-xs">{getFrequencyLabel(mg.contribution_frequency)}</div>
                    </div>
                    <div className="border border-dl-border p-3">
                      <div className="text-dl-gray text-xs">Rotation Method</div>
                      <div className="font-dl-mono text-dl-navy font-bold">{getRotationLabel(mg.rotation_method)}</div>
                    </div>
                    <div className="border border-dl-border p-3">
                      <div className="text-dl-gray text-xs">Next Rotation</div>
                      <div className="font-dl-mono text-dl-navy font-bold">{getNextRotationDate(mg.joined_at, mg.cycle_length_days)}</div>
                    </div>
                    <div className="border border-dl-border p-3">
                      <div className="text-dl-gray text-xs">Members</div>
                      <div className="font-dl-mono text-dl-navy font-bold">{mg.member_count}/{mg.max_members}</div>
                      <div className="text-dl-gray text-xs">Position #{mg.position}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-dl-gray text-xs">
                    Joined {new Date(mg.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &middot; Cycle: {mg.cycle_length_days} days
                  </div>
                </div>
              ))}
            </div>
          )}

          {practiceAddress && /^0x[a-fA-F0-9]{40}$/i.test(practiceAddress) && (
            <div className="mt-8">
              <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-1">Banking & Insurance Hold</h3>
              <p className="text-dl-gray text-sm mb-6 leading-relaxed">
                Wealth Practice groups run on real money. All contributions and insurance deposits flow through the
                <span className="font-semibold text-dl-navy"> Axiom Nexus Account</span> — an FDIC-insured institutional
                checking account at First Internet Bank. Each participant gets a unique reference code that ties every
                ACH transfer directly to their record.
              </p>

              {participantLoading && <p className="text-dl-gray text-sm">Loading banking info...</p>}

              {!participantLoading && !participant && (
                <div className="border border-dl-gold p-6 mb-4">
                  <div className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Step 1 — Get Your Reference Code</div>
                  <p className="text-dl-gray text-sm mb-4">
                    Register once to receive your personal <span className="font-dl-mono font-semibold text-dl-navy">AXM-XXXXXXXX</span> reference code.
                    This code is your banking identifier — include it in the memo field of every ACH transfer you send
                    to the Axiom Nexus Account so your deposits are matched automatically.
                  </p>
                  <p className="text-dl-gray text-xs mb-4 font-dl-mono border-l-2 border-dl-gold pl-3">
                    Your information is used to provision a dedicated FDIC-insured account with Increase. Submitted once — never stored beyond what is required.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">Full Legal Name</label>
                      <input type="text" value={regForm.fullName} onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })} placeholder="First Last" className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">Email Address</label>
                      <input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} placeholder="you@example.com" className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">Date of Birth</label>
                      <input type="date" value={regForm.dateOfBirth} onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })} className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">Social Security Number</label>
                      <input type="password" autoComplete="off" value={regForm.ssn} onChange={(e) => { const raw = e.target.value.replace(/\D/g, '').slice(0, 9); setRegForm({ ...regForm, ssn: raw }); }} placeholder="•••••••••" maxLength={9} className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px] font-dl-mono tracking-widest" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-3">
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">Street Address</label>
                      <input type="text" value={regForm.addressLine1} onChange={(e) => setRegForm({ ...regForm, addressLine1: e.target.value })} placeholder="123 Main St" className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">City</label>
                      <input type="text" value={regForm.city} onChange={(e) => setRegForm({ ...regForm, city: e.target.value })} placeholder="Houston" className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">State</label>
                      <input type="text" value={regForm.state} onChange={(e) => setRegForm({ ...regForm, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="TX" maxLength={2} className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px] font-dl-mono uppercase" />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">ZIP Code</label>
                      <input type="text" value={regForm.zip} onChange={(e) => setRegForm({ ...regForm, zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder="77001" maxLength={5} className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px] font-dl-mono" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">Phone (optional)</label>
                    <input type="tel" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px] max-w-xs" />
                  </div>
                  {regError && <p className="text-sm mb-3" style={{ color: '#991b1b' }}>{regError}</p>}
                  {regMsg && <p className="text-dl-forest text-sm mb-3">{regMsg}</p>}
                  <button
                    onClick={handleRegisterParticipant}
                    disabled={regLoading}
                    className="border border-dl-navy bg-dl-navy text-white px-6 py-2.5 min-h-[44px] text-sm font-bold hover:bg-dl-bg hover:text-dl-navy transition-none disabled:opacity-50"
                  >
                    {regLoading ? 'Provisioning account...' : 'Register Axiom Nexus Account'}
                  </button>
                </div>
              )}

              {participant && (
                <div className="border border-dl-forest p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-dl-mono text-xs text-dl-forest uppercase tracking-wider">Axiom Nexus Account — Active</div>
                    <div className="flex items-center gap-3">
                      <span className="font-dl-mono text-xs border border-dl-forest text-dl-forest px-2 py-0.5 uppercase">{participant.status}</span>
                      <a href="/banking/my-account" className="font-dl-mono text-xs text-dl-navy underline hover:no-underline">
                        Full Account →
                      </a>
                    </div>
                  </div>

                  {participant.virtualAccountNumber ? (
                    <div className="mb-5">
                      <p className="text-dl-gray text-xs font-dl-mono uppercase mb-3">Your Dedicated Account Details</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
                        <div className="p-3 border-b md:border-b-0 md:border-r border-dl-border">
                          <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Reference Code</div>
                          <div className="font-dl-mono text-dl-navy font-bold">{participant.participantRef}</div>
                          <div className="text-dl-gray text-xs mt-1">Backup identifier</div>
                        </div>
                        <div className="p-3 border-b md:border-b-0 md:border-r border-dl-border">
                          <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Routing</div>
                          <div className="font-dl-mono text-dl-navy font-bold">{participant.virtualRoutingNumber}</div>
                          <div className="text-dl-gray text-xs mt-1">First Internet Bank</div>
                        </div>
                        <div className="p-3 border-b md:border-b-0 md:border-r border-dl-border">
                          <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Your Account No.</div>
                          <div className="font-dl-mono text-dl-navy font-bold">{participant.virtualAccountNumber}</div>
                          <div className="text-dl-forest text-xs mt-1">No memo needed</div>
                        </div>
                        <div className="p-3">
                          <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Payee</div>
                          <div className="font-dl-mono text-dl-navy text-xs font-bold">Axiom Protocol LLC</div>
                          <div className="text-dl-gray text-xs mt-1">Nexus Account</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-0 border border-dl-border border-t-0">
                        <div className="p-3 border-r border-dl-border">
                          <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Account Balance</div>
                          {participant.accountBalance ? (
                            <div className="font-dl-mono text-dl-navy font-bold">
                              ${(participant.accountBalance.availableBalanceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          ) : (
                            <div className="font-dl-mono text-dl-gray">—</div>
                          )}
                          <div className="text-dl-gray text-xs mt-1">Available · {participant.accountAccessMode === 'dedicated' ? 'Dedicated account' : 'Virtual account'}</div>
                        </div>
                        <div className="p-3">
                          <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Debit Card</div>
                          {participant.cardStatus === 'active' && participant.cardLast4 ? (
                            <div className="font-dl-mono text-dl-navy font-bold">••••&nbsp;{participant.cardLast4}</div>
                          ) : participant.cardStatus === 'issued' ? (
                            <div className="font-dl-mono text-dl-forest">Issued — activation pending</div>
                          ) : (
                            <div className="font-dl-mono text-dl-gray">Not issued</div>
                          )}
                          <div className="text-dl-gray text-xs mt-1">Axiom Nexus Debit · {participant.cardStatus ?? 'not requested'}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                      <div className="border border-dl-border p-4">
                        <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Your Reference Code</div>
                        <div className="font-dl-mono text-dl-navy font-bold text-lg">{participant.participantRef}</div>
                        <div className="text-dl-gray text-xs mt-1">Include in all ACH memo fields</div>
                      </div>
                      <div className="border border-dl-border p-4">
                        <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Routing Number</div>
                        <div className="font-dl-mono text-dl-navy font-bold">071006486</div>
                        <div className="text-dl-gray text-xs mt-1">First Internet Bank</div>
                      </div>
                      <div className="border border-dl-border p-4">
                        <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Payee Name</div>
                        <div className="font-dl-mono text-dl-navy font-bold text-xs">Axiom Protocol LLC</div>
                        <div className="text-dl-gray text-xs mt-1">Nexus Account · Account no. via secure message</div>
                      </div>
                    </div>
                  )}

                  {/* Step 2 — Insurance Hold */}
                  <div className="border border-dl-border p-5 mb-5">
                    <div className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Step 2 — Fund Your Insurance Hold</div>
                    <p className="text-dl-gray text-sm mb-3 leading-relaxed">
                      Every Wealth Practice group requires a one-time insurance hold before your first contribution cycle.
                      The hold is equal to one week&apos;s equivalent of your group&apos;s contribution amount. For example:
                      a $200/month group requires a <span className="font-dl-mono font-semibold text-dl-navy">$50 insurance hold</span>.
                      A $500/month group requires a <span className="font-dl-mono font-semibold text-dl-navy">$125 hold</span>.
                      This amount protects all group members and is fully returned when your group completes its cycle.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border mb-3">
                      <div className="p-3 border-b md:border-b-0 md:border-r border-dl-border">
                        <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Hold Amount</div>
                        <div className="text-dl-navy text-sm font-semibold">One Week Equivalent</div>
                        <div className="text-dl-gray text-xs mt-1">Monthly contribution ÷ 4</div>
                      </div>
                      <div className="p-3 border-b md:border-b-0 md:border-r border-dl-border">
                        <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Released When</div>
                        <div className="text-dl-navy text-sm font-semibold">Group Graduation</div>
                        <div className="text-dl-gray text-xs mt-1">Full ACH return to your bank</div>
                      </div>
                      <div className="p-3">
                        <div className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Early Exit</div>
                        <div className="text-dl-navy text-sm font-semibold">Hold Forfeited</div>
                        <div className="text-dl-gray text-xs mt-1">Protects all group members</div>
                      </div>
                    </div>
                    <p className="text-dl-gray text-xs leading-relaxed">
                      {(participant as { virtualAccountNumber?: string }).virtualAccountNumber
                        ? `Send your hold via ACH using your dedicated account number above — your deposit is automatically matched, no memo required.`
                        : `Send your insurance deposit via ACH to the Axiom Nexus Account — include your reference code ${participant.participantRef} in the memo field. Operations confirms receipt within 1-2 business days.`
                      }
                    </p>
                  </div>

                  {/* Step 3 — Contribute Each Cycle */}
                  <div className="border border-dl-border p-5 mb-5">
                    <div className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Step 3 — Contribute Each Cycle</div>
                    <p className="text-dl-gray text-sm leading-relaxed">
                      Each contribution period, send your group contribution amount via ACH to the Axiom Nexus Account — always with your reference code in the memo.
                      When your rotation comes, Operations distributes the pooled funds directly to your designated account.
                      Your group&apos;s trust score increases with every on-time contribution.
                    </p>
                  </div>

                  {participantHolds.length > 0 && (
                    <div>
                      <div className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-3">Your Insurance Holds</div>
                      <div className="space-y-2">
                        {participantHolds.map((hold) => (
                          <div key={hold.id} className="border border-dl-border p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-dl-mono text-sm text-dl-navy font-bold">{hold.groupDisplayName || hold.groupId}</div>
                                <div className="text-dl-gray text-xs mt-1">
                                  Required: <span className="font-dl-mono text-dl-navy">${(hold.amountCents / 100).toFixed(2)}</span>
                                  {' '}· Deposited: <span className="font-dl-mono text-dl-navy">${(hold.depositedAmountCents / 100).toFixed(2)}</span>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 uppercase font-dl-mono border ${hold.status === 'funded' ? 'border-dl-forest text-dl-forest' : hold.status === 'released' ? 'border-dl-navy text-dl-navy' : hold.status === 'forfeited' ? 'border-red-700 text-red-700' : 'border-dl-gold text-dl-gold'}`}>
                                {hold.status}
                              </span>
                            </div>
                            {hold.status === 'pending' && (
                              <p className="text-dl-gray text-xs mt-2 leading-relaxed">
                                Your hold is pending. Send <span className="font-dl-mono font-semibold text-dl-navy">${(hold.amountCents / 100).toFixed(2)}</span> via ACH to the Axiom Nexus Account (routing 071006486, payee: Axiom Protocol LLC) with memo <span className="font-dl-mono font-semibold text-dl-navy">{participant.participantRef}</span>. Operations will confirm within 1-2 business days.
                              </p>
                            )}
                            {hold.status === 'funded' && (
                              <p className="text-dl-gray text-xs mt-2">Insurance hold funded. You are cleared to participate in this group&apos;s contribution cycles.</p>
                            )}
                            {hold.status === 'released' && (
                              <p className="text-dl-gray text-xs mt-2">Hold released — your group completed its cycle successfully. Well done.</p>
                            )}
                            {hold.status === 'forfeited' && (
                              <p className="text-xs mt-2" style={{ color: '#991b1b' }}>Hold forfeited on early exit. Contact operations if you believe this is in error.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {participantHolds.length === 0 && (
                    <p className="text-dl-gray text-xs border border-dl-border p-4">
                      No insurance holds on file yet. A hold is created automatically when you join a circle group. It will appear here once created.
                    </p>
                  )}
                </div>
              )}

              {/* FAQ — Banking & Insurance */}
              <div className="mt-8 border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Frequently Asked Questions — Banking & Insurance</p>
                </div>
                <div className="divide-y divide-dl-border">
                  {[
                    {
                      q: 'What is the ACH reference code?',
                      a: 'Your personal AXM-XXXXXXXX code is a unique identifier assigned to your wallet address when you register. Every ACH transfer you send to the Axiom Nexus Account must include this code in the memo or description field — it is how your payments are matched to your record automatically.'
                    },
                    {
                      q: 'Where do I send my ACH deposits?',
                      a: 'Send to the Axiom Nexus Account: Routing 071006486 · Bank: First Internet Bank · Payee: Axiom Protocol LLC — Nexus Account. Always include your reference code in the memo field. You will receive the full account number via secure message after registration.'
                    },
                    {
                      q: 'How long does it take for my deposit to be confirmed?',
                      a: 'Standard ACH transfers settle within 1-2 business days. Once the funds clear, Operations will verify your deposit against the memo reference code and update your record — usually within the same business day as settlement.'
                    },
                    {
                      q: 'What happens to my insurance hold if I leave the group early?',
                      a: 'Your insurance hold is forfeited if you exit the group before it graduates. This protects the other members who are counting on everyone to complete the cycle. The forfeiture amount stays in the Axiom Nexus Account and is redistributed or held at Operations\' discretion.'
                    },
                    {
                      q: 'When does my insurance hold get returned?',
                      a: 'Your hold is released when your group completes its full cycle (graduates). Upon graduation, Operations initiates a return ACH to the account on file — or the balance is available for your next group if you re-enroll.'
                    },
                    {
                      q: 'Is my money FDIC insured?',
                      a: 'Yes. All USD held in the Axiom Nexus Account at First Internet Bank is FDIC-insured up to $250,000 per depositor. Axiom Protocol maintains a single institutional account — your funds are part of this account, not a separate personal account.'
                    },
                    {
                      q: 'Do I need to re-register if I join a second group?',
                      a: 'No. You register once. Your AXM-XXXXXXXX reference code applies to all Wealth Practice groups you join. Each new group creates a new insurance hold record tied to your existing participant account.'
                    }
                  ].map(({ q, a }) => (
                    <div key={q} className="px-5 py-4">
                      <p className="text-dl-navy text-sm font-semibold mb-1">{q}</p>
                      <p className="text-dl-gray text-sm leading-relaxed">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
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
                className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
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

            <h4 className="font-dl-serif text-dl-navy font-bold mb-3 mt-2">Group Charter</h4>

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
                <label className="block text-dl-navy text-sm font-bold mb-1">Contribution Frequency</label>
                <select
                  value={createForm.contributionFrequency}
                  onChange={(e) => setCreateForm({ ...createForm, contributionFrequency: e.target.value })}
                  className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-dl-navy text-sm font-bold mb-1">Rotation Method</label>
                <select
                  value={createForm.rotationMethod}
                  onChange={(e) => setCreateForm({ ...createForm, rotationMethod: e.target.value })}
                  className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
                >
                  <option value="round-robin">Round Robin</option>
                  <option value="random">Random</option>
                  <option value="need-based">Need-Based</option>
                </select>
              </div>
              <div>
                <label className="block text-dl-navy text-sm font-bold mb-1">Cycle Length (Days)</label>
                <select
                  value={createForm.cycleLengthDays}
                  onChange={(e) => setCreateForm({ ...createForm, cycleLengthDays: Number(e.target.value) })}
                  className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
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
