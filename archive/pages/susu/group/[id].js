import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import GroupMemberDirectory from '../../../components/GroupMemberDirectory';
import GraduationProgress from '../../../components/GraduationProgress';
import { useWallet } from '../../../components/WalletConnect/WalletContext';

export default function GroupDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [isMember, setIsMember] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    bio: '',
    purpose_statement: '',
    occupation: '',
    skills: [],
    location: '',
    website: '',
    phone: '',
    whatsapp: '',
    show_email: false,
    show_phone: false,
    show_whatsapp: false,
  });

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
    }
  }, [id]);

  useEffect(() => {
    if (address && activeTab === 'profile') {
      fetchProfile();
    }
  }, [address, activeTab]);

  useEffect(() => {
    if (id && activeTab === 'health') {
      fetchHealth();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (id && activeTab === 'messages') {
      fetchMessages();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (id && activeTab === 'contributions') {
      fetchContributions();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (id && activeTab === 'invites') {
      fetchInvitations();
    }
  }, [id, activeTab]);

  const fetchGroupDetails = async () => {
    try {
      const res = await fetch(`/api/susu/groups/${id}`);
      const data = await res.json();
      
      if (data.success) {
        setGroup(data.group);
      }
    } catch (err) {
      console.error('Failed to fetch group:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!address) return;
    try {
      setProfileLoading(true);
      const res = await fetch(`/api/profile/${address}?viewer=${address}`);
      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        setFormData({
          first_name: data.profile.first_name || '',
          last_name: data.profile.last_name || '',
          username: data.profile.username || '',
          bio: data.profile.bio || '',
          purpose_statement: data.profile.purpose_statement || '',
          occupation: data.profile.occupation || '',
          skills: data.profile.skills || [],
          location: data.profile.location || '',
          website: data.profile.website || '',
          phone: data.profile.phone || '',
          whatsapp: data.profile.whatsapp || '',
          show_email: data.profile.show_email || false,
          show_phone: data.profile.show_phone || false,
          show_whatsapp: data.profile.show_whatsapp || false,
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      setHealthLoading(true);
      const res = await fetch(`/api/susu/groups/${id}/health`);
      const data = await res.json();
      if (data.success) {
        setHealth(data.health);
      }
    } catch (err) {
      console.error('Failed to load health:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const res = await fetch(`/api/susu/groups/${id}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !address) return;
    try {
      setSendingMessage(true);
      const res = await fetch(`/api/susu/groups/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, content: newMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchContributions = async () => {
    try {
      setContributionsLoading(true);
      const res = await fetch(`/api/susu/groups/${id}/contributions`);
      const data = await res.json();
      if (data.success) {
        setContributions(data.contributions || []);
      }
    } catch (err) {
      console.error('Failed to load contributions:', err);
    } finally {
      setContributionsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      setInvitationsLoading(true);
      const res = await fetch(`/api/susu/groups/${id}/invite`);
      const data = await res.json();
      if (data.success) {
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const generateInviteLink = async () => {
    try {
      const res = await fetch(`/api/susu/groups/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (data.success && data.inviteLink) {
        setInviteLink(data.inviteLink);
        setShowInviteLink(true);
        fetchInvitations();
      }
    } catch (err) {
      console.error('Failed to generate invite link:', err);
    }
  };

  const sendEmailInvite = async () => {
    if (!inviteEmail.trim() || !address) return;
    try {
      setSendingInvite(true);
      const res = await fetch(`/api/susu/groups/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, inviteeName: inviteEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteEmail('');
        setInviteLink(data.inviteLink || '');
        setShowInviteLink(!!data.inviteLink);
        fetchInvitations();
      }
    } catch (err) {
      console.error('Failed to send invite:', err);
    } finally {
      setSendingInvite(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('Link copied to clipboard!');
  };

  const checkIfCreator = async () => {
    if (!address || !id) return;
    try {
      const res = await fetch(`/api/susu/groups/${id}/check-owner?wallet=${address}`);
      const data = await res.json();
      if (data.success && data.canDelete) {
        setIsCreator(true);
      }
    } catch (err) {
      console.error('Failed to check creator status:', err);
    }
  };

  useEffect(() => {
    if (address && id) {
      checkIfCreator();
    }
  }, [address, id]);

  const handleDeleteGroup = async () => {
    if (!address || !id) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/susu/groups/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert(data.message || 'Group deleted successfully');
        router.push('/susu');
      } else {
        alert(data.error || 'Failed to delete group');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete group');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/profile/${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (data.success) {
        setEditing(false);
        fetchProfile();
      } else {
        alert(data.error || 'Failed to save profile');
      }
    } catch (err) {
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        
        const res = await fetch(`/api/profile/${address}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_image_url: base64 }),
        });
        
        if (res.ok) {
          fetchProfile();
        } else {
          alert('Failed to upload photo');
        }
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload photo');
      setUploadingPhoto(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatWallet = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
          <div className="text-yellow-500">Loading group...</div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
          <div className="text-red-500">Group not found</div>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'members', label: 'Members' },
    { id: 'graduation', label: 'Graduation' },
    { id: 'health', label: 'Health' },
    { id: 'contributions', label: 'Contributions' },
    { id: 'messages', label: 'Messages' },
    { id: 'invites', label: 'Invites' },
    { id: 'profile', label: 'My Profile' },
    { id: 'about', label: 'About' },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-black pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => router.push('/susu')}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to SUSU
            </button>
          </div>

          <div className="bg-gray-900 rounded-xl border border-yellow-500/20 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 p-6 border-b border-yellow-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                  {group.hub_name && (
                    <p className="text-yellow-500 mt-1">{group.hub_name}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    <span>{group.member_count || 0} / {group.max_members || 50} members</span>
                    <span>Created {formatDate(group.created_at)}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">
                    ${group.contribution_amount || 100} / {group.cycle_duration || 'month'}
                  </div>
                  <div className="text-sm text-gray-400">
                    {group.currency || 'AXM'}
                  </div>
                </div>
              </div>

              {group.description && (
                <p className="mt-4 text-gray-300">{group.description}</p>
              )}

              {isCreator && (
                <div className="mt-4 pt-4 border-t border-yellow-500/20">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete this group
                    </button>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <p className="text-red-400 text-sm mb-3">
                        Are you sure you want to delete this group? This action cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteGroup}
                          disabled={deleting}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                          {deleting ? 'Deleting...' : 'Yes, Delete Group'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-b border-gray-700">
              <div className="flex overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 font-medium transition whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'text-yellow-500 border-b-2 border-yellow-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'members' && (
                <GroupMemberDirectory groupId={id} groupName={group.name} />
              )}

              {activeTab === 'graduation' && (
                <GraduationProgress 
                  groupId={id} 
                  isCreator={isCreator}
                  onGraduate={async () => {
                    const poolId = Math.floor(Math.random() * 1000) + 1;
                    if (confirm('Graduate this group to on-chain status? This will create a charter and enable access to larger investment opportunities.')) {
                      try {
                        const res = await fetch(`/api/susu/groups/${id}/graduate`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ walletAddress: address, poolId })
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(`Group graduated successfully! Mode: ${data.charter?.mode || 'community'}`);
                          fetchGroupDetails();
                        } else {
                          alert(data.error || 'Graduation failed');
                        }
                      } catch (err) {
                        alert('Failed to graduate group');
                      }
                    }
                  }}
                />
              )}

              {activeTab === 'health' && (
                <div>
                  {healthLoading ? (
                    <div className="text-center py-8 text-yellow-500">Loading health data...</div>
                  ) : health ? (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-yellow-500">{Math.round(health.readinessScore || 0)}%</div>
                          <div className="text-gray-400 text-sm">Readiness Score</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-white">{health.memberCount || 0}/{health.readinessChecks?.minMembers?.required || 3}</div>
                          <div className="text-gray-400 text-sm">Members Required</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-green-400">{health.readinessChecks?.walletsConnected?.current || 0}</div>
                          <div className="text-gray-400 text-sm">Wallets Connected</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-blue-400">{Math.round(health.avgReliabilityScore || 50)}%</div>
                          <div className="text-gray-400 text-sm">Avg Reliability</div>
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-lg p-5">
                        <h3 className="text-lg font-semibold text-white mb-4">Graduation Checklist</h3>
                        <div className="space-y-3">
                          {health.readinessChecks && Object.values(health.readinessChecks).map((check, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${check.met ? 'bg-green-500' : 'bg-gray-700'}`}>
                                {check.met ? (
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                                )}
                              </div>
                              <span className={check.met ? 'text-white' : 'text-gray-400'}>
                                {check.label} ({check.current}/{check.required})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {health.payoutSchedule && health.payoutSchedule.length > 0 && (
                        <div className="bg-gray-800 rounded-lg p-5">
                          <h3 className="text-lg font-semibold text-white mb-4">Payout Schedule</h3>
                          <div className="space-y-3">
                            {health.payoutSchedule.slice(0, 5).map((payout, idx) => (
                              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-medium">
                                    {payout.cycle}
                                  </div>
                                  <span className="text-white">{payout.member}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-white font-medium">${payout.amount}</div>
                                  <div className="text-gray-400 text-sm">{formatDate(payout.estimatedDate)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {health.isReadyToGraduate && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <div className="text-green-400 font-medium">Ready to Graduate!</div>
                                <div className="text-gray-400 text-sm">This group meets all requirements to go on-chain</div>
                              </div>
                            </div>
                            {isCreator && (
                              <button
                                onClick={async () => {
                                  if (confirm('Graduate this group to on-chain status? This will create a charter and enable access to larger investment opportunities.')) {
                                    try {
                                      const res = await fetch(`/api/susu/groups/${id}/graduate`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ wallet_address: address })
                                      });
                                      const data = await res.json();
                                      if (data.success) {
                                        alert(`Group graduated successfully! Mode: ${data.charter?.mode || 'community'}`);
                                        fetchGroupDetails();
                                        fetchHealth();
                                      } else {
                                        alert(data.error || 'Graduation failed');
                                      }
                                    } catch (err) {
                                      alert('Failed to graduate group');
                                    }
                                  }
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all text-sm"
                              >
                                Graduate Now
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">No health data available</div>
                  )}
                </div>
              )}

              {activeTab === 'contributions' && (
                <div>
                  {contributionsLoading ? (
                    <div className="text-center py-8 text-yellow-500">Loading contributions...</div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-gray-800 rounded-lg p-5">
                        <h3 className="text-lg font-semibold text-white mb-4">Contribution Progress</h3>
                        <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                          <div 
                            className="bg-yellow-500 h-4 rounded-full transition-all"
                            style={{ width: `${contributions.length > 0 ? Math.min((contributions.filter(c => c.status === 'paid').length / contributions.length) * 100, 100) : 0}%` }}
                          />
                        </div>
                        <div className="text-gray-400 text-sm">
                          {contributions.filter(c => c.status === 'paid').length} of {contributions.length} contributions paid
                        </div>
                      </div>

                      <div className="space-y-3">
                        {contributions.length > 0 ? (
                          contributions.map((contrib, idx) => (
                            <div key={idx} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  contrib.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                  contrib.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                  'bg-gray-700 text-gray-400'
                                }`}>
                                  {contrib.status === 'paid' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <span className="text-sm font-medium">#{contrib.cycle_number || idx + 1}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white font-medium">Cycle {contrib.cycle_number || idx + 1}</div>
                                  <div className="text-gray-400 text-sm">
                                    {contrib.first_name || contrib.username || formatWallet(contrib.wallet_address)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-medium">${contrib.amount}</div>
                                <div className={`text-sm capitalize ${
                                  contrib.status === 'paid' ? 'text-green-400' :
                                  contrib.status === 'pending' ? 'text-yellow-500' : 'text-gray-400'
                                }`}>
                                  {contrib.status}
                                  {contrib.is_late && <span className="ml-2 text-red-400">(Late)</span>}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            No contributions yet. Contributions will appear once the group is active.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex gap-3">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={address ? "Write a message to the group..." : "Connect wallet to send messages"}
                        disabled={!address}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none resize-none disabled:opacity-50"
                        rows={2}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!address || !newMessage.trim() || sendingMessage}
                        className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed h-fit"
                      >
                        {sendingMessage ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>

                  {messagesLoading ? (
                    <div className="text-center py-8 text-yellow-500">Loading messages...</div>
                  ) : messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.map((msg, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-medium">
                              {(msg.sender_name?.[0] || msg.wallet_address?.slice(2, 4) || '?').toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium">{msg.sender_name || formatWallet(msg.wallet_address)}</span>
                                <span className="text-gray-500 text-sm">{formatDate(msg.created_at)}</span>
                                {msg.is_announcement && (
                                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded">Announcement</span>
                                )}
                              </div>
                              <p className="text-gray-300">{msg.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No messages yet. Be the first to start the conversation!
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invites' && (
                <div className="space-y-6">
                  <div className="bg-gray-800 rounded-lg p-5">
                    <h3 className="text-lg font-semibold text-white mb-4">Invite New Members</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <button
                          onClick={generateInviteLink}
                          disabled={!address}
                          className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition disabled:opacity-50"
                        >
                          Generate Invite Link
                        </button>
                      </div>

                      {showInviteLink && inviteLink && (
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-2">Share this link:</div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={inviteLink}
                              readOnly
                              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                            />
                            <button
                              onClick={copyInviteLink}
                              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-700 pt-4">
                        <div className="text-sm text-gray-400 mb-2">Or send an email invite:</div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Enter email address"
                            disabled={!address}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none disabled:opacity-50"
                          />
                          <button
                            onClick={sendEmailInvite}
                            disabled={!address || !inviteEmail.trim() || sendingInvite}
                            className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition disabled:opacity-50"
                          >
                            {sendingInvite ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {invitationsLoading ? (
                    <div className="text-center py-4 text-yellow-500">Loading invitations...</div>
                  ) : invitations.length > 0 ? (
                    <div className="bg-gray-800 rounded-lg p-5">
                      <h3 className="text-lg font-semibold text-white mb-4">Sent Invitations</h3>
                      <div className="space-y-3">
                        {invitations.map((inv, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                            <div>
                              <div className="text-white">{inv.email || 'Link Invite'}</div>
                              <div className="text-gray-400 text-sm">Sent {formatDate(inv.created_at)}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              inv.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                              inv.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {inv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === 'profile' && (
                <div>
                  {!address ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-gray-400 mb-4">Connect your wallet to view and edit your profile</p>
                    </div>
                  ) : profileLoading ? (
                    <div className="text-center py-12">
                      <div className="text-yellow-500">Loading your profile...</div>
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto">
                      <div className="flex items-start gap-6 mb-6">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center overflow-hidden">
                            {profile?.profile_image_url ? (
                              <img src={profile.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl text-yellow-500">
                                {(profile?.first_name?.[0] || profile?.username?.[0] || '?').toUpperCase()}
                              </span>
                            )}
                          </div>
                          {editing && (
                            <label className="absolute bottom-0 right-0 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-yellow-400 transition">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                                disabled={uploadingPhoto}
                              />
                              {uploadingPhoto ? (
                                <svg className="w-3 h-3 text-black animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              )}
                            </label>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-white">
                            {profile?.first_name || profile?.last_name 
                              ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
                              : profile?.username || formatWallet(address)}
                          </h2>
                          {profile?.occupation && (
                            <p className="text-yellow-500">{profile.occupation}</p>
                          )}
                          <p className="text-gray-400 text-sm">{formatWallet(address)}</p>
                        </div>

                        {!editing && (
                          <button
                            onClick={() => setEditing(true)}
                            className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition"
                          >
                            Edit Profile
                          </button>
                        )}
                      </div>

                      {editing ? (
                        <div className="space-y-5">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">First Name</label>
                              <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => handleChange('first_name', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => handleChange('last_name', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Username</label>
                            <input
                              type="text"
                              value={formData.username}
                              onChange={(e) => handleChange('username', e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Occupation / Role</label>
                            <input
                              type="text"
                              value={formData.occupation}
                              onChange={(e) => handleChange('occupation', e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                              placeholder="e.g., Real Estate Investor, Entrepreneur"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Location</label>
                            <input
                              type="text"
                              value={formData.location}
                              onChange={(e) => handleChange('location', e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                              placeholder="e.g., Atlanta, GA"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Bio</label>
                            <textarea
                              value={formData.bio}
                              onChange={(e) => handleChange('bio', e.target.value)}
                              rows={3}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                              placeholder="Tell us about yourself..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Purpose Statement</label>
                            <textarea
                              value={formData.purpose_statement}
                              onChange={(e) => handleChange('purpose_statement', e.target.value)}
                              rows={3}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                              placeholder="What drives you? What are your goals with Axiom?"
                            />
                          </div>

                          <div className="border-t border-gray-700 pt-5">
                            <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                            <p className="text-gray-400 text-sm mb-4">Choose which contact methods to share with other group members.</p>
                            
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <input
                                  type="checkbox"
                                  checked={formData.show_email}
                                  onChange={(e) => handleChange('show_email', e.target.checked)}
                                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
                                />
                                <span className="text-gray-300">Share my email with group members</span>
                              </div>

                              <div>
                                <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                                    placeholder="+1 (555) 123-4567"
                                  />
                                  <label className="flex items-center gap-2 text-gray-300">
                                    <input
                                      type="checkbox"
                                      checked={formData.show_phone}
                                      onChange={(e) => handleChange('show_phone', e.target.checked)}
                                      className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
                                    />
                                    Share
                                  </label>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm text-gray-400 mb-1">WhatsApp Number</label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="tel"
                                    value={formData.whatsapp}
                                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                                    placeholder="+1 (555) 123-4567"
                                  />
                                  <label className="flex items-center gap-2 text-gray-300">
                                    <input
                                      type="checkbox"
                                      checked={formData.show_whatsapp}
                                      onChange={(e) => handleChange('show_whatsapp', e.target.checked)}
                                      className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
                                    />
                                    Share
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              onClick={handleSaveProfile}
                              disabled={saving}
                              className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                            <button
                              onClick={() => setEditing(false)}
                              className="px-6 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {profile?.bio && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-400 mb-2">About</h3>
                              <p className="text-white">{profile.bio}</p>
                            </div>
                          )}

                          {profile?.purpose_statement && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-400 mb-2">Purpose Statement</h3>
                              <p className="text-white">{profile.purpose_statement}</p>
                            </div>
                          )}

                          {profile?.location && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-400 mb-2">Location</h3>
                              <p className="text-white">{profile.location}</p>
                            </div>
                          )}

                          {(profile?.show_email || profile?.show_phone || profile?.show_whatsapp) && (
                            <div className="border-t border-gray-700 pt-5">
                              <h3 className="text-sm font-medium text-gray-400 mb-3">Contact Info (Visible to Members)</h3>
                              <div className="flex flex-wrap gap-3">
                                {profile?.show_email && profile?.email && (
                                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                    Email shared
                                  </span>
                                )}
                                {profile?.show_phone && profile?.phone && (
                                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                    Phone shared
                                  </span>
                                )}
                                {profile?.show_whatsapp && profile?.whatsapp && (
                                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                    WhatsApp shared
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {!profile?.bio && !profile?.purpose_statement && (
                            <div className="text-center py-8 bg-gray-800/50 rounded-lg">
                              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="text-gray-400 mb-4">Your profile is empty. Add some information so other members can get to know you!</p>
                              <button
                                onClick={() => setEditing(true)}
                                className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition"
                              >
                                Complete Your Profile
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Group Purpose</h3>
                    <p className="text-gray-300">{group.purpose || group.description || 'No description provided.'}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Contribution Details</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-white">${group.contribution_amount || 100}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Frequency:</span>
                          <span className="text-white capitalize">{group.cycle_duration || 'Monthly'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Currency:</span>
                          <span className="text-white">{group.currency || 'AXM'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Group Status</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Members:</span>
                          <span className="text-white">{group.member_count || 0} / {group.max_members || 50}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Min to Activate:</span>
                          <span className="text-white">{group.min_members_to_activate || 3}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`${group.is_active ? 'text-green-400' : 'text-yellow-500'}`}>
                            {group.is_active ? 'Active' : 'Forming'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
