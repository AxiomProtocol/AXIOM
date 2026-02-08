import React, { useState, useEffect } from 'react';

interface CalculatorProps {
  parcelPrice?: number;
  parcelName?: string;
  onInvestClick?: (amount: number, plan: string) => void;
}

const PLANS = [
  { id: 'weekly', label: '$25/week', amount: 25, period: 'week', yearlyTotal: 1300 },
  { id: 'monthly', label: '$100/month', amount: 100, period: 'month', yearlyTotal: 1200 },
  { id: 'annual', label: '$1,200/year', amount: 1200, period: 'year', yearlyTotal: 1200, savings: 'Save $100' },
];

export default function InvestmentCalculator({ 
  parcelPrice = 360000, 
  parcelName = 'Heritage Meadows',
  onInvestClick 
}: CalculatorProps) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [customAmount, setCustomAmount] = useState(100);
  const [years, setYears] = useState(5);

  const currentPlan = PLANS.find(p => p.id === selectedPlan) || PLANS[1];
  const yearlyInvestment = currentPlan.yearlyTotal;
  
  const projections = [1, 3, 5, 10].map(yr => {
    const totalInvested = yearlyInvestment * yr;
    const ownership = (totalInvested / parcelPrice) * 100;
    const acresEquivalent = (totalInvested / parcelPrice) * 120;
    return { years: yr, invested: totalInvested, ownership, acres: acresEquivalent };
  });

  const selectedProjection = projections.find(p => p.years === years) || projections[2];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef9e7 0%, #fff8e1 100%)',
      borderRadius: 20,
      padding: 32,
      border: '2px solid #d4af37',
      maxWidth: 500,
      margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Own Land for Just $100/Month
        </h3>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          See how your investment grows over time
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {PLANS.map(plan => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            style={{
              flex: 1,
              padding: '12px 8px',
              borderRadius: 12,
              border: selectedPlan === plan.id ? '2px solid #d4af37' : '2px solid #e5e7eb',
              background: selectedPlan === plan.id ? '#d4af37' : '#ffffff',
              color: selectedPlan === plan.id ? '#111827' : '#374151',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
          >
            {plan.label}
            {plan.savings && (
              <span style={{
                position: 'absolute',
                top: -8,
                right: -8,
                background: '#10b981',
                color: '#ffffff',
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 8,
                fontWeight: 700
              }}>
                {plan.savings}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          Investment Timeline
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 3, 5, 10].map(yr => (
            <button
              key={yr}
              onClick={() => setYears(yr)}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: 8,
                border: years === yr ? '2px solid #111827' : '2px solid #e5e7eb',
                background: years === yr ? '#111827' : '#ffffff',
                color: years === yr ? '#ffffff' : '#374151',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              {yr} {yr === 1 ? 'Year' : 'Years'}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: '#111827',
        borderRadius: 16,
        padding: 24,
        color: '#ffffff',
        marginBottom: 24
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>YOUR FUTURE OWNERSHIP</p>
          <p style={{ fontSize: 48, fontWeight: 700, color: '#d4af37' }}>
            {selectedProjection.ownership.toFixed(2)}%
          </p>
          <p style={{ fontSize: 14, color: '#9ca3af' }}>
            of {parcelName}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>TOTAL INVESTED</p>
            <p style={{ fontSize: 20, fontWeight: 700 }}>${selectedProjection.invested.toLocaleString()}</p>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>EQUIVALENT TO</p>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{selectedProjection.acres.toFixed(1)} acres</p>
          </div>
        </div>
      </div>

      <div style={{ 
        background: '#f0fdf4', 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 24,
        border: '1px solid #86efac'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <svg style={{ width: 20, height: 20, color: '#10b981' }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span style={{ fontWeight: 600, color: '#065f46', fontSize: 14 }}>Open to All Americans</span>
        </div>
        <p style={{ fontSize: 12, color: '#047857' }}>
          SEC Reg CF compliant. No accredited investor status required.
        </p>
      </div>

      <button
        onClick={() => onInvestClick?.(currentPlan.amount, currentPlan.id)}
        style={{
          width: '100%',
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
          color: '#111827',
          borderRadius: 12,
          border: 'none',
          fontSize: 18,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: '0 4px 14px rgba(212, 175, 55, 0.4)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Start My {currentPlan.label} Journey
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
        Cancel anytime. Your ownership tokens are yours forever.
      </p>
    </div>
  );
}
