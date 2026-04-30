interface NexusBankingPanelProps {
  product?: string;
  context?: string;
  amountLabel?: string;
  title?: string;
  description?: string;
  collapsible?: boolean;
}

export function NexusBankingPanel({ title }: NexusBankingPanelProps) {
  return (
    <div className="border border-dl-border bg-dl-bg-alt px-6 py-5">
      <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">
        {title ?? 'Banking'}
      </p>
      <p className="text-sm text-dl-gray leading-relaxed">
        ACH/wire banking infrastructure is currently offline. No account registration or deposit actions are available at this time.
      </p>
    </div>
  );
}

export default NexusBankingPanel;
