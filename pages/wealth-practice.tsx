import { Fragment, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../components/design-law/DesignLawLayout';

const CircleWalletEntry = dynamic(
  () => import('../components/circle/CircleWalletEntry'),
  { ssr: false }
);

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

type TabId = 'overview' | 'discover' | 'practice' | 'create' | 'lending';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'discover', label: 'Discover' },
  { id: 'practice', label: 'My Practice' },
  { id: 'create', label: 'Create' },
  { id: 'lending', label: 'Lending' },
];

const STATUS_STYLES: Record<string, string> = {
  forming: 'border border-dl-gold text-dl-gold',
  active: 'border border-dl-forest text-dl-forest',
  graduated: 'border border-dl-navy text-dl-navy',
};

const HUB_CITY_IMAGES: [string, string][] = [
  ['Atlanta', '/wealth-practice/hub-atlanta.png'],
  ['Houston', '/wealth-practice/hub-houston.png'],
  ['Charlotte', '/wealth-practice/hub-charlotte.png'],
];

function getHubCityImage(hubName: string, regionDisplay: string): string | null {
  const text = `${hubName} ${regionDisplay}`.toLowerCase();
  for (const [city, img] of HUB_CITY_IMAGES) {
    if (text.includes(city.toLowerCase())) return img;
  }
  return null;
}

export default function WealthPracticePage() {
  const { address: connectedAddress } = useAccount();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const t = router.query.tab as string | undefined;
    const valid: TabId[] = ['overview', 'discover', 'practice', 'create', 'lending'];
    if (t && valid.includes(t as TabId)) setActiveTab(t as TabId);
  }, [router.query.tab]);

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

  const [joinedHubIds, setJoinedHubIds] = useState<Set<number>>(new Set());
  const [joiningHubId, setJoiningHubId] = useState<number | null>(null);
  const [hubJoinMsg, setHubJoinMsg] = useState('');
  const [hubJoinError, setHubJoinError] = useState('');

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

  // ── Lending tab state ──────────────────────────────────────────────────────
  interface LoanRecord {
    id: string;
    groupId: number;
    borrowerMemberId: string;
    requestedAmountUsd: string;
    fundedAmountUsd: string;
    purpose: string;
    repaymentTerms: string;
    interestRate: string;
    status: 'pending' | 'open' | 'funded' | 'repaying' | 'closed' | 'defaulted';
    stellarTransferId?: string;
    createdAt: string;
    fundedAt?: string;
    closedAt?: string;
    pledges: Array<{
      id: string; lenderMemberId: string; pledgeAmountUsd: string; fulfilledAt?: string; createdAt: string;
    }>;
    pledgeCount: number;
  }

  const [lendingGroupId, setLendingGroupId] = useState('');
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loansError, setLoansError] = useState('');

  const [loanStep, setLoanStep] = useState<'terms' | 'bsa' | null>(null);
  const [loanForm, setLoanForm] = useState({
    borrowerMemberId: '',
    requestedAmountUsd: '',
    purpose: '',
    repaymentTerms: '',
    interestRate: '0',
    routingNumber: '',
    accountNumber: '',
    accountName: '',
  });
  const [loanBsa, setLoanBsa] = useState({
    bsaLegalName: '',
    bsaDob: '',
    bsaCountry: 'US',
    bsaIdType: 'ssn' as 'ssn' | 'passport',
    bsaIdNumber: '',
  });
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [loanMsg, setLoanMsg] = useState('');
  const [loanError, setLoanError] = useState('');

  const [pledgeForm, setPledgeForm] = useState<Record<string, { lenderMemberId: string; pledgeAmountUsd: string }>>({});
  const [pledgeSubmitting, setPledgeSubmitting] = useState<string | null>(null);
  const [pledgeMsg, setPledgeMsg] = useState<Record<string, string>>({});
  const [pledgeError, setPledgeError] = useState<Record<string, string>>({});

  const [repayForm, setRepayForm] = useState<Record<string, { repaymentAmountUsd: string; routingNumber: string; accountNumber: string; accountName: string }>>({});
  const [repaySubmitting, setRepaySubmitting] = useState<string | null>(null);
  const [repayMsg, setRepayMsg] = useState<Record<string, string>>({});
  const [repayError, setRepayError] = useState<Record<string, string>>({});

  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [defaultingLoan, setDefaultingLoan] = useState<string | null>(null);
  const [acceptingPartial, setAcceptingPartial] = useState<string | null>(null);
  const [acceptPartialMsg, setAcceptPartialMsg] = useState<Record<string, string>>({});
  const [acceptPartialError, setAcceptPartialError] = useState<Record<string, string>>({});

  const fetchGroupLoans = async (gId: string) => {
    if (!gId) return;
    setLoansLoading(true);
    setLoansError('');
    try {
      const r = await fetch(`/api/wealth-practice/loans/group/${gId}`);
      const data = await r.json();
      if (data.success) {
        setLoans(data.loans || []);
      } else {
        setLoansError(data.error || 'Failed to load loans');
      }
    } catch {
      setLoansError('Network error loading loans');
    } finally {
      setLoansLoading(false);
    }
  };

  const handleLoanTermsSubmit = () => {
    if (!loanForm.borrowerMemberId.trim()) { setLoanError('Borrower ID is required'); return; }
    const amt = parseFloat(loanForm.requestedAmountUsd);
    if (isNaN(amt) || amt < 10 || amt > 50000) { setLoanError('Amount must be between $10 and $50,000'); return; }
    if (!loanForm.purpose.trim()) { setLoanError('Purpose is required'); return; }
    if (!loanForm.repaymentTerms.trim()) { setLoanError('Repayment terms are required'); return; }
    if (!/^\d{9}$/.test(loanForm.routingNumber)) { setLoanError('Routing number must be exactly 9 digits'); return; }
    if (!loanForm.accountNumber.trim()) { setLoanError('Account number is required'); return; }
    if (!loanForm.accountName.trim()) { setLoanError('Account name is required'); return; }
    setLoanError('');
    setLoanStep('bsa');
  };

  const handleLoanRequest = async () => {
    if (!lendingGroupId) { setLoanError('Select a group first'); return; }
    const missing: string[] = [];
    if (!loanBsa.bsaLegalName) missing.push('Legal Name');
    if (!loanBsa.bsaDob) missing.push('Date of Birth');
    if (!loanBsa.bsaCountry) missing.push('Country');
    if (!loanBsa.bsaIdNumber) missing.push('ID Number');
    if (missing.length > 0) { setLoanError(`Missing: ${missing.join(', ')}`); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(loanBsa.bsaDob)) { setLoanError('Date of birth must be YYYY-MM-DD'); return; }
    if (loanBsa.bsaIdType === 'ssn' && !/^\d{4}$/.test(loanBsa.bsaIdNumber)) { setLoanError('SSN must be last 4 digits only'); return; }

    setLoanSubmitting(true);
    setLoanError('');
    try {
      const r = await fetch('/api/wealth-practice/loans/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: Number(lendingGroupId), ...loanForm, ...loanBsa }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setLoanMsg(`Loan request submitted — ID: ${data.loanId}`);
        setLoanStep(null);
        setLoanForm({ borrowerMemberId: '', requestedAmountUsd: '', purpose: '', repaymentTerms: '', interestRate: '0', routingNumber: '', accountNumber: '', accountName: '' });
        setLoanBsa({ bsaLegalName: '', bsaDob: '', bsaCountry: 'US', bsaIdType: 'ssn', bsaIdNumber: '' });
        fetchGroupLoans(lendingGroupId);
      } else {
        setLoanError(data.error || 'Failed to submit loan request');
      }
    } catch {
      setLoanError('Network error — please try again');
    } finally {
      setLoanSubmitting(false);
    }
  };

  const handlePledge = async (loanId: string) => {
    const form = pledgeForm[loanId];
    if (!form?.lenderMemberId?.trim()) { setPledgeError(prev => ({ ...prev, [loanId]: 'Lender ID is required' })); return; }
    const amt = parseFloat(form?.pledgeAmountUsd || '0');
    if (isNaN(amt) || amt < 1) { setPledgeError(prev => ({ ...prev, [loanId]: 'Pledge amount must be at least $1' })); return; }
    setPledgeSubmitting(loanId);
    setPledgeError(prev => ({ ...prev, [loanId]: '' }));
    try {
      const r = await fetch(`/api/wealth-practice/loans/${loanId}/pledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lenderMemberId: form.lenderMemberId.trim(), pledgeAmountUsd: amt }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setPledgeMsg(prev => ({ ...prev, [loanId]: data.message || 'Pledge recorded.' }));
        setPledgeForm(prev => ({ ...prev, [loanId]: { lenderMemberId: '', pledgeAmountUsd: '' } }));
        fetchGroupLoans(lendingGroupId);
      } else {
        setPledgeError(prev => ({ ...prev, [loanId]: data.error || 'Failed to pledge' }));
      }
    } catch {
      setPledgeError(prev => ({ ...prev, [loanId]: 'Network error' }));
    } finally {
      setPledgeSubmitting(null);
    }
  };

  const handleRepay = async (loanId: string, borrowerMemberId: string) => {
    const form = repayForm[loanId];
    const amt = parseFloat(form?.repaymentAmountUsd || '0');
    if (isNaN(amt) || amt < 1) { setRepayError(prev => ({ ...prev, [loanId]: 'Amount must be at least $1' })); return; }
    setRepaySubmitting(loanId);
    setRepayError(prev => ({ ...prev, [loanId]: '' }));
    try {
      const r = await fetch(`/api/wealth-practice/loans/${loanId}/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerMemberId,
          repaymentAmountUsd: amt,
          routingNumber: form?.routingNumber || undefined,
          accountNumber: form?.accountNumber || undefined,
          accountName: form?.accountName || undefined,
        }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setRepayMsg(prev => ({ ...prev, [loanId]: data.message || 'Repayment recorded.' }));
        setRepayForm(prev => ({ ...prev, [loanId]: { repaymentAmountUsd: '', routingNumber: '', accountNumber: '', accountName: '' } }));
        fetchGroupLoans(lendingGroupId);
      } else {
        setRepayError(prev => ({ ...prev, [loanId]: data.error || 'Failed to record repayment' }));
      }
    } catch {
      setRepayError(prev => ({ ...prev, [loanId]: 'Network error' }));
    } finally {
      setRepaySubmitting(null);
    }
  };

  const handleDefaultLoan = async (loanId: string) => {
    setDefaultingLoan(loanId);
    try {
      const r = await fetch(`/api/wealth-practice/loans/group/${lendingGroupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'default', loanId }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        fetchGroupLoans(lendingGroupId);
      }
    } catch { /* non-fatal */ }
    finally { setDefaultingLoan(null); }
  };

  const handleAcceptPartial = async (loanId: string) => {
    setAcceptingPartial(loanId);
    setAcceptPartialError(prev => ({ ...prev, [loanId]: '' }));
    try {
      const r = await fetch(`/api/wealth-practice/loans/group/${lendingGroupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept-partial', loanId }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setAcceptPartialMsg(prev => ({ ...prev, [loanId]: data.message || 'Partial funding accepted.' }));
        fetchGroupLoans(lendingGroupId);
      } else {
        setAcceptPartialError(prev => ({ ...prev, [loanId]: data.error || 'Failed to accept partial funding' }));
      }
    } catch {
      setAcceptPartialError(prev => ({ ...prev, [loanId]: 'Network error' }));
    } finally {
      setAcceptingPartial(null);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

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

      if (hubsData.success) {
        const loadedHubs: Hub[] = hubsData.hubs || [];
        setHubs(loadedHubs);
        // Check which hubs this wallet has already joined
        if (connectedAddress && loadedHubs.length > 0) {
          try {
            const memberChecks = await Promise.all(
              loadedHubs.map((h) =>
                fetch(`/api/wealth-practice/hub-join?hubId=${h.id}&wallet=${connectedAddress.toLowerCase()}`)
                  .then((r) => r.json())
                  .then((d) => (d.isMember ? h.id : null))
                  .catch(() => null),
              ),
            );
            setJoinedHubIds(new Set(memberChecks.filter((id): id is number => id !== null)));
          } catch { /* non-fatal */ }
        }
      }
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

  const handleJoinHub = async (hubId: number) => {
    if (!connectedAddress) {
      setHubJoinError('Connect your wallet to join a hub');
      return;
    }
    setJoiningHubId(hubId);
    setHubJoinMsg('');
    setHubJoinError('');
    try {
      const res = await fetch('/api/wealth-practice/hub-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubId, walletAddress: connectedAddress }),
      });
      const d = await res.json();
      if (d.success) {
        setJoinedHubIds((prev) => new Set([...prev, hubId]));
        setHubs((prev) =>
          prev.map((h) =>
            h.id === hubId ? { ...h, member_count: (h.member_count || 0) + (d.alreadyMember ? 0 : 1) } : h,
          ),
        );
        setHubJoinMsg(d.alreadyMember ? 'You are already a member of this hub.' : 'Joined hub successfully.');
      } else {
        setHubJoinError(d.error || 'Failed to join hub');
      }
    } catch {
      setHubJoinError('Network error — please try again');
    } finally {
      setJoiningHubId(null);
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
    if (!regForm.ssn || regForm.ssn.replace(/\D/g, '').length !== 4) { setRegError('Last 4 digits of SSN required'); return; }
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
        body: JSON.stringify({
          ...createForm,
          creatorAddress: connectedAddress || undefined,
        }),
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

      {/* Cinematic Hero Banner */}
      <div className="relative mb-8 overflow-hidden -mx-6" style={{ height: '400px' }}>
        <img
          src="/wealth-practice/hero-banner.png"
          alt="Wealth Practice — Community Group Economics"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, rgba(27,42,74,0.90) 0%, rgba(27,42,74,0.60) 55%, rgba(27,42,74,0.20) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-end px-6 sm:px-10 pb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs uppercase font-dl-mono font-bold border border-[#B8973A] text-[#B8973A] px-2 py-0.5">Groups Forming</span>
            <span className="text-xs uppercase font-dl-mono font-bold border border-white/40 text-white/80 px-2 py-0.5">LIVE on Arbitrum One</span>
            <p className="text-white/85 text-sm">Pilot cities: <strong className="text-white">Atlanta</strong>, <strong className="text-white">Houston</strong>, <strong className="text-white">Charlotte</strong></p>
          </div>
          <h1 className="font-dl-serif text-3xl sm:text-4xl text-white font-bold leading-tight mb-2">The Wealth Practice</h1>
          <p className="text-white/75 text-base max-w-lg">Structured group savings framework with a three-stage trust pipeline — on-chain, transparent, and community-governed.</p>
        </div>
      </div>

      <div className="border border-dl-border mb-6 px-5 py-3 bg-dl-bg-alt">
        <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
          <span className="text-dl-navy font-semibold">Custody model:</span> The Wealth Practice operates on a non-custodial group coordination model for on-chain pools — member funds are held in the Wealth Practice Hub automated control layer on Arbitrum One, not by Axiom Protocol directly. For off-chain coordination (Interest Hub stage), contributions and payouts are facilitated by the operations team via bank rails; no third-party bank holds funds on behalf of protocol participants in that stage. Axiom Protocol does not guarantee payout timing or cycle completion. Members retain the right to exit per group agreement terms.
        </p>
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

          <div className="flex flex-col md:flex-row items-stretch mb-10 gap-0">
            {[
              {
                num: '01', title: 'Interest Hub',
                desc: 'Regional community hub. Signal intent and connect with participants in your area.',
                img: '/wealth-practice/stage-hub.png',
                label: 'STAGE ONE',
              },
              {
                num: '02', title: 'Purpose Group',
                desc: 'Goal-oriented group with contribution cycles. Build trust through consistent participation.',
                img: '/wealth-practice/stage-group.png',
                label: 'STAGE TWO',
              },
              {
                num: '03', title: 'On-Chain Pool',
                desc: 'Graduated group deployed to automated control layers. Transparent, verifiable, and self-executing.',
                img: '/wealth-practice/stage-onchain.png',
                label: 'STAGE THREE',
              },
            ].map((stage, idx, arr) => (
              <Fragment key={stage.num}>
                <div className="flex-1 relative overflow-hidden" style={{ minHeight: '220px' }}>
                  <img src={stage.img} alt={stage.title} className="absolute inset-0 w-full h-full object-cover object-center" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(27,42,74,0.92) 0%, rgba(27,42,74,0.55) 60%, rgba(27,42,74,0.2) 100%)' }} />
                  <div className="relative z-10 p-5 h-full flex flex-col justify-end" style={{ minHeight: '220px' }}>
                    <div className="text-white/50 text-[10px] font-dl-mono uppercase tracking-widest mb-1">{stage.label}</div>
                    <div className="font-dl-serif text-xl text-white font-bold mb-2">{stage.title}</div>
                    <p className="text-white/80 text-sm leading-relaxed">{stage.desc}</p>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <>
                    <div className="hidden md:flex items-center px-2 text-dl-gray text-xl z-10">&rarr;</div>
                    <div className="md:hidden flex justify-center py-1 text-dl-gray text-xl">&darr;</div>
                  </>
                )}
              </Fragment>
            ))}
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

          <div className="mt-10 border border-dl-border overflow-hidden">
            {/* Land image header */}
            <div className="relative overflow-hidden" style={{ height: '200px' }}>
              <img
                src="/wealth-practice/bridge-land.png"
                alt="Community land cultivation at golden hour"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(29,61,42,0.25) 0%, rgba(29,61,42,0.80) 100%)' }} />
              <div className="absolute inset-0 flex items-end px-6 pb-5">
                <div>
                  <div className="text-white/60 text-[10px] font-dl-mono uppercase tracking-widest mb-1">Capital Pathway</div>
                  <h3 className="font-dl-serif text-2xl text-white font-bold">Physical-Digital Bridge</h3>
                </div>
              </div>
            </div>
            <div className="p-6">
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
            </div>{/* /p-6 */}
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

      {activeTab === 'overview' && (!practiceAddress || (!myPracticeLoading && myGroups.length === 0)) && (
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
          {/* Discover cinematic banner */}
          <div className="relative overflow-hidden mb-8 -mx-6" style={{ height: '200px' }}>
            <img
              src="/wealth-practice/tab-discover.png"
              alt="Discover community hubs and groups"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(27,42,74,0.88) 0%, rgba(27,42,74,0.55) 50%, rgba(27,42,74,0.15) 100%)' }} />
            <div className="absolute inset-0 flex flex-col justify-center px-8">
              <div className="text-white/55 text-[10px] font-dl-mono uppercase tracking-widest mb-2">Wealth Practice</div>
              <h2 className="font-dl-serif text-2xl text-white font-bold mb-1">Discover</h2>
              <p className="text-white/75 text-sm max-w-sm">Find Interest Hubs and active groups in your city. Join the community building wealth together.</p>
            </div>
          </div>

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

              {hubJoinMsg && (
                <div className="border border-dl-forest bg-dl-bg p-3 mb-4">
                  <p className="text-dl-forest text-sm">{hubJoinMsg}</p>
                </div>
              )}
              {hubJoinError && (
                <div className="border p-3 mb-4" style={{ borderColor: '#991b1b' }}>
                  <p className="text-sm" style={{ color: '#991b1b' }}>{hubJoinError}</p>
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
                  {hubs.map((hub) => {
                    const isMember = joinedHubIds.has(hub.id);
                    const isJoining = joiningHubId === hub.id;
                    const cityImg = getHubCityImage(hub.hub_name || '', hub.region_display || '');
                    return (
                      <div key={hub.id} className={`border flex flex-col overflow-hidden ${isMember ? 'border-dl-forest' : 'border-dl-border'}`}>
                        {/* City image header */}
                        {cityImg ? (
                          <div className="relative overflow-hidden" style={{ height: '130px' }}>
                            <img src={cityImg} alt={hub.region_display} className="w-full h-full object-cover object-center" />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(27,42,74,0.15) 0%, rgba(27,42,74,0.70) 100%)' }} />
                            <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                              <div className="font-dl-serif text-white font-bold leading-snug text-base drop-shadow">{hub.hub_name || hub.region_display}</div>
                              <div className="font-dl-mono text-white/70 text-[10px]">{hub.region_display} &middot; {hub.region_type}</div>
                            </div>
                            {isMember && (
                              <span className="absolute top-2 right-2 text-xs font-dl-mono px-2 py-0.5 border border-dl-forest text-white bg-dl-forest whitespace-nowrap">Member</span>
                            )}
                          </div>
                        ) : (
                          <div className="px-4 pt-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="font-dl-serif text-dl-navy font-bold leading-snug">{hub.hub_name || hub.region_display}</div>
                              {isMember && (
                                <span className="text-xs font-dl-mono px-2 py-0.5 border border-dl-forest text-dl-forest whitespace-nowrap">Member</span>
                              )}
                            </div>
                            <div className="font-dl-mono text-xs text-dl-gray">{hub.region_display} &middot; {hub.region_type}</div>
                          </div>
                        )}
                        <div className="p-4 flex flex-col flex-1 justify-between">
                          <div>
                            <div className="font-dl-mono text-sm text-dl-forest mb-1">{hub.member_count} members</div>
                            {hub.description && (
                              <p className="text-dl-gray text-xs leading-relaxed">{hub.description}</p>
                            )}
                          </div>
                          <div className="mt-4">
                            {!isMember ? (
                              <button
                                onClick={() => handleJoinHub(hub.id)}
                                disabled={isJoining || !connectedAddress}
                                className="w-full border border-dl-navy bg-dl-navy text-white px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy transition-none disabled:opacity-40 min-h-[36px]"
                              >
                                {isJoining ? 'Joining...' : connectedAddress ? 'Join Hub' : 'Connect Wallet'}
                              </button>
                            ) : (
                              <button
                                onClick={() => { setCreateForm(f => ({ ...f, hubId: String(hub.id) })); setActiveTab('create'); }}
                                className="w-full border border-dl-forest text-dl-forest px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-forest hover:text-white transition-none min-h-[36px]"
                              >
                                Create Group in Hub
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                    <div key={group.id} className="border border-dl-border flex overflow-hidden">
                      {/* Gold accent bar */}
                      <div className="w-1 flex-shrink-0" style={{ background: '#B8973A' }} />
                      <div className="flex-1 p-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-dl-serif text-dl-navy font-bold text-base leading-tight">
                              {group.display_name || group.group_id}
                            </div>
                            <div className="text-dl-gray text-xs font-dl-mono mt-0.5">{group.region_display || '—'}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-xs px-2 py-0.5 uppercase ${STATUS_STYLES[group.status] || 'border border-dl-border text-dl-gray'}`}>
                              {group.status}
                            </span>
                            {/* Contribution amount badge */}
                            <div className="text-right">
                              <span className="font-dl-mono text-lg font-bold text-dl-navy">${group.contribution_amount}</span>
                              <span className="text-dl-gray text-xs font-dl-mono ml-1">/{getFrequencyLabel(group.contribution_frequency || 'monthly').toLowerCase()}</span>
                            </div>
                          </div>
                        </div>
                        {group.description && (
                          <p className="text-dl-gray text-xs mb-3 leading-relaxed">{group.description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                          <div>
                            <span className="text-dl-gray">Rotation:</span>
                            <span className="font-dl-mono text-dl-navy ml-1">{getRotationLabel(group.rotation_method || 'round-robin')}</span>
                          </div>
                          <div>
                            <span className="text-dl-gray">Cycle:</span>
                            <span className="font-dl-mono text-dl-navy ml-1">{group.cycle_length_days}d</span>
                          </div>
                        </div>
                        {/* Member fill bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-dl-gray">Members</span>
                            <span className="font-dl-mono text-dl-navy">{group.member_count}/{group.max_members}</span>
                          </div>
                          <div className="w-full border border-dl-border h-1.5 bg-dl-bg">
                            <div
                              className="h-full"
                              style={{ width: `${Math.round(((group.member_count || 0) / (group.max_members || 12)) * 100)}%`, background: '#1B2A4A' }}
                            />
                          </div>
                        </div>
                        {/* Trust score bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-dl-gray">Trust Score</span>
                            <span className="font-dl-mono text-dl-navy">{group.trust_score}/100</span>
                          </div>
                          <div className="w-full border border-dl-border h-1.5 bg-dl-bg">
                            <div
                              className="h-full"
                              style={{ width: `${group.trust_score}%`, background: '#B8973A' }}
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
                                <div className="mb-3">
                                  <div className="border border-dl-border p-3 text-xs text-dl-gray mb-2">
                                    Connect your wallet to continue joining this group.
                                  </div>
                                  <CircleWalletEntry
                                    context="wealth-practice"
                                    onWalletReady={(addr) => setJoinWallet(addr)}
                                  />
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
          {/* My Practice cinematic banner */}
          <div className="relative overflow-hidden mb-8 -mx-6" style={{ height: '200px' }}>
            <img
              src="/wealth-practice/tab-practice.png"
              alt="Track your personal wealth practice"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 40%' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(29,61,42,0.90) 0%, rgba(29,61,42,0.60) 45%, rgba(29,61,42,0.15) 100%)' }} />
            <div className="absolute inset-0 flex flex-col justify-center px-8">
              <div className="text-white/55 text-[10px] font-dl-mono uppercase tracking-widest mb-2">Wealth Practice</div>
              <h2 className="font-dl-serif text-2xl text-white font-bold mb-1">My Practice</h2>
              <p className="text-white/75 text-sm max-w-sm">Track your active groups, contribution schedule, and rotation history — all from your wallet address.</p>
            </div>
          </div>

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
            <div className="border border-dl-border overflow-hidden">
              <div className="relative h-24 overflow-hidden">
                <img src="/wealth-practice/tab-practice.png" alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center 60%' }} />
                <div className="absolute inset-0" style={{ background: 'rgba(29,61,42,0.80)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-dl-mono text-xs uppercase tracking-widest opacity-70">No groups found</span>
                </div>
              </div>
              <div className="p-6 text-center">
                <p className="text-dl-navy text-sm font-semibold mb-1">No Wealth Practice groups found for this address.</p>
                <p className="text-dl-gray text-xs mt-1 mb-4">Discover an Interest Hub and join your first group to begin building wealth together.</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="border border-dl-forest bg-dl-forest text-white text-xs font-dl-mono uppercase px-5 py-2"
                >
                  Explore Hubs &rarr;
                </button>
              </div>
            </div>
          )}

          {!myPracticeLoading && !practiceAddress && (
            <div className="border border-dl-border overflow-hidden">
              <div className="relative h-28 overflow-hidden">
                <img src="/wealth-practice/tab-practice.png" alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center 50%' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(27,42,74,0.55) 0%, rgba(27,42,74,0.82) 100%)' }} />
                <div className="absolute inset-0 flex items-center px-8">
                  <div>
                    <p className="text-white font-dl-serif text-base font-bold">Track your contribution journey</p>
                    <p className="text-white/65 text-xs mt-1 font-dl-mono">Enter wallet address above to view groups, schedule &amp; payouts</p>
                  </div>
                </div>
              </div>
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
                      <label className="block text-dl-navy text-xs font-bold mb-1 font-dl-mono uppercase">Last 4 of SSN</label>
                      <input type="password" autoComplete="off" value={regForm.ssn} onChange={(e) => setRegForm({ ...regForm, ssn: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="••••" maxLength={4} className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px] font-dl-mono tracking-widest" />
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
          {/* Create tab cinematic banner */}
          <div className="relative overflow-hidden mb-8 -mx-6" style={{ height: '220px' }}>
            <img
              src="/wealth-practice/tab-create.png"
              alt="Founding a Wealth Practice Group"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 30%' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(27,42,74,0.30) 0%, rgba(27,42,74,0.92) 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 pb-6 px-8">
              <div className="text-white/55 text-[10px] font-dl-mono uppercase tracking-widest mb-1">Wealth Practice</div>
              <h2 className="font-dl-serif text-2xl text-white font-bold leading-tight">Create a Group</h2>
              <p className="text-white/70 text-sm mt-1 max-w-md">Establish a new purpose group within an existing Interest Hub. Groups activate once minimum participation is reached.</p>
            </div>
          </div>

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

      {activeTab === 'lending' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-dl-serif text-xl text-dl-navy font-bold">Peer Lending</h2>
              <p className="text-dl-gray text-sm mt-1">Members can request and fund loans within their group. Community-governed. No credit scoring.</p>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={lendingGroupId}
                onChange={(e) => {
                  setLendingGroupId(e.target.value);
                  setLoans([]);
                  setLoanMsg('');
                  setLoanError('');
                  setLoanStep(null);
                  if (e.target.value) fetchGroupLoans(e.target.value);
                }}
                className="border border-dl-border bg-dl-bg px-3 py-2 text-sm text-dl-navy focus:outline-none min-h-[44px]"
              >
                <option value="">— Select a group —</option>
                {myGroups.map((g) => (
                  <option key={g.group_id} value={String(g.group_id)}>
                    {g.display_name || `Group #${g.group_id}`}
                  </option>
                ))}
                {groups.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.display_name || `Group #${g.id}`}
                  </option>
                ))}
              </select>
              {lendingGroupId && (
                <button
                  onClick={() => {
                    setLoanStep('terms');
                    setLoanMsg('');
                    setLoanError('');
                  }}
                  className="border border-dl-navy bg-dl-navy text-white px-4 py-2 text-sm font-bold hover:bg-dl-bg hover:text-dl-navy transition-none min-h-[44px] whitespace-nowrap"
                >
                  + Request Loan
                </button>
              )}
            </div>
          </div>

          {!lendingGroupId && (
            <div className="border border-dl-border p-8 text-center">
              <p className="text-dl-gray text-sm">Select a group above to view open loan requests and activity.</p>
              {myGroups.length === 0 && groups.length === 0 && (
                <p className="text-dl-gray text-xs mt-2">You are not a member of any group yet. Visit the Discover tab to join one.</p>
              )}
            </div>
          )}

          {lendingGroupId && (
            <>
              {loanStep === 'terms' && (
                <div className="border border-dl-navy p-6 mb-6 max-w-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-dl-serif text-lg text-dl-navy font-bold">Request a Loan — Step 1: Terms</h3>
                    <button onClick={() => { setLoanStep(null); setLoanError(''); }} className="text-dl-gray text-xs hover:text-dl-navy">Cancel</button>
                  </div>

                  <div className="mb-3">
                    <label className="block text-dl-navy text-sm font-bold mb-1">Your Member ID / Wallet Address</label>
                    <input
                      type="text"
                      value={loanForm.borrowerMemberId}
                      onChange={(e) => setLoanForm({ ...loanForm, borrowerMemberId: e.target.value })}
                      placeholder="e.g. 0x1234... or member handle"
                      className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Loan Amount ($)</label>
                      <input
                        type="number"
                        min={10}
                        max={50000}
                        value={loanForm.requestedAmountUsd}
                        onChange={(e) => setLoanForm({ ...loanForm, requestedAmountUsd: e.target.value })}
                        placeholder="500"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Interest Rate (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={loanForm.interestRate}
                        onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                        placeholder="0"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-dl-navy text-sm font-bold mb-1">Purpose</label>
                    <input
                      type="text"
                      value={loanForm.purpose}
                      onChange={(e) => setLoanForm({ ...loanForm, purpose: e.target.value })}
                      placeholder="e.g. Home repair, emergency medical, business supplies"
                      className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-dl-navy text-sm font-bold mb-1">Repayment Terms</label>
                    <textarea
                      rows={2}
                      value={loanForm.repaymentTerms}
                      onChange={(e) => setLoanForm({ ...loanForm, repaymentTerms: e.target.value })}
                      placeholder="e.g. Lump sum in 60 days, or 4 monthly installments of $125"
                      className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none resize-none"
                    />
                  </div>

                  <h4 className="font-dl-serif text-dl-navy font-bold mb-2 text-sm">Disbursement Bank Account</h4>
                  <p className="text-dl-gray text-xs mb-3">Your bank details are stored encrypted and used only to disburse funded loans via ACH.</p>

                  <div className="mb-3">
                    <label className="block text-dl-navy text-sm font-bold mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={loanForm.accountName}
                      onChange={(e) => setLoanForm({ ...loanForm, accountName: e.target.value })}
                      placeholder="Full legal name on account"
                      className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Routing Number</label>
                      <input
                        type="text"
                        maxLength={9}
                        value={loanForm.routingNumber}
                        onChange={(e) => setLoanForm({ ...loanForm, routingNumber: e.target.value.replace(/\D/g, '') })}
                        placeholder="9 digits"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Account Number</label>
                      <input
                        type="text"
                        value={loanForm.accountNumber}
                        onChange={(e) => setLoanForm({ ...loanForm, accountNumber: e.target.value })}
                        placeholder="Checking account"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                      />
                    </div>
                  </div>

                  {loanError && <p className="text-sm mb-3" style={{ color: '#991b1b' }}>{loanError}</p>}

                  <button
                    onClick={handleLoanTermsSubmit}
                    className="border border-dl-navy bg-dl-navy text-white px-6 py-2 text-sm font-bold hover:bg-dl-bg hover:text-dl-navy transition-none"
                  >
                    Next: Verify Identity &rarr;
                  </button>
                </div>
              )}

              {loanStep === 'bsa' && (
                <div className="border border-dl-gold p-6 mb-6 max-w-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-dl-serif text-lg text-dl-navy font-bold">Step 2: Identity Verification (BSA)</h3>
                    <button onClick={() => { setLoanStep('terms'); setLoanError(''); }} className="text-dl-gray text-xs hover:text-dl-navy">&larr; Back</button>
                  </div>
                  <p className="text-dl-gray text-sm mb-4">Required for all loan disbursements under Bank Secrecy Act compliance. Your information is hashed and never stored in plaintext.</p>

                  <div className="mb-3">
                    <label className="block text-dl-navy text-sm font-bold mb-1">Legal Full Name</label>
                    <input
                      type="text"
                      value={loanBsa.bsaLegalName}
                      onChange={(e) => setLoanBsa({ ...loanBsa, bsaLegalName: e.target.value })}
                      className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Date of Birth (YYYY-MM-DD)</label>
                      <input
                        type="text"
                        value={loanBsa.bsaDob}
                        onChange={(e) => setLoanBsa({ ...loanBsa, bsaDob: e.target.value })}
                        placeholder="1990-01-15"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">Country of Residence</label>
                      <input
                        type="text"
                        value={loanBsa.bsaCountry}
                        onChange={(e) => setLoanBsa({ ...loanBsa, bsaCountry: e.target.value })}
                        placeholder="US"
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">ID Type</label>
                      <select
                        value={loanBsa.bsaIdType}
                        onChange={(e) => setLoanBsa({ ...loanBsa, bsaIdType: e.target.value as 'ssn' | 'passport' })}
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
                      >
                        <option value="ssn">SSN (last 4)</option>
                        <option value="passport">Passport Number</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-dl-navy text-sm font-bold mb-1">
                        {loanBsa.bsaIdType === 'ssn' ? 'Last 4 of SSN' : 'Passport Number'}
                      </label>
                      <input
                        type="text"
                        value={loanBsa.bsaIdNumber}
                        onChange={(e) => setLoanBsa({ ...loanBsa, bsaIdNumber: e.target.value })}
                        placeholder={loanBsa.bsaIdType === 'ssn' ? '4 digits' : 'Alphanumeric'}
                        maxLength={loanBsa.bsaIdType === 'ssn' ? 4 : 20}
                        className="w-full border border-dl-border bg-dl-bg px-4 py-2 text-sm font-dl-mono text-dl-navy focus:outline-none"
                      />
                    </div>
                  </div>

                  {loanError && <p className="text-sm mb-3" style={{ color: '#991b1b' }}>{loanError}</p>}

                  <button
                    onClick={handleLoanRequest}
                    disabled={loanSubmitting}
                    className="border border-dl-navy bg-dl-navy text-white px-6 py-2 text-sm font-bold hover:bg-dl-bg hover:text-dl-navy transition-none disabled:opacity-50"
                  >
                    {loanSubmitting ? 'Submitting...' : 'Submit Loan Request'}
                  </button>
                </div>
              )}

              {loanMsg && (
                <div className="border border-dl-forest p-3 mb-4 text-sm text-dl-forest">
                  {loanMsg}
                </div>
              )}

              {loansLoading && <p className="text-dl-gray text-sm">Loading loans...</p>}
              {loansError && <p className="text-sm mb-4" style={{ color: '#991b1b' }}>{loansError}</p>}

              {!loansLoading && loans.length === 0 && !loansError && (
                <div className="border border-dl-border p-8 text-center">
                  <p className="text-dl-gray text-sm">No loan requests yet in this group.</p>
                  <p className="text-dl-gray text-xs mt-1">Click &ldquo;Request Loan&rdquo; above to submit the first one.</p>
                </div>
              )}

              {loans.map((loan) => {
                const fundedPct = Math.min(100, (parseFloat(loan.fundedAmountUsd) / parseFloat(loan.requestedAmountUsd)) * 100);
                const statusColors: Record<string, string> = {
                  open: 'border-dl-gold text-dl-gold',
                  funded: 'border-dl-forest text-dl-forest',
                  repaying: 'border-dl-navy text-dl-navy',
                  closed: 'border-dl-gray text-dl-gray',
                  defaulted: 'text-red-700 border-red-300',
                  pending: 'border-dl-gold text-dl-gold',
                };
                const statusLabel: Record<string, string> = {
                  open: 'Open — Seeking Pledges',
                  funded: 'Funded — Disbursed',
                  repaying: 'Repaying',
                  closed: 'Closed — Fully Repaid',
                  defaulted: 'Defaulted',
                  pending: 'Pending',
                };
                return (
                  <div key={loan.id} className="border border-dl-border mb-4">
                    <div
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[10px] font-dl-mono uppercase border px-2 py-0.5 ${statusColors[loan.status] || 'border-dl-border text-dl-gray'}`}>
                            {statusLabel[loan.status] || loan.status}
                          </span>
                          <span className="text-dl-gray text-xs">{new Date(loan.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="font-dl-serif text-dl-navy font-bold text-base">{loan.purpose}</div>
                        <div className="text-dl-gray text-xs mt-0.5">Borrower: <span className="font-dl-mono">{loan.borrowerMemberId}</span></div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-dl-mono text-xl text-dl-navy font-bold">${parseFloat(loan.requestedAmountUsd).toFixed(2)}</div>
                        <div className="text-dl-gray text-xs">
                          Funded: ${parseFloat(loan.fundedAmountUsd).toFixed(2)}
                          {parseFloat(loan.interestRate) > 0 && ` · ${parseFloat(loan.interestRate)}% interest`}
                        </div>
                        <div className="text-dl-gray text-xs mt-0.5">{loan.pledgeCount} pledge{loan.pledgeCount !== 1 ? 's' : ''}</div>
                      </div>
                    </div>

                    {['pending', 'open'].includes(loan.status) && (
                      <div className="mx-5 mb-3">
                        <div className="h-1.5 bg-dl-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-dl-forest rounded-full transition-all"
                            style={{ width: `${fundedPct}%` }}
                          />
                        </div>
                        <div className="text-dl-gray text-xs mt-1">
                          {fundedPct.toFixed(0)}% funded
                          {loan.status === 'pending' && ' — accepting pledges'}
                        </div>
                      </div>
                    )}

                    {expandedLoan === loan.id && (
                      <div className="border-t border-dl-border px-5 pb-5 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-dl-gray text-xs font-bold uppercase mb-1">Repayment Terms</div>
                            <p className="text-dl-navy text-sm">{loan.repaymentTerms}</p>
                          </div>
                          {loan.stellarTransferId && (
                            <div>
                              <div className="text-dl-gray text-xs font-bold uppercase mb-1">Axiom Rail Transfer</div>
                              <p className="font-dl-mono text-xs text-dl-navy break-all">{loan.stellarTransferId}</p>
                            </div>
                          )}
                        </div>

                        {loan.pledges.length > 0 && (
                          <div className="mb-4">
                            <div className="text-dl-gray text-xs font-bold uppercase mb-2">Pledges</div>
                            <div className="divide-y divide-dl-border border border-dl-border">
                              {loan.pledges.map((p) => (
                                <div key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
                                  <span className="font-dl-mono text-dl-navy text-xs">{p.lenderMemberId}</span>
                                  <span className="text-dl-navy font-bold">${parseFloat(p.pledgeAmountUsd).toFixed(2)}</span>
                                  {p.fulfilledAt && <span className="text-dl-forest text-xs">Fulfilled</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {['pending', 'open'].includes(loan.status) && (
                          <div className="border border-dl-border p-4 mb-3">
                            <h4 className="font-dl-serif text-dl-navy font-bold text-sm mb-3">Pledge to Fund</h4>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-dl-navy text-xs font-bold mb-1">Your Member ID</label>
                                <input
                                  type="text"
                                  value={pledgeForm[loan.id]?.lenderMemberId || ''}
                                  onChange={(e) => setPledgeForm(prev => ({ ...prev, [loan.id]: { ...prev[loan.id], lenderMemberId: e.target.value } }))}
                                  placeholder="Your wallet or member ID"
                                  className="w-full border border-dl-border bg-dl-bg px-3 py-2 text-xs text-dl-navy focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-dl-navy text-xs font-bold mb-1">Pledge Amount ($)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={pledgeForm[loan.id]?.pledgeAmountUsd || ''}
                                  onChange={(e) => setPledgeForm(prev => ({ ...prev, [loan.id]: { ...prev[loan.id], pledgeAmountUsd: e.target.value } }))}
                                  placeholder="100"
                                  className="w-full border border-dl-border bg-dl-bg px-3 py-2 text-xs font-dl-mono text-dl-navy focus:outline-none"
                                />
                              </div>
                            </div>
                            {pledgeError[loan.id] && <p className="text-xs mb-2" style={{ color: '#991b1b' }}>{pledgeError[loan.id]}</p>}
                            {pledgeMsg[loan.id] && <p className="text-xs mb-2 text-dl-forest">{pledgeMsg[loan.id]}</p>}
                            <button
                              onClick={() => handlePledge(loan.id)}
                              disabled={pledgeSubmitting === loan.id}
                              className="border border-dl-forest bg-dl-forest text-white px-4 py-2 text-xs font-bold hover:bg-dl-bg hover:text-dl-forest transition-none disabled:opacity-50"
                            >
                              {pledgeSubmitting === loan.id ? 'Pledging...' : 'Submit Pledge'}
                            </button>
                          </div>
                        )}

                        {['pending', 'open'].includes(loan.status) && parseFloat(loan.fundedAmountUsd) >= 1 && (
                          <div className="border border-dl-gold p-4 mb-3">
                            <h4 className="font-dl-serif text-dl-navy font-bold text-sm mb-1">Accept Partial Funding</h4>
                            <p className="text-dl-gray text-xs mb-3">
                              ${parseFloat(loan.fundedAmountUsd).toFixed(2)} of ${parseFloat(loan.requestedAmountUsd).toFixed(2)} has been pledged.
                              As the borrower, you can accept the current partial amount and trigger disbursement now, or wait for full funding.
                            </p>
                            {acceptPartialError[loan.id] && <p className="text-xs mb-2" style={{ color: '#991b1b' }}>{acceptPartialError[loan.id]}</p>}
                            {acceptPartialMsg[loan.id] && <p className="text-xs mb-2 text-dl-forest">{acceptPartialMsg[loan.id]}</p>}
                            <button
                              onClick={() => handleAcceptPartial(loan.id)}
                              disabled={acceptingPartial === loan.id}
                              className="border border-dl-gold text-dl-gold px-4 py-2 text-xs font-bold hover:bg-dl-gold hover:text-white transition-none disabled:opacity-50"
                            >
                              {acceptingPartial === loan.id ? 'Processing...' : `Accept $${parseFloat(loan.fundedAmountUsd).toFixed(2)} & Disburse`}
                            </button>
                          </div>
                        )}

                        {(loan.status === 'funded' || loan.status === 'repaying') && (
                          <div className="border border-dl-border p-4 mb-3">
                            <h4 className="font-dl-serif text-dl-navy font-bold text-sm mb-3">Submit a Repayment</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="block text-dl-navy text-xs font-bold mb-1">Amount ($)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={repayForm[loan.id]?.repaymentAmountUsd || ''}
                                  onChange={(e) => setRepayForm(prev => ({ ...prev, [loan.id]: { ...prev[loan.id] || {}, repaymentAmountUsd: e.target.value, routingNumber: prev[loan.id]?.routingNumber || '', accountNumber: prev[loan.id]?.accountNumber || '', accountName: prev[loan.id]?.accountName || '' } }))}
                                  placeholder="250"
                                  className="w-full border border-dl-border bg-dl-bg px-3 py-2 text-xs font-dl-mono text-dl-navy focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-dl-navy text-xs font-bold mb-1">Routing # (optional)</label>
                                <input
                                  type="text"
                                  maxLength={9}
                                  value={repayForm[loan.id]?.routingNumber || ''}
                                  onChange={(e) => setRepayForm(prev => ({ ...prev, [loan.id]: { ...prev[loan.id] || {}, routingNumber: e.target.value.replace(/\D/g, ''), repaymentAmountUsd: prev[loan.id]?.repaymentAmountUsd || '', accountNumber: prev[loan.id]?.accountNumber || '', accountName: prev[loan.id]?.accountName || '' } }))}
                                  placeholder="9 digits"
                                  className="w-full border border-dl-border bg-dl-bg px-3 py-2 text-xs font-dl-mono text-dl-navy focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-dl-navy text-xs font-bold mb-1">Account # (optional)</label>
                                <input
                                  type="text"
                                  value={repayForm[loan.id]?.accountNumber || ''}
                                  onChange={(e) => setRepayForm(prev => ({ ...prev, [loan.id]: { ...prev[loan.id] || {}, accountNumber: e.target.value, repaymentAmountUsd: prev[loan.id]?.repaymentAmountUsd || '', routingNumber: prev[loan.id]?.routingNumber || '', accountName: prev[loan.id]?.accountName || '' } }))}
                                  placeholder="Checking"
                                  className="w-full border border-dl-border bg-dl-bg px-3 py-2 text-xs font-dl-mono text-dl-navy focus:outline-none"
                                />
                              </div>
                            </div>
                            {repayError[loan.id] && <p className="text-xs mb-2" style={{ color: '#991b1b' }}>{repayError[loan.id]}</p>}
                            {repayMsg[loan.id] && <p className="text-xs mb-2 text-dl-forest">{repayMsg[loan.id]}</p>}
                            <button
                              onClick={() => handleRepay(loan.id, loan.borrowerMemberId)}
                              disabled={repaySubmitting === loan.id}
                              className="border border-dl-navy bg-dl-navy text-white px-4 py-2 text-xs font-bold hover:bg-dl-bg hover:text-dl-navy transition-none disabled:opacity-50"
                            >
                              {repaySubmitting === loan.id ? 'Submitting...' : 'Record Repayment'}
                            </button>
                          </div>
                        )}

                        {!['closed', 'defaulted'].includes(loan.status) && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDefaultLoan(loan.id)}
                              disabled={defaultingLoan === loan.id}
                              className="text-xs text-dl-gray border border-dl-border px-3 py-1.5 hover:border-red-300 hover:text-red-700 transition-none disabled:opacity-50"
                            >
                              {defaultingLoan === loan.id ? 'Marking...' : 'Mark as Defaulted (Admin)'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mt-6 border border-dl-border p-4">
                <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
                  <span className="text-dl-navy font-semibold">Peer Lending Model:</span> Loans within Wealth Practice groups are community-governed. There is no automated enforcement or credit scoring. Group trust and social accountability govern repayment. Axiom Protocol facilitates disbursement and repayment tracking through Axiom Rail (ACH) but does not guarantee loan recovery. Members lend at their own discretion.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </DesignLawLayout>
  );
}
