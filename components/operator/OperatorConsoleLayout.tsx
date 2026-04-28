/**
 * OperatorConsoleLayout — thin wrapper around DesignLawLayout that injects the
 * PagerStatusPill into a compact operator-only sub-header on every
 * /operator/* page (Task #333).
 *
 * Use this layout on all authenticated operator pages instead of
 * DesignLawLayout directly. The login page is excluded because the operator
 * is not yet authenticated and the status endpoint would return 401.
 */

import React, { ReactNode } from 'react';
import { DesignLawLayout } from '../design-law/DesignLawLayout';
import { PagerStatusPill } from './PagerStatusPill';

interface OperatorConsoleLayoutProps {
  children: ReactNode;
}

export function OperatorConsoleLayout({ children }: OperatorConsoleLayoutProps) {
  return (
    <DesignLawLayout>
      <div
        className="flex items-center justify-end mb-4 -mt-2"
        data-testid="operator-console-header"
      >
        <PagerStatusPill />
      </div>
      {children}
    </DesignLawLayout>
  );
}
