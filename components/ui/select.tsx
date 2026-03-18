import * as React from "react";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within Select");
  }
  return context;
}

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type SelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
};

function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const SelectTrigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  function SelectTrigger({ className, children, ...props }, ref) {
    const { open, setOpen } = useSelectContext();

    return (
      <button
        ref={ref}
        type="button"
        className={cx(
          "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
          className
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

type ValueProps = {
  placeholder?: string;
};

function SelectValue({ placeholder }: ValueProps) {
  const { value } = useSelectContext();
  return <span className="truncate">{value || placeholder || "Select..."}</span>;
}

type ContentProps = React.HTMLAttributes<HTMLDivElement>;

const SelectContent = React.forwardRef<HTMLDivElement, ContentProps>(function SelectContent(
  { className, children, ...props },
  ref
) {
  const { open } = useSelectContext();
  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cx(
        "absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

type ItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

const SelectItem = React.forwardRef<HTMLButtonElement, ItemProps>(function SelectItem(
  { className, value, children, ...props },
  ref
) {
  const { onValueChange, setOpen } = useSelectContext();

  return (
    <button
      ref={ref}
      type="button"
      className={cx("flex w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100", className)}
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
});

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
