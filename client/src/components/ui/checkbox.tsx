import * as React from "react"
import { forwardRef } from "react"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked
      onCheckedChange?.(checked)
      onChange?.(event)
    }

    return (
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded border border-input bg-background flex items-center justify-center",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
            props.checked && "bg-primary border-primary",
            props.disabled && "cursor-not-allowed opacity-50",
            className
          )}
          data-state={props.checked ? "checked" : "unchecked"}
        >
          {props.checked && (
            <Check className="h-3 w-3 text-primary-foreground" />
          )}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
