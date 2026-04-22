import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { usePersonalization } from '../lib/usePersonalization';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface MarketplaceItem {
  id: string;
  type: 'land' | 'susu' | 'skill' | 'resource' | 'event';
  title: string;
  description: string;
  creator: {
    name: string;
    address?: string;
    avatar?: string;
  };
  tags: string[];
  engagement: {
    views: number;
    interested: number;
    comments: number;
  };
  createdAt: string;
  status: 'active' | 'pending' | 'completed';
  details: Record<string, any>;
}

interface FilterOptions {
  type: string;
  sortBy: string;
  tags: string[];
}

const ITEM_TYPES = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'land', label: 'Land Opportunities', icon: '🌍' },
  { id: 'susu', label: 'Savings Groups', icon: '💰' },
  { id: 'skill', label: 'Skills & Services', icon: '🛠️' },
  { id: 'resource', label: 'Resources', icon: '📦' },
  { id: 'event', label: 'Events', icon: '📅' }
];

const SAMPLE_ITEMS: MarketplaceItem[] = [
  {
    id: '1',
    type: 'land',
    title: 'Community Garden Plot - Atlanta Area',
    description: 'Looking for community members to join a collective land purchase for urban farming and community space.',
    creator: { name: 'Marcus J.', avatar: '👤' },
    tags: ['urban-farming', 'atlanta', 'collective'],
    engagement: { views: 245, interested: 18, comments: 12 },
    createdAt: '2026-01-08',
    status: 'active',
    details: { targetAmount: 50000, currentAmount: 23500, acres: 2.5 }
  },
  {
    id: '2',
    type: 'susu',
    title: 'Tech Professionals SUSU Circle',
    description: 'Monthly savings circle for tech professionals. $500/month contribution, 12-month cycle.',
    creator: { name: 'Diamond Circle', avatar: '💎' },
    tags: ['tech', 'professionals', 'monthly'],
    engagement: { views: 189, interested: 24, comments: 8 },
    createdAt: '2026-01-07',
    status: 'active',
    details: { contribution: 500, members: 8, maxMembers: 12, cycle: '12 months' }
  },
  {
    id: '3',
    type: 'skill',
    title: 'Smart Contract Development Services',
    description: 'Offering smart contract audit and development services. Experienced Solidity developer.',
    creator: { name: 'Alex T.', avatar: '👨‍💻' },
    tags: ['blockchain', 'development', 'audit'],
    engagement: { views: 156, interested: 9, comments: 4 },
    createdAt: '2026-01-06',
    status: 'active',
    details: { rate: 'Negotiable', availability: 'Part-time' }
  },
  {
    id: '4',
    type: 'resource',
    title: 'Community Tractor - Shared Use',
    description: 'John Deere compact tractor available for community land projects. Scheduling via app.',
    creator: { name: 'Farm Collective', avatar: '🚜' },
    tags: ['equipment', 'farming', 'shared'],
    engagement: { views: 98, interested: 15, comments: 6 },
    createdAt: '2026-01-05',
    status: 'active',
    details: { type: 'Equipment', location: 'Southeast Region', terms: 'Free for members' }
  },
  {
    id: '5',
    type: 'event',
    title: 'Steward Corps Quarterly Meetup',
    description: 'In-person networking event for Steward Corps members. Workshops on land acquisition strategies.',
    creator: { name: 'Steward Corps', avatar: '📚' },
    tags: ['networking', 'education', 'steward-corps'],
    engagement: { views: 312, interested: 45, comments: 22 },
    createdAt: '2026-01-04',
    status: 'active',
    details: { date: '2026-02-15', location: 'Atlanta, GA', capacity: 100 }
  }
];

export default function MarketplacePage() {
  const router = useRouter();
  const { walletState } = useWallet();
  const { preferences, getPersonalizedGreeting } = usePersonalization();
  
  const [items, setItems] = useState<MarketplaceItem[]>(SAMPLE_ITEMS);
  const [filters, setFilters] = useState<FilterOptions>({ type: 'all', sortBy: 'recent', tags: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMarketplaceItems();
  }, [filters]);

  const loadMarketplaceItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.sortBy) params.append('sort', filters.sortBy);
      
      const res = await fetch(`/api/marketplace?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items) setItems(data.items);
      }
    } catch (err) {
      console.log('Using sample data');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (filters.type !== 'all' && item.type !== filters.type) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(query) || 
             item.description.toLowerCase().includes(query) ||
             item.tags.some(tag => tag.toLowerCase().includes(query));
    }
    return true;
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      land: '#059669',
      susu: '#D97706',
      skill: '#7C3AED',
      resource: '#2563EB',
      event: '#DC2626'
    };
    return colors[type] || '#6B7280';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      land: '🌍',
      susu: '💰',
      skill: '🛠️',
      resource: '📦',
      event: '📅'
    };
    return icons[type] || '📋';
  };

  return (
    <>
      <Head>
        <title>Community Marketplace | Axiom</title>
        <meta name="description" content="Connect with community members, find opportunities, and collaborate" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                Community Marketplace
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px' }}>
                Connect with community members, find land opportunities, join savings circles, and share resources.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <input
                    type="text"
                    placeholder="Search opportunities, skills, resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      fontSize: '16px',
                      border: 'none',
                      borderRadius: '12px',
                      background: 'white',
                      color: '#1F2937'
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    padding: '14px 24px',
                    background: '#00A389',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>+</span> Post Listing
                </button>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              overflowX: 'auto',
              paddingBottom: '16px',
              marginBottom: '24px'
            }}>
              {ITEM_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setFilters(prev => ({ ...prev, type: type.id }))}
                  style={{
                    padding: '10px 20px',
                    background: filters.type === type.id ? '#1F2937' : 'white',
                    color: filters.type === type.id ? 'white' : '#374151',
                    border: '1px solid #E5E7EB',
                    borderRadius: '24px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                {filteredItems.length} listings found
              </p>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="engaged">Most Engaged</option>
              </select>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>⟳</div>
                <p style={{ color: '#6B7280' }}>Loading marketplace...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                background: 'white',
                borderRadius: '16px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
                  No listings found
                </h3>
                <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                  Try adjusting your filters or search query
                </p>
                <button
                  onClick={() => { setFilters({ type: 'all', sortBy: 'recent', tags: [] }); setSearchQuery(''); }}
                  style={{
                    padding: '12px 24px',
                    background: '#00A389',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {filteredItems.map(item => (
                  <MarketplaceCard 
                    key={item.id} 
                    item={item} 
                    getTypeColor={getTypeColor}
                    getTypeIcon={getTypeIcon}
                    onClick={() => router.push(`/marketplace/${item.id}`)}
                  />
                ))}
              </div>
            )}

            {preferences.interests.length > 0 && (
              <div style={{
                marginTop: '32px',
                padding: '24px',
                background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                borderRadius: '16px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#3730A3', marginBottom: '8px' }}>
                  💡 Personalized Recommendations
                </h3>
                <p style={{ fontSize: '14px', color: '#4338CA', marginBottom: '16px' }}>
                  Based on your interests, you might like these opportunities:
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {preferences.interests.includes('land') && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, type: 'land' }))}
                      style={{
                        padding: '8px 16px',
                        background: 'white',
                        border: '1px solid #C7D2FE',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      🌍 View Land Opportunities
                    </button>
                  )}
                  {preferences.interests.includes('susu') && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, type: 'susu' }))}
                      style={{
                        padding: '8px 16px',
                        background: 'white',
                        border: '1px solid #C7D2FE',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      💰 Find Savings Circles
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <CreateListingModal onClose={() => setShowCreateModal(false)} />
        )}
      </Layout>
    </>
  );
}

function MarketplaceCard({ 
  item, 
  getTypeColor, 
  getTypeIcon,
  onClick 
}: { 
  item: MarketplaceItem; 
  getTypeColor: (type: string) => string;
  getTypeIcon: (type: string) => string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: '1px solid #E5E7EB'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `${getTypeColor(item.type)}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {getTypeIcon(item.type)}
          </div>
          <div>
            <span style={{
              padding: '4px 10px',
              background: `${getTypeColor(item.type)}15`,
              color: getTypeColor(item.type),
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'capitalize'
            }}>
              {item.type}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6B7280' }}>
          <span>👁</span> {item.engagement.views}
        </div>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
        {item.title}
      </h3>
      <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px', lineHeight: 1.5 }}>
        {item.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {item.tags.map(tag => (
          <span
            key={tag}
            style={{
              padding: '4px 10px',
              background: '#F3F4F6',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#374151'
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingTop: '16px',
        borderTop: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>
            {item.creator.avatar || '👤'}
          </div>
          <span style={{ fontSize: '13px', color: '#374151' }}>{item.creator.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6B7280' }}>
          <span>❤️ {item.engagement.interested}</span>
          <span>💬 {item.engagement.comments}</span>
        </div>
      </div>
    </div>
  );
}

function CreateListingModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    type: 'land',
    title: '',
    description: '',
    tags: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });
      
      if (res.ok) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to create listing:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        zIndex: 9999
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937' }}>
            Create Listing
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Listing Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '16px'
              }}
            >
              <option value="land">Land Opportunity</option>
              <option value="susu">Savings Circle</option>
              <option value="skill">Skill / Service</option>
              <option value="resource">Resource Sharing</option>
              <option value="event">Event</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a descriptive title"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what you're offering or looking for..."
              required
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '16px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g., atlanta, farming, community"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                background: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: '14px',
                background: '#00A389',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer'
              }}
            >
              {submitting ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
