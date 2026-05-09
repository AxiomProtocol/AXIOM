interface SectionHeadingProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function SectionHeading({ children, className = '', title, subtitle }: SectionHeadingProps) {
  if (subtitle) {
    return (
      <div className={`mb-4 border-b border-dl-border pb-2 ${className}`}>
        <h2 className="font-dl-serif text-xl text-dl-navy">{children ?? title}</h2>
        <p className="font-dl-mono text-xs text-dl-gray mt-1 leading-relaxed">{subtitle}</p>
      </div>
    );
  }
  return (
    <h2 className={`font-dl-serif text-xl text-dl-navy mb-4 border-b border-dl-border pb-2 ${className}`}>
      {children ?? title}
    </h2>
  );
}
