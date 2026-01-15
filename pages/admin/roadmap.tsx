import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface Milestone {
  id: string;
  order: number;
  name: string;
  description: string;
  targetDate?: string;
  owner?: string;
  status: 'Planned' | 'InProgress' | 'Blocked' | 'Done';
}

interface Product {
  id: string;
  order: number;
  name: string;
  tagline: string;
  strategicValue: string;
  targetUsers: string;
  revenueModel: string;
  legalNotes: string;
  onchainModules: string;
  offchainModules: string;
  status: 'Draft' | 'Published';
  milestones: Milestone[];
}

interface Phase {
  id: string;
  order: number;
  name: string;
  summary: string;
  status: 'Draft' | 'Published';
  products: Product[];
}

interface Roadmap {
  version: string;
  updatedAt: string;
  phases: Phase[];
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function AdminRoadmapEditor() {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const urlToken = router.query.token as string;
    if (urlToken) {
      setToken(urlToken);
      fetchRoadmap(urlToken);
    } else {
      setLoading(false);
    }
  }, [router.query.token]);

  const fetchRoadmap = async (adminToken: string) => {
    try {
      const res = await fetch(`/api/roadmap?admin=true&token=${adminToken}`);
      const data = await res.json();
      if (data.success && data.isAdmin) {
        setRoadmap(data.roadmap);
      } else {
        setMessage({ type: 'error', text: 'Admin access denied. Check your token.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch roadmap data' });
    } finally {
      setLoading(false);
    }
  };

  const saveRoadmap = async () => {
    if (!roadmap) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/roadmap?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmap })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Roadmap saved successfully!' });
        setRoadmap({ ...roadmap, updatedAt: new Date().toISOString() });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save roadmap' });
    } finally {
      setSaving(false);
    }
  };

  const updatePhase = (phaseId: string, updates: Partial<Phase>) => {
    if (!roadmap) return;
    setRoadmap({
      ...roadmap,
      phases: roadmap.phases.map(p => p.id === phaseId ? { ...p, ...updates } : p)
    });
  };

  const updateProduct = (phaseId: string, productId: string, updates: Partial<Product>) => {
    if (!roadmap) return;
    setRoadmap({
      ...roadmap,
      phases: roadmap.phases.map(phase => 
        phase.id === phaseId 
          ? { ...phase, products: phase.products.map(p => p.id === productId ? { ...p, ...updates } : p) }
          : phase
      )
    });
  };

  const updateMilestone = (phaseId: string, productId: string, milestoneId: string, updates: Partial<Milestone>) => {
    if (!roadmap) return;
    setRoadmap({
      ...roadmap,
      phases: roadmap.phases.map(phase => 
        phase.id === phaseId 
          ? { 
              ...phase, 
              products: phase.products.map(product => 
                product.id === productId 
                  ? { ...product, milestones: product.milestones.map(m => m.id === milestoneId ? { ...m, ...updates } : m) }
                  : product
              ) 
            }
          : phase
      )
    });
  };

  const addPhase = () => {
    if (!roadmap) return;
    const newPhase: Phase = {
      id: `phase-${generateId()}`,
      order: roadmap.phases.length + 1,
      name: 'New Phase',
      summary: 'Phase description',
      status: 'Draft',
      products: []
    };
    setRoadmap({ ...roadmap, phases: [...roadmap.phases, newPhase] });
    setExpandedPhase(newPhase.id);
  };

  const removePhase = (phaseId: string) => {
    if (!roadmap || !confirm('Delete this phase and all its products?')) return;
    setRoadmap({
      ...roadmap,
      phases: roadmap.phases.filter(p => p.id !== phaseId).map((p, i) => ({ ...p, order: i + 1 }))
    });
  };

  const addProduct = (phaseId: string) => {
    if (!roadmap) return;
    const phase = roadmap.phases.find(p => p.id === phaseId);
    if (!phase) return;
    
    const newProduct: Product = {
      id: `product-${generateId()}`,
      order: phase.products.length + 1,
      name: 'New Product',
      tagline: 'Product tagline',
      strategicValue: '',
      targetUsers: '',
      revenueModel: '',
      legalNotes: '',
      onchainModules: '',
      offchainModules: '',
      status: 'Draft',
      milestones: []
    };
    
    updatePhase(phaseId, { products: [...phase.products, newProduct] });
    setExpandedProduct(newProduct.id);
  };

  const removeProduct = (phaseId: string, productId: string) => {
    if (!roadmap || !confirm('Delete this product?')) return;
    const phase = roadmap.phases.find(p => p.id === phaseId);
    if (!phase) return;
    updatePhase(phaseId, { 
      products: phase.products.filter(p => p.id !== productId).map((p, i) => ({ ...p, order: i + 1 }))
    });
  };

  const addMilestone = (phaseId: string, productId: string) => {
    if (!roadmap) return;
    const phase = roadmap.phases.find(p => p.id === phaseId);
    const product = phase?.products.find(p => p.id === productId);
    if (!product) return;

    const newMilestone: Milestone = {
      id: `m-${generateId()}`,
      order: product.milestones.length + 1,
      name: 'New Milestone',
      description: '',
      status: 'Planned'
    };
    
    updateProduct(phaseId, productId, { milestones: [...product.milestones, newMilestone] });
  };

  const removeMilestone = (phaseId: string, productId: string, milestoneId: string) => {
    if (!roadmap) return;
    const phase = roadmap.phases.find(p => p.id === phaseId);
    const product = phase?.products.find(p => p.id === productId);
    if (!product) return;

    updateProduct(phaseId, productId, { 
      milestones: product.milestones.filter(m => m.id !== milestoneId).map((m, i) => ({ ...m, order: i + 1 }))
    });
  };

  const movePhase = (phaseId: string, direction: 'up' | 'down') => {
    if (!roadmap) return;
    const index = roadmap.phases.findIndex(p => p.id === phaseId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === roadmap.phases.length - 1)) return;
    
    const newPhases = [...roadmap.phases];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newPhases[index], newPhases[swapIndex]] = [newPhases[swapIndex], newPhases[index]];
    newPhases.forEach((p, i) => p.order = i + 1);
    setRoadmap({ ...roadmap, phases: newPhases });
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase' as const
  };

  if (!token && !loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#ffffff', padding: 32, borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Admin Access Required</h1>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Add your admin token to the URL: ?token=YOUR_TOKEN</p>
          <p style={{ fontSize: 14, color: '#9ca3af' }}>Set ADMIN_EDIT_TOKEN in your environment variables.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ef4444' }}>Failed to load roadmap. Check your admin token.</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Roadmap Editor | Admin</title>
      </Head>

      <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <div style={{ 
          position: 'sticky', 
          top: 0, 
          background: '#ffffff', 
          borderBottom: '1px solid #e5e7eb', 
          padding: '16px 24px',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Roadmap Editor</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Last saved: {new Date(roadmap.updatedAt).toLocaleString()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {message && (
              <span style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                fontSize: 14,
                background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: message.type === 'success' ? '#065f46' : '#991b1b'
              }}>
                {message.text}
              </span>
            )}
            <a href="/roadmap" target="_blank" style={{ 
              padding: '10px 16px', 
              background: '#f3f4f6', 
              color: '#374151', 
              borderRadius: 6, 
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500
            }}>
              View Public Page
            </a>
            <button
              onClick={saveRoadmap}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: '#d4af37',
                color: '#111827',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>Phases ({roadmap.phases.length})</h2>
            <button
              onClick={addPhase}
              style={{
                padding: '8px 16px',
                background: '#111827',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              + Add Phase
            </button>
          </div>

          {roadmap.phases.map((phase, phaseIndex) => (
            <div key={phase.id} style={{ 
              background: '#ffffff', 
              borderRadius: 12, 
              border: '1px solid #e5e7eb',
              marginBottom: 16,
              overflow: 'hidden'
            }}>
              <div 
                style={{ 
                  padding: 16, 
                  background: expandedPhase === phase.id ? '#f9fafb' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    background: '#d4af37', 
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700
                  }}>
                    {phase.order}
                  </span>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{phase.name}</h3>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {phase.products.length} products • {phase.status}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); movePhase(phase.id, 'up'); }} disabled={phaseIndex === 0} style={{ padding: 6, background: '#f3f4f6', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: phaseIndex === 0 ? 0.3 : 1 }}>↑</button>
                  <button onClick={(e) => { e.stopPropagation(); movePhase(phase.id, 'down'); }} disabled={phaseIndex === roadmap.phases.length - 1} style={{ padding: 6, background: '#f3f4f6', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: phaseIndex === roadmap.phases.length - 1 ? 0.3 : 1 }}>↓</button>
                  <button onClick={(e) => { e.stopPropagation(); removePhase(phase.id); }} style={{ padding: 6, background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer' }}>×</button>
                </div>
              </div>

              {expandedPhase === phase.id && (
                <div style={{ padding: 16, borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Phase Name</label>
                      <input
                        value={phase.name}
                        onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select
                        value={phase.status}
                        onChange={(e) => updatePhase(phase.id, { status: e.target.value as 'Draft' | 'Published' })}
                        style={inputStyle}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Published">Published</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Summary</label>
                    <textarea
                      value={phase.summary}
                      onChange={(e) => updatePhase(phase.id, { summary: e.target.value })}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Products</h4>
                      <button
                        onClick={() => addProduct(phase.id)}
                        style={{ padding: '6px 12px', background: '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                      >
                        + Add Product
                      </button>
                    </div>

                    {phase.products.map((product) => (
                      <div key={product.id} style={{ 
                        background: '#f9fafb', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        marginBottom: 12
                      }}>
                        <div 
                          style={{ 
                            padding: 12, 
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                        >
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{product.name}</span>
                            <span style={{ 
                              marginLeft: 8,
                              padding: '2px 8px',
                              borderRadius: 9999,
                              fontSize: 11,
                              background: product.status === 'Published' ? '#d1fae5' : '#f3f4f6',
                              color: product.status === 'Published' ? '#065f46' : '#6b7280'
                            }}>
                              {product.status}
                            </span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeProduct(phase.id, product.id); }} style={{ padding: '4px 8px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Remove</button>
                        </div>

                        {expandedProduct === product.id && (
                          <div style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
                              <div>
                                <label style={labelStyle}>Product Name</label>
                                <input value={product.name} onChange={(e) => updateProduct(phase.id, product.id, { name: e.target.value })} style={inputStyle} />
                              </div>
                              <div>
                                <label style={labelStyle}>Status</label>
                                <select value={product.status} onChange={(e) => updateProduct(phase.id, product.id, { status: e.target.value as 'Draft' | 'Published' })} style={inputStyle}>
                                  <option value="Draft">Draft</option>
                                  <option value="Published">Published</option>
                                </select>
                              </div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <label style={labelStyle}>Tagline</label>
                              <input value={product.tagline} onChange={(e) => updateProduct(phase.id, product.id, { tagline: e.target.value })} style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <label style={labelStyle}>Strategic Value</label>
                              <textarea value={product.strategicValue} onChange={(e) => updateProduct(phase.id, product.id, { strategicValue: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
                              <div>
                                <label style={labelStyle}>Target Users</label>
                                <input value={product.targetUsers} onChange={(e) => updateProduct(phase.id, product.id, { targetUsers: e.target.value })} style={inputStyle} />
                              </div>
                              <div>
                                <label style={labelStyle}>Revenue Model</label>
                                <input value={product.revenueModel} onChange={(e) => updateProduct(phase.id, product.id, { revenueModel: e.target.value })} style={inputStyle} />
                              </div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <label style={labelStyle}>Legal Notes</label>
                              <textarea value={product.legalNotes} onChange={(e) => updateProduct(phase.id, product.id, { legalNotes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
                              <div>
                                <label style={labelStyle}>On-chain Modules</label>
                                <input value={product.onchainModules} onChange={(e) => updateProduct(phase.id, product.id, { onchainModules: e.target.value })} style={inputStyle} />
                              </div>
                              <div>
                                <label style={labelStyle}>Off-chain Modules</label>
                                <input value={product.offchainModules} onChange={(e) => updateProduct(phase.id, product.id, { offchainModules: e.target.value })} style={inputStyle} />
                              </div>
                            </div>

                            <div style={{ marginTop: 16 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={labelStyle}>Milestones</label>
                                <button onClick={() => addMilestone(phase.id, product.id)} style={{ padding: '4px 10px', background: '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>+ Add</button>
                              </div>
                              {product.milestones.map((milestone) => (
                                <div key={milestone.id} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 100px 100px auto', marginBottom: 8, alignItems: 'end' }}>
                                  <div>
                                    <input placeholder="Name" value={milestone.name} onChange={(e) => updateMilestone(phase.id, product.id, milestone.id, { name: e.target.value })} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }} />
                                  </div>
                                  <div>
                                    <input placeholder="Description" value={milestone.description} onChange={(e) => updateMilestone(phase.id, product.id, milestone.id, { description: e.target.value })} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }} />
                                  </div>
                                  <div>
                                    <input placeholder="Target" value={milestone.targetDate || ''} onChange={(e) => updateMilestone(phase.id, product.id, milestone.id, { targetDate: e.target.value })} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }} />
                                  </div>
                                  <div>
                                    <select value={milestone.status} onChange={(e) => updateMilestone(phase.id, product.id, milestone.id, { status: e.target.value as Milestone['status'] })} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }}>
                                      <option value="Planned">Planned</option>
                                      <option value="InProgress">In Progress</option>
                                      <option value="Blocked">Blocked</option>
                                      <option value="Done">Done</option>
                                    </select>
                                  </div>
                                  <button onClick={() => removeMilestone(phase.id, product.id, milestone.id)} style={{ padding: '6px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
