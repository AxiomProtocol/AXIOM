import React, { useState } from 'react';
import { keygrowCopy } from './keygrowCopy';

const proofAssets = [
  { type: 'image', src: '/keygrow-proof/proof-01.jpg', alt: 'Farmland acquisition proof 1' },
  { type: 'image', src: '/keygrow-proof/proof-02.jpg', alt: 'Farmland development proof 2' },
  { type: 'image', src: '/keygrow-proof/proof-03.jpg', alt: 'Community coordination proof 3' },
  { type: 'image', src: '/keygrow-proof/proof-04.jpg', alt: 'Land development progress 4' },
  { type: 'image', src: '/keygrow-proof/proof-05.jpg', alt: 'Stewardship proof 5' },
  { type: 'video', src: '/keygrow-proof/proof-clip-01.mp4', poster: '/keygrow-proof/proof-clip-01-poster.jpg', alt: 'Development video clip' }
];

export function ProofStrip() {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  
  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set([...prev, index]));
  };
  
  const renderPlaceholder = (index: number, alt: string) => (
    <div
      style={{
        minWidth: 180,
        height: 120,
        background: 'linear-gradient(135deg, #d4a574 0%, #8b7355 100%)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 13,
        textAlign: 'center',
        padding: 12,
        flexShrink: 0
      }}
    >
      <span style={{ fontSize: 28, marginBottom: 4 }}>🌾</span>
      <span>{alt}</span>
    </div>
  );
  
  return (
    <div style={{
      background: 'rgba(0,0,0,0.03)',
      borderRadius: 16,
      padding: 24,
      marginTop: 32,
      marginBottom: 32
    }}>
      <div style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 16,
        WebkitOverflowScrolling: 'touch'
      }}>
        {proofAssets.map((asset, idx) => (
          imageErrors.has(idx) ? (
            <React.Fragment key={idx}>
              {renderPlaceholder(idx, asset.alt)}
            </React.Fragment>
          ) : (
            asset.type === 'video' ? (
              <div
                key={idx}
                style={{
                  minWidth: 220,
                  height: 120,
                  borderRadius: 12,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: '#000'
                }}
              >
                <video
                  poster={(asset as any).poster}
                  controls
                  onError={() => handleImageError(idx)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                >
                  <source src={asset.src} type="video/mp4" />
                </video>
              </div>
            ) : (
              <div
                key={idx}
                style={{
                  minWidth: 180,
                  height: 120,
                  borderRadius: 12,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, #d4a574 0%, #8b7355 100%)'
                }}
              >
                <img
                  src={asset.src}
                  alt={asset.alt}
                  onError={() => handleImageError(idx)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )
          )
        ))}
      </div>
      
      <p style={{
        margin: '12px 0 8px 0',
        fontSize: 14,
        fontWeight: 500,
        color: 'rgba(0,0,0,0.8)'
      }}>
        {keygrowCopy.proofStrip.caption}
      </p>
      
      <p style={{
        margin: 0,
        fontSize: 12,
        color: 'rgba(0,0,0,0.5)',
        fontStyle: 'italic'
      }}>
        {keygrowCopy.proofStrip.disclaimer}
      </p>
    </div>
  );
}
