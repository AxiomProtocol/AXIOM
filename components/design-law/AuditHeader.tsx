interface AuditField {
  label: string;
  value: string;
  breakAll?: boolean;
}

interface AuditHeaderProps {
  fields: AuditField[];
  status?: { label: string; value: string };
}

export function AuditHeader({ fields, status }: AuditHeaderProps) {
  return (
    <div className="border border-dl-border mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {fields.map((f) => (
          <div key={f.label} className="px-4 py-3 border-b border-r border-dl-border">
            <p className="text-xs text-dl-gray mb-1">{f.label}</p>
            <p className={`font-dl-mono text-xs text-dl-navy ${f.breakAll ? 'break-all' : ''}`}>
              {f.value || '—'}
            </p>
          </div>
        ))}
      </div>
      {status && (
        <div className="px-4 py-3">
          <p className="text-xs text-dl-gray mb-1">{status.label}</p>
          <p className="text-sm font-medium">{status.value}</p>
        </div>
      )}
    </div>
  );
}
