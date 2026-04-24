import * as React from "react"
import { useState, forwardRef } from "react"
import { cn } from "../../lib/utils"

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  value?: number[]
  onValueChange?: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  orientation?: "horizontal" | "vertical"
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, max = 100, min = 0, step = 1, orientation = "horizontal", ...props }, ref) => {
    const [internalValue, setInternalValue] = useState([min])
    
    const currentValue = value ?? internalValue
    const sliderValue = currentValue[0] ?? min
    
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [parseFloat(event.target.value)]
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={handleChange}
          className={cn(
            "relative h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary outline-none",
            "before:absolute before:left-0 before:top-0 before:h-2 before:rounded-full before:bg-primary before:transition-all",
            "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary"
          )}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((sliderValue - min) / (max - min)) * 100}%, hsl(var(--secondary)) ${((sliderValue - min) / (max - min)) * 100}%, hsl(var(--secondary)) 100%)`
          }}
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
