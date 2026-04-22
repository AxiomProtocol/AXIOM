import { ReactNode } from 'react';

interface DetailField {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

interface DetailGridProps {
  left: DetailField[];
  right: DetailField[];
}

export function DetailGrid({ left, right }: DetailGridProps) {
  const renderField = (f: DetailField) => (
    <div key={typeof f.label === 'string' ? f.label : ''} className="px-4 py-3 border-b border-dl-border">
      <p className="text-xs text-dl-gray mb-1">{f.label}</p>
      <p className={`text-sm ${f.mono !== false ? 'font-dl-mono' : 'text-dl-gray'}`}>{f.value ?? '—'}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border mb-8">
      <div className="border-r border-dl-border">
        {left.map(renderField)}
      </div>
      <div>
        {right.map(renderField)}
      </div>
    </div>
  );
}
