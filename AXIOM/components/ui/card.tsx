import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const Card = React.forwardRef<HTMLDivElement, DivProps>(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cx("rounded-lg border bg-white text-gray-900 shadow-sm", className)}
      {...props}
    />
  );
});

const CardHeader = React.forwardRef<HTMLDivElement, DivProps>(function CardHeader(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cx("flex flex-col space-y-1.5 p-6", className)} {...props} />;
});

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cx("text-2xl font-semibold leading-none tracking-tight", className)}
        {...props}
      />
    );
  }
);

const CardContent = React.forwardRef<HTMLDivElement, DivProps>(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cx("p-6 pt-0", className)} {...props} />;
});

export { Card, CardHeader, CardTitle, CardContent };
