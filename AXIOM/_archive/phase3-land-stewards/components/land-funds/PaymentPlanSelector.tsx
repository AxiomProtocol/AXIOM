import React from 'react';

interface Plan {
  id: string;
  label: string;
  amount: number;
  period: string;
  yearlyTotal: number;
  description: string;
  popular?: boolean;
  savings?: string;
}

interface PaymentPlanSelectorProps {
  selectedPlan: string;
  onPlanSelect: (planId: string) => void;
  variant?: 'cards' | 'compact';
}

const PLANS: Plan[] = [
  {
    id: 'weekly',
    label: '$25/week',
    amount: 25,
    period: 'week',
    yearlyTotal: 1300,
    description: 'Perfect for building the habit'
  },
  {
    id: 'monthly',
    label: '$100/month',
    amount: 100,
    period: 'month',
    yearlyTotal: 1200,
    description: 'Most popular choice',
    popular: true
  },
  {
    id: 'annual',
    label: '$1,200/year',
    amount: 1200,
    period: 'year',
    yearlyTotal: 1200,
    description: 'Best value - save $100',
    savings: 'Save $100'
  }
];

export default function PaymentPlanSelector({ 
  selectedPlan, 
  onPlanSelect,
  variant = 'cards'
}: PaymentPlanSelectorProps) {
  if (variant === 'compact') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {PLANS.map(plan => (
          <button
            key={plan.id}
            onClick={() => onPlanSelect(plan.id)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: selectedPlan === plan.id ? '2px solid #d4af37' : '2px solid #e5e7eb',
              background: selectedPlan === plan.id ? 'linear-gradient(135deg, #fef9e7 0%, #fff8e1 100%)' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
          >
            <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{plan.label}</p>
            {plan.popular && (
              <span style={{
                position: 'absolute',
                top: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#d4af37',
                color: '#111827',
                fontSize: 9,
                padding: '2px 8px',
                borderRadius: 8,
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}>
                MOST POPULAR
              </span>
            )}
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
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {PLANS.map(plan => (
        <button
          key={plan.id}
          onClick={() => onPlanSelect(plan.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            borderRadius: 16,
            border: selectedPlan === plan.id ? '3px solid #d4af37' : '2px solid #e5e7eb',
            background: selectedPlan === plan.id ? 'linear-gradient(135deg, #fef9e7 0%, #fff8e1 100%)' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: selectedPlan === plan.id ? '8px solid #d4af37' : '2px solid #d1d5db',
              background: '#ffffff'
            }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#111827', marginBottom: 4 }}>
                {plan.label}
              </p>
              <p style={{ fontSize: 14, color: '#6b7280' }}>
                {plan.description}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              ${plan.yearlyTotal.toLocaleString()}/year
            </p>
          </div>

          {plan.popular && (
            <span style={{
              position: 'absolute',
              top: -12,
              left: 20,
              background: '#d4af37',
              color: '#111827',
              fontSize: 11,
              padding: '4px 12px',
              borderRadius: 8,
              fontWeight: 700
            }}>
              MOST POPULAR
            </span>
          )}

          {plan.savings && (
            <span style={{
              position: 'absolute',
              top: -12,
              right: 20,
              background: '#10b981',
              color: '#ffffff',
              fontSize: 11,
              padding: '4px 12px',
              borderRadius: 8,
              fontWeight: 700
            }}>
              {plan.savings}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
