import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "../../lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    variant?: "default" | "crossfader" | "volume"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const trackClasses = {
    default: "bg-secondary",
    crossfader: "bg-gradient-to-r from-emerald-500 via-neutral-500 to-blue-500",
    volume: "bg-secondary"
  }

  const rangeClasses = {
    default: "bg-primary",
    crossfader: "bg-transparent",
    volume: "bg-gradient-to-r from-emerald-500 to-emerald-400"
  }

  const thumbClasses = {
    default: "border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    crossfader: "border-4 border-neutral-800 bg-white shadow-2xl ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110",
    volume: "border-2 border-emerald-600 bg-white shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  }

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track 
        className={cn(
          "relative h-2 w-full grow overflow-hidden rounded-full",
          trackClasses[variant]
        )}
      >
        <SliderPrimitive.Range 
          className={cn(
            "absolute h-full",
            rangeClasses[variant]
          )} 
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb 
        className={cn(
          "block h-5 w-5 rounded-full",
          thumbClasses[variant]
        )} 
      />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
