import * as React from "react";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within Tabs");
  }
  return context;
}

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultValue: string;
};

function Tabs({ defaultValue, children, className, ...props }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cx("inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1", className)}
      {...props}
    />
  );
});

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(function TabsTrigger(
  { className, value, ...props },
  ref
) {
  const { value: currentValue, setValue } = useTabsContext();
  const active = currentValue === value;

  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium",
        active ? "bg-white text-gray-900 shadow" : "text-gray-600 hover:text-gray-900",
        className
      )}
      onClick={() => setValue(value)}
      {...props}
    />
  );
});

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(function TabsContent(
  { className, value, ...props },
  ref
) {
  const { value: currentValue } = useTabsContext();
  if (currentValue !== value) return null;

  return <div ref={ref} className={className} {...props} />;
});

export { Tabs, TabsList, TabsTrigger, TabsContent };
