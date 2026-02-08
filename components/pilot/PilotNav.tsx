import Link from 'next/link';

interface PilotNavProps {
  currentTab: string;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', href: '/pilot' },
  { id: 'investors', label: 'Investors', href: '/pilot/investors' },
  { id: 'distributions', label: 'Distributions', href: '/pilot/distributions' },
  { id: 'reports', label: 'Reports', href: '/pilot/reports' },
  { id: 'documents', label: 'Documents', href: '/pilot/documents' },
  { id: 'projections', label: 'Projections', href: '/pilot/projections' },
  { id: 'performance', label: 'Performance', href: '/pilot/performance' },
  { id: 'audit', label: 'Audit', href: '/pilot/audit' },
];

export default function PilotNav({ currentTab }: PilotNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 mb-8 border-b border-gray-200">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
            currentTab === tab.id
              ? 'bg-teal-50 text-teal-700 border border-teal-200 border-b-white -mb-px'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
