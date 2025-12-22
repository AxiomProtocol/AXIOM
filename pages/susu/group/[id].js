import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import GroupMemberDirectory from '../../../components/GroupMemberDirectory';
import { useWallet } from '../../../lib/walletContext';

export default function GroupDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { address } = useWallet();
  
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [isMember, setIsMember] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
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
            </div>

            <div className="border-b border-gray-700">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 font-medium transition ${
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
