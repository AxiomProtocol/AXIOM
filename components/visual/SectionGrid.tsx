import React, { ReactNode } from 'react';

/**
 * SectionGrid — responsive 1/2/3/4-column grid. Mobile-first; collapses to a
 * single column on small screens and expands progressively.
 */

export interface SectionGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

const COL_CLASS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const GAP_CLASS = { sm: 'gap-3', md: 'gap-4 sm:gap-5', lg: 'gap-5 sm:gap-6' } as const;

export function SectionGrid({ children, cols = 3, gap = 'md' }: SectionGridProps) {
  return (
    <div className={`grid ${COL_CLASS[cols]} ${GAP_CLASS[gap]}`}>
      {children}
    </div>
  );
}
