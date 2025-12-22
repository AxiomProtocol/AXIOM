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

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
    }
  }, [id]);

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
