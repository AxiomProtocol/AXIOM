import React from 'react';

export const colors = {
  primary: {
    gold: '#D4AF37',
    goldLight: '#E5C158',
    goldDark: '#B8960F',
  },
  neutral: {
    black: '#0A0A0A',
    charcoal: '#1F2937',
    gray: '#374151',
    grayLight: '#6B7280',
    grayLighter: '#9CA3AF',
    border: '#E5E7EB',
    background: '#F9FAFB',
    white: '#FFFFFF',
  },
  accent: {
    teal: '#0F766E',
    tealLight: '#14B8A6',
    purple: '#7C3AED',
    purpleLight: '#8B5CF6',
    blue: '#3B82F6',
    blueLight: '#60A5FA',
  },
  status: {
    success: '#10B981',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const borderRadius = {
  sm: '6px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
};

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default', 
  padding = 'lg',
  className,
  style 
}) => {
  const baseStyle: React.CSSProperties = {
    background: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing[padding],
  };

  const variants: Record<string, React.CSSProperties> = {
    default: {
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    },
    elevated: {
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    },
    outlined: {
      border: `1px solid ${colors.neutral.border}`,
      boxShadow: 'none',
    },
  };

  return (
    <div 
      className={className}
      style={{ ...baseStyle, ...variants[variant], ...style }}
    >
      {children}
    </div>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  style,
  fullWidth = false,
}) => {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '8px 16px', fontSize: '14px' },
    md: { padding: '12px 24px', fontSize: '16px' },
    lg: { padding: '16px 32px', fontSize: '18px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: colors.primary.gold,
      color: colors.neutral.black,
      border: 'none',
    },
    secondary: {
      background: colors.neutral.charcoal,
      color: colors.neutral.white,
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: colors.primary.gold,
      border: `2px solid ${colors.primary.gold}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.neutral.gray,
      border: 'none',
    },
  };

  const baseStyle: React.CSSProperties = {
    borderRadius: borderRadius.md,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : 'auto',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button style={baseStyle} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    success: { background: colors.status.successLight, color: '#166534' },
    warning: { background: colors.status.warningLight, color: '#92400E' },
    error: { background: colors.status.errorLight, color: '#991B1B' },
    info: { background: colors.status.infoLight, color: '#1E40AF' },
    neutral: { background: colors.neutral.background, color: colors.neutral.gray },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '2px 8px', fontSize: '11px' },
    md: { padding: '4px 12px', fontSize: '12px' },
  };

  return (
    <span
      style={{
        borderRadius: borderRadius.full,
        fontWeight: 600,
        display: 'inline-block',
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {children}
    </span>
  );
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: 'gold' | 'teal' | 'purple' | 'blue' | 'dark';
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  gradient = 'gold',
  children,
}) => {
  const gradients: Record<string, string> = {
    gold: `linear-gradient(135deg, ${colors.primary.goldDark} 0%, ${colors.primary.gold} 100%)`,
    teal: `linear-gradient(135deg, ${colors.accent.teal} 0%, ${colors.accent.tealLight} 100%)`,
    purple: `linear-gradient(135deg, ${colors.accent.purple} 0%, ${colors.accent.purpleLight} 100%)`,
    blue: `linear-gradient(135deg, #1E40AF 0%, ${colors.accent.blue} 100%)`,
    dark: `linear-gradient(135deg, ${colors.neutral.black} 0%, ${colors.neutral.charcoal} 100%)`,
  };

  return (
    <div
      style={{
        background: gradients[gradient],
        color: colors.neutral.white,
        padding: `${spacing.xxl} ${spacing.lg}`,
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: spacing.sm }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: spacing.lg }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  trend,
  icon,
}) => {
  const trendColors = {
    up: colors.status.success,
    down: colors.status.error,
    neutral: colors.neutral.grayLight,
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.15)',
        borderRadius: borderRadius.md,
        padding: `${spacing.md} ${spacing.lg}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        {icon && <span style={{ fontSize: '24px' }}>{icon}</span>}
        <div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>{label}</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{value}</div>
          {subValue && (
            <div
              style={{
                fontSize: '12px',
                color: trend ? trendColors[trend] : 'inherit',
              }}
            >
              {subValue}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills';
  color?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  color = colors.primary.gold,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: spacing.sm,
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: spacing.lg,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            borderRadius: borderRadius.md,
            border: 'none',
            background: activeTab === tab.id ? color : colors.neutral.white,
            color: activeTab === tab.id ? colors.neutral.white : colors.neutral.gray,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: activeTab === tab.id ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = colors.primary.gold,
  showLabel = false,
  size = 'md',
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const heights = { sm: '4px', md: '8px', lg: '12px' };

  return (
    <div>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: spacing.xs,
            fontSize: '12px',
            color: colors.neutral.grayLight,
          }}
        >
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        style={{
          height: heights[size],
          background: colors.neutral.border,
          borderRadius: borderRadius.full,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: color,
            borderRadius: borderRadius.full,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📋',
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: spacing.xxl,
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: spacing.md }}>{icon}</div>
      <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: spacing.sm }}>
        {title}
      </h3>
      {description && (
        <p style={{ color: colors.neutral.grayLight, marginBottom: spacing.lg }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

export default {
  colors,
  spacing,
  borderRadius,
  Card,
  Button,
  Badge,
  PageHeader,
  StatCard,
  Tabs,
  ProgressBar,
  EmptyState,
};
