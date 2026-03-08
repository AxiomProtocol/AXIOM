import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-dl-navy text-white',
  secondary: 'bg-dl-border text-dl-navy',
  danger: 'bg-dl-error text-white',
};

interface SolidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function SolidButton({
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  ...props
}: SolidButtonProps) {
  const sizeClass = size === 'sm' ? 'px-3 py-2 text-xs min-h-[44px]' : 'px-6 py-2.5 text-sm min-h-[44px]';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${VARIANT_STYLES[variant]} ${sizeClass} ${disabledClass} ${className}`}
    />
  );
}
