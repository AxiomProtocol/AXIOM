import * as React from "react";

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white bg-gray-600",
        className
      )}
      {...props}
    />
  );
});

export { Badge };
