import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import toast, { Toaster } from 'react-hot-toast';

interface Profile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  headline: string;
  bio: string;
  purpose_statement: string;
  occupation: string;
  skills: string[];
  location: string;
  website: string;
  social_links: any;
  profile_image_url: string;
  banner_image_url: string;
  wallet_address: string;
  member_tier: string;
  member_since: string;
  total_groups_joined: number;
  total_savings_contributions: number;
  courses_completed: number;
  referral_code: string;
  profile_visibility: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
}

const TIER_CONFIG = {
  explorer: { label: 'Explorer', color: 'bg-gray-500', icon: '🌱' },
  builder: { label: 'Builder', color: 'bg-blue-500', icon: '🔨' },
  leader: { label: 'Leader', color: 'bg-amber-500', icon: '👑' },
};

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop';

export default function ProfilePage() {
  const router = useRouter();
  const { wallet: profileId } = router.query;
  const { walletState, connectMetaMask } = useWallet();
  const address = walletState?.address;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    headline: '',
    bio: '',
    purpose_statement: '',
    occupation: '',
    skills: [] as string[],
    location: '',
    website: '',
    social_links: {} as any,
    show_email: false,
    show_phone: false,
    show_whatsapp: false,
    profile_visibility: 'public',
  });

  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (profileId) {
      fetchProfile();
    }
  }, [profileId, address]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const viewerParam = address ? `?viewer=${address}` : '';
      const res = await fetch(`/api/profile/${profileId}${viewerParam}`);
      const data = await res.json();

      if (data.success) {
        setProfile(data.profile);
        setIsOwner(data.isOwner || false);
        setFormData({
          first_name: data.profile.first_name || '',
          last_name: data.profile.last_name || '',
          username: data.profile.username || '',
          headline: data.profile.headline || '',
          bio: data.profile.bio || '',
          purpose_statement: data.profile.purpose_statement || '',
          occupation: data.profile.occupation || '',
          skills: data.profile.skills || [],
          location: data.profile.location || '',
          website: data.profile.website || '',
          social_links: data.profile.social_links || {},
          show_email: data.profile.show_email ?? false,
          show_phone: data.profile.show_phone ?? false,
          show_whatsapp: data.profile.show_whatsapp ?? false,
          profile_visibility: data.profile.profile_visibility || 'public',
        });
      } else {
        toast.error('Profile not found');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!address) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/profile/${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Profile saved!');
        setEditing(false);
        fetchProfile();
      } else {
        toast.error(data.error || 'Failed to save profile');
      }
    } catch (err) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'profile' | 'banner') => {
    if (!address) return;
    
    const setUploading = type === 'profile' ? setUploadingPhoto : setUploadingBanner;
    setUploading(true);

    try {
      const urlRes = await fetch('/api/profile/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const urlData = await urlRes.json();

      if (!urlData.success || !urlData.uploadUrl) {
        throw new Error('Failed to get upload URL');
      }

      const uploadRes = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      const imageUrl = urlData.uploadUrl.split('?')[0];
      
      const fieldName = type === 'profile' ? 'profile_image_url' : 'banner_image_url';
      await fetch(`/api/profile/${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: imageUrl }),
      });

      toast.success(`${type === 'profile' ? 'Photo' : 'Banner'} updated!`);
      fetchProfile();
    } catch (err) {
      toast.error(`Failed to upload ${type === 'profile' ? 'photo' : 'banner'}`);
    } finally {
      setUploading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const copyProfileLink = () => {
    const url = `${window.location.origin}/profile/${profile?.username || profile?.wallet_address}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Profile link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToSocial = (platform: string) => {
    const url = `${window.location.origin}/profile/${profile?.username || profile?.wallet_address}`;
    const text = `Check out ${profile?.first_name || 'my'}'s profile on Axiom!`;
    
    const urls: any = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const formatWallet = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const displayName = profile?.first_name || profile?.last_name 
    ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
    : profile?.username || formatWallet(profile?.wallet_address || '');

  const tier = TIER_CONFIG[profile?.member_tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.explorer;

  const ogImage = profile?.profile_image_url || '/images/axiom-token.png';
  const ogDescription = profile?.headline || profile?.bio || `Member of the Axiom community`;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-amber-500 text-xl">Loading profile...</div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <Link href="/" className="text-amber-600 hover:text-amber-700">
            Return Home
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{displayName} | Axiom Member Profile</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={`${displayName} | Axiom Member`} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={`${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${profile.username || profile.wallet_address}`} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${displayName} | Axiom Member`} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      <Layout>
        <Toaster position="top-right" />
        
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <div className="relative">
            <div 
              className="h-48 md:h-64 bg-cover bg-center relative"
              style={{ backgroundImage: `url(${profile.banner_image_url || DEFAULT_BANNER})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              
              {isOwner && (
                <label className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg cursor-pointer hover:bg-white transition flex items-center gap-2 shadow-lg">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')}
                    disabled={uploadingBanner}
                  />
                  {uploadingBanner ? (
                    <span className="text-sm text-gray-600">Uploading...</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-700 font-medium">Change Banner</span>
                    </>
                  )}
                </label>
              )}
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-20 relative z-10">
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500">
                      {profile.profile_image_url ? (
                        <img src={profile.profile_image_url} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                          {displayName[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    
                    {isOwner && (
                      <label className="absolute bottom-0 right-0 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-600 transition shadow-lg">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'profile')}
                          disabled={uploadingPhoto}
                        />
                        {uploadingPhoto ? (
                          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </label>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{displayName}</h1>
                        {profile.headline && (
                          <p className="text-lg text-amber-600 font-medium mt-1">{profile.headline}</p>
                        )}
                        {profile.occupation && (
                          <p className="text-gray-600">{profile.occupation}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-sm font-medium ${tier.color}`}>
                            {tier.icon} {tier.label}
                          </span>
                          {profile.location && (
                            <span className="text-gray-500 text-sm flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {profile.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isOwner && !editing && (
                          <button
                            onClick={() => setEditing(true)}
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition"
                          >
                            Edit Profile
                          </button>
                        )}
                        <button
                          onClick={copyProfileLink}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          {copied ? 'Copied!' : 'Share'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-amber-600">{profile.total_groups_joined || 0}</div>
                        <div className="text-sm text-gray-600">Groups Joined</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{profile.total_savings_contributions || 0}</div>
                        <div className="text-sm text-gray-600">Contributions</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{profile.courses_completed || 0}</div>
                        <div className="text-sm text-gray-600">Courses</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{formatDate(profile.member_since || profile.created_at)}</div>
                        <div className="text-sm text-gray-600">Member Since</div>
                      </div>
                    </div>
                  </div>
                </div>

                {editing ? (
                  <div className="mt-8 border-t pt-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Your Profile</h2>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="your_unique_username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                        <input
                          type="text"
                          value={formData.headline}
                          onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="Your professional tagline"
                          maxLength={150}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                        <input
                          type="text"
                          value={formData.occupation}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purpose Statement</label>
                        <textarea
                          value={formData.purpose_statement}
                          onChange={(e) => setFormData({ ...formData, purpose_statement: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="What are your goals? What are you building toward?"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {formData.skills.map((skill, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                              {skill}
                              <button onClick={() => removeSkill(skill)} className="hover:text-amber-900">&times;</button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Add a skill"
                          />
                          <button
                            onClick={addSkill}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                          <select
                            value={formData.profile_visibility}
                            onChange={(e) => setFormData({ ...formData, profile_visibility: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          >
                            <option value="public">Public - Anyone can see your profile</option>
                            <option value="members">Members Only - Only logged in members can see</option>
                            <option value="private">Private - Only you can see your profile</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.show_email}
                              onChange={(e) => setFormData({ ...formData, show_email: e.target.checked })}
                              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-gray-700">Show email on profile</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.show_phone}
                              onChange={(e) => setFormData({ ...formData, show_phone: e.target.checked })}
                              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-gray-700">Show phone on profile</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.show_whatsapp}
                              onChange={(e) => setFormData({ ...formData, show_whatsapp: e.target.checked })}
                              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-gray-700">Show WhatsApp on profile</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {profile?.referral_code && (
                      <div className="mt-6 pt-6 border-t">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Referral Code</h3>
                        <div className="flex items-center gap-3">
                          <code className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 font-mono text-lg">
                            {profile.referral_code}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(profile.referral_code);
                              toast.success('Referral code copied!');
                            }}
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Share this code with friends to earn rewards when they join.</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => setEditing(false)}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(profile.bio || profile.purpose_statement) && (
                      <div className="mt-8 border-t pt-8">
                        {profile.bio && (
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
                          </div>
                        )}
                        {profile.purpose_statement && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Purpose</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{profile.purpose_statement}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {profile.skills && profile.skills.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-8 border-t pt-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Profile</h3>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => shareToSocial('twitter')}
                          className="px-4 py-2 bg-[#1DA1F2] text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          Share on X
                        </button>
                        <button
                          onClick={() => shareToSocial('facebook')}
                          className="px-4 py-2 bg-[#1877F2] text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          Facebook
                        </button>
                        <button
                          onClick={() => shareToSocial('linkedin')}
                          className="px-4 py-2 bg-[#0A66C2] text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          LinkedIn
                        </button>
                        <button
                          onClick={() => shareToSocial('whatsapp')}
                          className="px-4 py-2 bg-[#25D366] text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </button>
                      </div>
                    </div>

                    {profile.website && (
                      <div className="mt-6">
                        <a 
                          href={profile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
