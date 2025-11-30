import * as React from "react"
import { useState, useCallback, useContext, createContext, forwardRef } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

// Select Context
interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  placeholder?: string
}

const SelectContext = createContext<SelectContextValue | undefined>(undefined)

const useSelect = () => {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error("useSelect must be used within a Select provider")
  }
  return context
}

// Select Root Component
interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  defaultValue?: string
}

const Select = ({ value, onValueChange, children, defaultValue }: SelectProps) => {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  
  const currentValue = value ?? internalValue
  
  const handleValueChange = useCallback((newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue)
    } else {
      setInternalValue(newValue)
    }
    setOpen(false)
  }, [onValueChange])

  return (
    <SelectContext.Provider 
      value={{ 
        value: currentValue, 
        onValueChange: handleValueChange, 
        open, 
        onOpenChange: setOpen 
      }}
    >
      {children}
    </SelectContext.Provider>
  )
}

// Select Trigger
export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, onOpenChange } = useSelect()
    
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => onOpenChange(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

// Select Value
export interface SelectValueProps {
  placeholder?: string
  className?: string
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder, className }) => {
  const { value } = useSelect()
  
  return (
    <span className={cn("truncate", className)}>
      {value || placeholder}
    </span>
  )
}

// Select Content
export interface SelectContentProps {
  className?: string
  children: React.ReactNode
}

const SelectContent: React.FC<SelectContentProps> = ({ className, children }) => {
  const { open } = useSelect()
  
  if (!open) return null
  
  return (
    <div className={cn(
      "absolute z-50 w-full min-w-[8rem] overflow-hidden rounded-md border border-input bg-background text-foreground shadow-md animate-in fade-in-0 zoom-in-95",
      "mt-1",
      className
    )}>
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}

// Select Item
export interface SelectItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

const SelectItem: React.FC<SelectItemProps> = ({ value, className, children }) => {
  const { onValueChange, value: selectedValue } = useSelect()
  
  return (
    <div
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        selectedValue === value && "bg-accent text-accent-foreground",
        className
      )}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </div>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
