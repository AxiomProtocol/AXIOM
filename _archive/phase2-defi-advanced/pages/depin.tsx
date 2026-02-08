import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';

interface IoTDevice {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number; address?: string };
  landAssetId?: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  metadata: Record<string, any>;
}

interface AssetOracle {
  id: string;
  name: string;
  type: string;
  source: string;
  lastUpdate: string;
  value: number;
  unit: string;
  confidence: number;
}

interface CrossChainSettlement {
  id: string;
  sourceChain: string;
  destinationChain: string;
  asset: string;
  amount: number;
  status: string;
  sourceTxHash?: string;
  destTxHash?: string;
  initiatedAt: string;
  fee: number;
}

export default function DePINPage() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [oracles, setOracles] = useState<AssetOracle[]>([]);
  const [settlements, setSettlements] = useState<CrossChainSettlement[]>([]);
  const [activeTab, setActiveTab] = useState<'devices' | 'oracles' | 'settlements'>('devices');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, oraclesRes, settlementsRes] = await Promise.all([
        fetch('/api/depin/devices'),
        fetch('/api/depin/oracles'),
        fetch('/api/depin/oracles?settlements=true')
      ]);

      if (devicesRes.ok) {
        const data = await devicesRes.json();
        if (data.success) setDevices(data.devices || []);
      }

      if (oraclesRes.ok) {
        const data = await oraclesRes.json();
        if (data.success) setOracles(data.oracles || []);
      }

      if (settlementsRes.ok) {
        const data = await settlementsRes.json();
        if (data.success) setSettlements(data.settlements || []);
      }
    } catch (err) {
      console.error('Error loading DePIN data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      online: '#10B981',
      offline: '#EF4444',
      maintenance: '#F59E0B',
      pending: '#3B82F6',
      confirming: '#F59E0B',
      completed: '#10B981',
      failed: '#EF4444'
    };
    return colors[status] || '#6B7280';
  };

  const getDeviceIcon = (type: string) => {
    const icons: Record<string, string> = {
      sensor: '📡',
      meter: '⚡',
      camera: '📹',
      controller: '🎛️',
      gateway: '🌐'
    };
    return icons[type] || '📟';
  };

  const getOracleIcon = (type: string) => {
    const icons: Record<string, string> = {
      price: '💰',
      weather: '🌤️',
      property_value: '🏠',
      energy: '⚡',
      carbon: '🌱'
    };
    return icons[type] || '📊';
  };

  const onlineDevices = devices.filter(d => d.status === 'online').length;

  return (
    <>
      <Head>
        <title>DePIN & Oracles | Axiom</title>
        <meta name="description" content="IoT devices, asset oracles, and cross-chain settlements" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                DePIN & Asset Oracles
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px' }}>
                IoT infrastructure, real-time data feeds, and cross-chain settlements
              </p>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>IoT Devices</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{onlineDevices}/{devices.length}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Active Oracles</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{oracles.length}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Settlements</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{settlements.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
              {(['devices', 'oracles', 'settlements'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab ? '#0F766E' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'devices' ? 'IoT Devices' : tab === 'oracles' ? 'Asset Oracles' : 'Cross-Chain'}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
            ) : (
              <>
                {activeTab === 'devices' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {devices.map(device => (
                      <div key={device.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '32px' }}>{getDeviceIcon(device.type)}</div>
                            <div>
                              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{device.name}</h3>
                              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'capitalize' }}>{device.type}</span>
                            </div>
                          </div>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: getStatusColor(device.status)
                          }} />
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                          {device.location.address || `${device.location.lat.toFixed(4)}, ${device.location.lng.toFixed(4)}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          Last seen: {new Date(device.lastSeen).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'oracles' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {oracles.map(oracle => (
                      <div key={oracle.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '32px' }}>{getOracleIcon(oracle.type)}</div>
                            <div>
                              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{oracle.name}</h3>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Source: {oracle.source}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700 }}>
                              {oracle.type === 'price' || oracle.type === 'property_value' || oracle.type === 'energy' || oracle.type === 'carbon' 
                                ? `$${oracle.value.toLocaleString()}`
                                : `${oracle.value}${oracle.unit}`
                              }
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>
                              {oracle.confidence}% confidence
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#9CA3AF' }}>
                          Last updated: {new Date(oracle.lastUpdate).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'settlements' && (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Cross-Chain Settlements</h3>
                    {settlements.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {settlements.map(settlement => (
                          <div key={settlement.id} style={{ padding: '16px', background: '#F9FAFB', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600 }}>{settlement.sourceChain}</span>
                                <span style={{ color: '#6B7280' }}>→</span>
                                <span style={{ fontWeight: 600 }}>{settlement.destinationChain}</span>
                              </div>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: `${getStatusColor(settlement.status)}20`,
                                color: getStatusColor(settlement.status),
                                fontSize: '12px',
                                fontWeight: 600,
                                textTransform: 'capitalize'
                              }}>
                                {settlement.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                              <span>{settlement.amount.toLocaleString()} {settlement.asset}</span>
                              <span style={{ color: '#6B7280' }}>Fee: {settlement.fee.toFixed(4)} {settlement.asset}</span>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#9CA3AF' }}>
                              {new Date(settlement.initiatedAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
                        <p>No cross-chain settlements yet</p>
                        <button style={{
                          marginTop: '16px',
                          padding: '12px 24px',
                          background: '#0F766E',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}>
                          Initiate Settlement
                        </button>
                      </div>
                    )}
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
