import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

type LandStage = 'discovery' | 'diligence' | 'acquisition' | 'tokenization' | 'stewardship' | 'development';

interface LandAsset {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  acreage: number;
  price: number;
  stage: LandStage;
  progress: number;
  tokenized: boolean;
  totalShares: number;
  availableShares: number;
  sharePrice: number;
  stewards: string[];
  metrics: { estimatedValue: number; appreciationRate: number; rentalIncome?: number; operatingCosts?: number; netYield?: number };
}

interface DiligenceChecklist {
  id: string;
  category: string;
  items: { id: string; name: string; description: string; required: boolean; completed: boolean }[];
}

export default function LandLifecyclePage() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<LandAsset[]>([]);
  const [checklists, setChecklists] = useState<DiligenceChecklist[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<LandAsset | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'diligence' | 'tokenization' | 'stewardship'>('pipeline');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/land/lifecycle');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAssets(data.assets || []);
          setChecklists(data.checklists || []);
          if (data.assets?.length > 0 && !selectedAsset) {
            setSelectedAsset(data.assets[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error loading land lifecycle data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: LandStage) => {
    const colors: Record<LandStage, string> = {
      discovery: '#8B5CF6',
      diligence: '#F59E0B',
      acquisition: '#3B82F6',
      tokenization: '#10B981',
      stewardship: '#059669',
      development: '#1F2937'
    };
    return colors[stage];
  };

  const stages: LandStage[] = ['discovery', 'diligence', 'acquisition', 'tokenization', 'stewardship', 'development'];

  return (
    <>
      <Head>
        <title>Land Asset Lifecycle | Axiom</title>
        <meta name="description" content="Manage land assets through the complete lifecycle" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                Land Asset Lifecycle
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px' }}>
                Track properties from discovery through development
              </p>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Total Assets</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{assets.length}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Total Acreage</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{assets.reduce((sum, a) => sum + a.acreage, 0).toFixed(1)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Total Value</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>${(assets.reduce((sum, a) => sum + a.metrics.estimatedValue, 0) / 1000000).toFixed(2)}M</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {(['pipeline', 'diligence', 'tokenization', 'stewardship'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab ? '#7C3AED' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
            ) : (
              <>
                {activeTab === 'pipeline' && (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', padding: '8px 0' }}>
                      {stages.map((stage, idx) => (
                        <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            padding: '8px 16px',
                            background: getStageColor(stage),
                            color: 'white',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            whiteSpace: 'nowrap'
                          }}>
                            {stage} ({assets.filter(a => a.stage === stage).length})
                          </div>
                          {idx < stages.length - 1 && <span style={{ margin: '0 8px', color: '#9CA3AF' }}>→</span>}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {assets.map(asset => (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedAsset(asset)}
                          style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            border: selectedAsset?.id === asset.id ? '2px solid #7C3AED' : '2px solid transparent'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0' }}>{asset.name}</h3>
                              <p style={{ color: '#6B7280', margin: 0, fontSize: '14px' }}>{asset.address}, {asset.city}, {asset.state}</p>
                            </div>
                            <div style={{
                              padding: '6px 12px',
                              background: `${getStageColor(asset.stage)}20`,
                              color: getStageColor(asset.stage),
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              textTransform: 'capitalize'
                            }}>
                              {asset.stage}
                            </div>
                          </div>

                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Progress</span>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>{asset.progress}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${asset.progress}%`, background: getStageColor(asset.stage), borderRadius: '4px' }} />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>Acreage</div>
                              <div style={{ fontSize: '16px', fontWeight: 600 }}>{asset.acreage} acres</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>Est. Value</div>
                              <div style={{ fontSize: '16px', fontWeight: 600 }}>${(asset.metrics.estimatedValue / 1000).toFixed(0)}K</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>Appreciation</div>
                              <div style={{ fontSize: '16px', fontWeight: 600, color: '#10B981' }}>+{asset.metrics.appreciationRate}%</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>Stewards</div>
                              <div style={{ fontSize: '16px', fontWeight: 600 }}>{asset.stewards.length}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'diligence' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {checklists.map(checklist => (
                      <div key={checklist.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{checklist.category}</h3>
                        {checklist.items.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #E5E7EB' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              border: `2px solid ${item.completed ? '#10B981' : '#D1D5DB'}`,
                              background: item.completed ? '#10B981' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px'
                            }}>
                              {item.completed && '✓'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500 }}>
                                {item.name}
                                {item.required && <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>{item.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'tokenization' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assets.filter(a => a.stage === 'tokenization' || a.tokenized).map(asset => (
                      <div key={asset.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{asset.name}</h3>
                          {asset.tokenized ? (
                            <span style={{ padding: '6px 12px', background: '#DCFCE7', color: '#166534', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                              Tokenized
                            </span>
                          ) : (
                            <span style={{ padding: '6px 12px', background: '#FEF3C7', color: '#92400E', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                              Pending
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Total Shares</div>
                            <div style={{ fontSize: '20px', fontWeight: 600 }}>{asset.totalShares.toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Available</div>
                            <div style={{ fontSize: '20px', fontWeight: 600 }}>{asset.availableShares.toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Share Price</div>
                            <div style={{ fontSize: '20px', fontWeight: 600 }}>${asset.sharePrice}</div>
                          </div>
                          <div>
                            <button style={{
                              width: '100%',
                              padding: '12px',
                              background: asset.tokenized ? '#7C3AED' : '#D1D5DB',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 600,
                              cursor: asset.tokenized ? 'pointer' : 'not-allowed'
                            }}>
                              {asset.tokenized ? 'Buy Shares' : 'Coming Soon'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'stewardship' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assets.filter(a => a.stage === 'stewardship' || a.stewards.length > 0).map(asset => (
                      <div key={asset.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{asset.name}</h3>
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Active Stewards</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {asset.stewards.length > 0 ? asset.stewards.map((steward, idx) => (
                              <span key={idx} style={{ padding: '6px 12px', background: '#F3E8FF', color: '#7C3AED', borderRadius: '20px', fontSize: '14px' }}>
                                {steward}
                              </span>
                            )) : (
                              <span style={{ color: '#9CA3AF' }}>No stewards assigned yet</span>
                            )}
                          </div>
                        </div>
                        {asset.metrics.netYield && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px', background: '#F9FAFB', borderRadius: '12px' }}>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>Rental Income</div>
                              <div style={{ fontSize: '18px', fontWeight: 600 }}>${asset.metrics.rentalIncome}/mo</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>Operating Costs</div>
                              <div style={{ fontSize: '18px', fontWeight: 600 }}>${asset.metrics.operatingCosts}/mo</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>Net Yield</div>
                              <div style={{ fontSize: '18px', fontWeight: 600, color: '#10B981' }}>{asset.metrics.netYield}%</div>
                            </div>
                          </div>
                        )}
                        <button style={{
                          marginTop: '16px',
                          padding: '12px 24px',
                          background: '#7C3AED',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}>
                          Apply to Become Steward
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
