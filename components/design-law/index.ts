// SSR-SAFE EXPORTS ONLY — do not add components that import wagmi, viem,
// Reown AppKit, or any other browser-only library. Those crash Vercel
// serverless functions. Add browser-only components as next/dynamic ssr:false
// at their usage site, or in a separate client-only barrel.

export { PageShell } from './PageShell';
export { DataTable } from './DataTable';
export type { Column } from './DataTable';
export { StatusBadge } from './StatusBadge';
export { PaginationControls } from './PaginationControls';
export { DisclosureBlock } from './DisclosureBlock';
export { AuditHeader } from './AuditHeader';
export { FormField, DLInput, DLTextarea, DLSelect } from './FormField';
export { SolidButton } from './SolidButton';
export { SectionHeading } from './SectionHeading';
export { DetailGrid } from './DetailGrid';
export { DesignLawLayout } from './DesignLawLayout';

// ConnectWalletButton and NexusBankingPanel are intentionally NOT exported here.
// Both import wagmi which is browser-only. Import them with next/dynamic ssr:false
// at each usage site.
