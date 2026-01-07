import React, { useState } from 'react';

interface PropertyPreview {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  acreage?: number;
  askingPrice?: number;
  propertyType?: string;
  images?: string[];
  sourceType?: string;
  sourceUrl?: string;
}

interface ListingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: PropertyPreview) => void;
}

const theme = {
  primary: "#00D4AA",
  secondary: "#7B68EE",
  dark: "#1a1a2e",
  muted: "#64748b",
  light: "#f8fafc",
  white: "#ffffff"
};

export function ListingImportModal({ isOpen, onClose, onImport }: ListingImportModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PropertyPreview | null>(null);
  const [error, setError] = useState('');

  const handlePreview = async () => {
    if (!url.trim()) {
      setError('Please enter a property listing URL');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const response = await fetch(`/api/land-acquisition/import-listing?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.success) {
        setPreview(data.data.preview);
      } else {
        setError(data.error || 'Failed to parse listing');
      }
    } catch (err) {
      setError('Failed to fetch listing. Please check the URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (preview) {
      console.log('Importing data:', preview);
      onImport(preview);
      onClose();
      setUrl('');
      setPreview(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: theme.white,
          borderRadius: 16,
          width: '90%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Import Property Listing</h2>
            <p style={{ fontSize: 14, color: theme.muted, margin: '4px 0 0' }}>
              Paste a URL from Zillow, Realtor, Redfin, or LandWatch
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: theme.muted
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Property Listing URL
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.zillow.com/homedetails/..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 15
                }}
              />
              <button
                onClick={handlePreview}
                disabled={loading}
                style={{
                  padding: '12px 20px',
                  background: loading ? '#ccc' : theme.secondary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Loading...' : 'Preview'}
              </button>
            </div>
            {error && (
              <p style={{ color: '#ef4444', fontSize: 14, marginTop: 8 }}>{error}</p>
            )}
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 20
          }}>
            {['Zillow', 'Realtor', 'Redfin', 'LandWatch', 'LoopNet'].map(site => (
              <span
                key={site}
                style={{
                  padding: '4px 12px',
                  background: '#f1f5f9',
                  borderRadius: 16,
                  fontSize: 12,
                  color: theme.muted
                }}
              >
                {site}
              </span>
            ))}
          </div>

          {preview && (
            <div
              style={{
                background: '#f0fdf4',
                borderRadius: 12,
                padding: 20,
                border: '2px solid ' + theme.primary
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: theme.primary }}>
                Data Extracted Successfully!
              </h3>

              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ 
                  padding: 16, 
                  background: '#fff', 
                  borderRadius: 8,
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Address</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: 16 }}>
                    {preview.address || 'Not found - you can enter manually'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 11, color: theme.muted, textTransform: 'uppercase' }}>City</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 500 }}>{preview.city || '-'}</p>
                  </div>
                  <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 11, color: theme.muted, textTransform: 'uppercase' }}>State</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 500 }}>{preview.state || '-'}</p>
                  </div>
                  <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 11, color: theme.muted, textTransform: 'uppercase' }}>Zip</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 500 }}>{preview.zipCode || '-'}</p>
                  </div>
                </div>

                {(preview.acreage || preview.askingPrice) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 11, color: theme.muted, textTransform: 'uppercase' }}>Acreage</span>
                      <p style={{ margin: '4px 0 0', fontWeight: 600, color: theme.primary, fontSize: 18 }}>
                        {preview.acreage ? `${preview.acreage} acres` : 'Not found'}
                      </p>
                    </div>
                    <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 11, color: theme.muted, textTransform: 'uppercase' }}>Price</span>
                      <p style={{ margin: '4px 0 0', fontWeight: 600, color: theme.secondary, fontSize: 18 }}>
                        {preview.askingPrice ? `$${preview.askingPrice.toLocaleString()}` : 'Not found'}
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ padding: 8, background: '#fff3cd', borderRadius: 6, fontSize: 13, color: '#856404' }}>
                  Note: Some details may not be available. You can edit the form after import.
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: theme.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 212, 170, 0.3)'
                  }}
                >
                  Import This Data to Form
                </button>
                <button
                  onClick={() => setPreview(null)}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '12px 24px',
                    background: 'none',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: theme.muted
                  }}
                >
                  Try a Different URL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
