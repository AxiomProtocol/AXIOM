interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeading({ children, className = '' }: SectionHeadingProps) {
  return (
    <h2 className={`font-dl-serif text-xl text-dl-navy mb-4 border-b border-dl-border pb-2 ${className}`}>
      {children}
    </h2>
  );
}
