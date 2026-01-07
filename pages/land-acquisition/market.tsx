import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Listing {
  id: number;
  sellerId: number;
  sellerWallet: string;
  campaignId: number;
  poolId: number;
  tokenType: string;
  sharesForSale: number;
  pricePerShare: string;
  totalPrice: string;
  minPurchase: number;
  status: string;
  expiresAt: string;
  campaignTitle: string;
  poolName: string;
  location: string;
  acreage: string;
  createdAt: string;
}

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  accent: '#7B68EE',
  dark: '#121212',
};

export default function SecondaryMarketPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'crowdfunding' | 'pool'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/land-acquisition/market/listings');
      const data = await res.json();
      if (data.success) {
        setListings(data.data.listings);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = parseFloat(String(value));
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const filteredListings = listings.filter(l => {
    if (filter === 'crowdfunding') return l.tokenType === 'crowdfunding';
    if (filter === 'pool') return l.tokenType === 'pool';
    return true;
  });

  return (
    <>
      <Head>
        <title>Secondary Market | Axiom Protocol</title>
        <meta name="description" content="Buy and sell land investment shares peer-to-peer" />
      </Head>

      <main style={{ background: '#FFFFFF', minHeight: '100vh', padding: '40px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <Link href="/land-acquisition" style={{ color: theme.primary, textDecoration: 'none' }}>
              Back to Land Acquisition
            </Link>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 16 }}>Secondary Market</h1>
            <p style={{ color: '#666' }}>Buy and sell land investment shares from other investors</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['all', 'crowdfunding', 'pool'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '10px 20px',
                    background: filter === f ? theme.primary : 'transparent',
                    color: filter === f ? '#fff' : theme.dark,
                    border: `1px solid ${filter === f ? theme.primary : '#ddd'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {f === 'all' ? 'All Listings' : f}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '12px 24px',
                background: theme.secondary,
                color: theme.dark,
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              List Your Shares
            </button>
          </div>

          <div style={{ 
            padding: 16, 
            background: '#fff3cd', 
            borderRadius: 8, 
            marginBottom: 24,
            fontSize: 14,
            color: '#856404',
          }}>
            Platform fee: 2.5% on all sales. All trades are subject to regulatory compliance.
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>Loading market listings...</div>
          ) : filteredListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#f8f9fa', borderRadius: 12 }}>
              <h3>No Active Listings</h3>
              <p style={{ color: '#666' }}>Be the first to list your shares for sale!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
              {filteredListings.map((listing) => (
                <div key={listing.id} style={{ 
                  padding: 24, 
                  background: '#f8f9fa', 
                  borderRadius: 12,
                  border: '1px solid #e9ecef',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{
                      padding: '4px 12px',
                      background: listing.tokenType === 'crowdfunding' ? '#cce5ff' : '#d4edda',
                      color: listing.tokenType === 'crowdfunding' ? '#004085' : '#155724',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                    }}>
                      {listing.tokenType}
                    </span>
                    <span style={{ fontSize: 12, color: '#666' }}>
                      Listed by {listing.sellerWallet}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 8px 0' }}>{listing.campaignTitle || listing.poolName}</h3>
                  <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                    {listing.location} - {listing.acreage} acres
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#666' }}>Shares Available</div>
                      <div style={{ fontWeight: 600, fontSize: 18 }}>{listing.sharesForSale}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#666' }}>Price per Share</div>
                      <div style={{ fontWeight: 600, fontSize: 18, color: theme.primary }}>{formatCurrency(listing.pricePerShare)}</div>
                    </div>
                  </div>

                  <div style={{ 
                    padding: 12, 
                    background: '#fff', 
                    borderRadius: 8, 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}>
                    <span style={{ fontSize: 14, color: '#666' }}>Total Price</span>
                    <span style={{ fontWeight: 700, fontSize: 20 }}>{formatCurrency(listing.totalPrice)}</span>
                  </div>

                  <button style={{
                    width: '100%',
                    padding: '14px',
                    background: theme.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 16,
                  }}>
                    Buy Shares
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
