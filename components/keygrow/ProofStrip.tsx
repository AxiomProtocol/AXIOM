import React from 'react';
import { keygrowCopy } from './keygrowCopy';

const placeholderImages = [
  { id: 1, alt: 'Land development phase 1' },
  { id: 2, alt: 'Community coordination meeting' },
  { id: 3, alt: 'Agricultural infrastructure' },
  { id: 4, alt: 'Development progress' }
];

export function ProofStrip() {
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
        {placeholderImages.map((img) => (
          <div
            key={img.id}
            style={{
              minWidth: 180,
              height: 120,
              background: 'linear-gradient(135deg, #d4a574 0%, #8b7355 100%)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 13,
              textAlign: 'center',
              padding: 12,
              flexShrink: 0
            }}
          >
            {img.alt}
          </div>
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
