import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useWallet } from '../../lib/walletContext';

export default function ProfilePage() {
  const router = useRouter();
  const { wallet: viewWallet } = router.query;
  const { address: connectedWallet } = useWallet();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
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

  const isOwner = connectedWallet && viewWallet && 
    connectedWallet.toLowerCase() === viewWallet.toLowerCase();

  useEffect(() => {
    if (viewWallet) {
      fetchProfile();
    }
  }, [viewWallet]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const viewerParam = connectedWallet ? `?viewer=${connectedWallet}` : '';
      const res = await fetch(`/api/profile/${viewWallet}${viewerParam}`);
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
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/profile/${viewWallet}`, {
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

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
        
        const res = await fetch(`/api/profile/${viewWallet}`, {
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

  const formatWallet = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
          <div className="text-yellow-500">Loading profile...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-black pt-24 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gray-900 rounded-xl border border-yellow-500/20 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 p-6 border-b border-yellow-500/20">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center overflow-hidden">
                    {profile?.profile_image_url ? (
                      <img src={profile.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl text-yellow-500">
                        {(profile?.first_name?.[0] || profile?.username?.[0] || '?').toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isOwner && editing && (
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-yellow-400 transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                      {uploadingPhoto ? (
                        <svg className="w-4 h-4 text-black animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </label>
                  )}
                </div>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white">
                    {profile?.first_name || profile?.last_name 
                      ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
                      : profile?.username || formatWallet(viewWallet)}
                  </h1>
                  {profile?.occupation && (
                    <p className="text-yellow-500 mt-1">{profile.occupation}</p>
                  )}
                  <p className="text-gray-400 text-sm mt-1">{formatWallet(viewWallet)}</p>
                </div>

                {isOwner && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {editing ? (
                <div className="space-y-6">
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

                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
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
                      onClick={handleSave}
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
                <div className="space-y-6">
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

                  {(profile?.email || profile?.phone || profile?.whatsapp) && (
                    <div className="border-t border-gray-700 pt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
                      <div className="flex flex-wrap gap-4">
                        {profile?.email && (
                          <a
                            href={`mailto:${profile.email}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition"
                          >
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email
                          </a>
                        )}
                        {profile?.phone && (
                          <a
                            href={`tel:${profile.phone}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition"
                          >
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Call
                          </a>
                        )}
                        {profile?.whatsapp && (
                          <a
                            href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg text-white hover:bg-green-500 transition"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {!profile?.bio && !profile?.purpose_statement && isOwner && (
                    <div className="text-center py-8">
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
