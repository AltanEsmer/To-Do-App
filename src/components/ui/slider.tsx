import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  onValueChange?: (value: number[]) => void
  value?: number[]
  max?: number
  min?: number
  step?: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const val = value && value[0] !== undefined ? value[0] : 0
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onValueChange) {
        onValueChange([parseFloat(e.target.value)])
      }
    }

    // Calculate percentage for background gradient
    const percentage = ((val - min) * 100) / (max - min)

    return (
      <div className="relative flex w-full touch-none select-none items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={handleChange}
          ref={ref}
          className={cn(
            "h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          style={{
            background: `linear-gradient(to right, currentColor ${percentage}%, transparent ${percentage}%)`
          }}
          {...props}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 1.25rem;
            width: 1.25rem;
            border-radius: 9999px;
            border: 2px solid currentColor;
            background-color: white; /* bg-background */
            margin-top: 0; /* Align thumb center if track height varies */
            cursor: pointer;
            transition: transform 0.1s;
          }
          input[type=range]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
          /* Dark mode adaptation if needed, but 'currentColor' usually handles primary text color. 
             Ideally we want the track to be 'secondary' (gray) and the fill to be 'primary'.
             The inline style above sets the fill using currentColor.
             We need to ensure the parent sets the text color to 'primary' or we hardcode it.
          */
        `}</style>
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
