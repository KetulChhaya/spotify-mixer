import React, { useState, useRef, useCallback } from 'react'
import { Music } from 'lucide-react'
import { cn } from '../lib/utils'

interface VinylRecordProps {
  albumArt?: string
  isPlaying: boolean
  deckColor: 'emerald' | 'blue'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onScrub?: (direction: 'forward' | 'backward', intensity: number) => void
  disabled?: boolean
}

export const VinylRecord: React.FC<VinylRecordProps> = ({
  albumArt,
  isPlaying,
  deckColor,
  size = 'md',
  className,
  onScrub,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [lastAngle, setLastAngle] = useState(0)
  const vinylRef = useRef<HTMLDivElement>(null)

  const getAngleFromEvent = useCallback((event: MouseEvent | React.MouseEvent) => {
    if (!vinylRef.current) return 0
    
    const rect = vinylRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = event.clientX - centerX
    const deltaY = event.clientY - centerY
    
    return Math.atan2(deltaY, deltaX)
  }, [])

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled || !onScrub) return
    
    event.preventDefault()
    setIsDragging(true)
    setLastAngle(getAngleFromEvent(event))
  }, [disabled, onScrub, getAngleFromEvent])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || disabled || !onScrub) return
    
    const currentAngle = getAngleFromEvent(event)
    let angleDiff = currentAngle - lastAngle
    
    // Handle angle wrap-around
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
    
    const direction = angleDiff > 0 ? 'forward' : 'backward'
    const intensity = Math.min(Math.abs(angleDiff) * 10, 1) // Scale and clamp intensity
    
    if (intensity > 0.1) { // Only trigger for significant movement
      onScrub(direction, intensity)
    }
    
    setLastAngle(currentAngle)
  }, [isDragging, disabled, onScrub, getAngleFromEvent, lastAngle])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Set up global mouse events for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-56 h-56'
  }

  const labelSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }

  const centerSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Outer Ring - Vinyl Record */}
      <div 
        ref={vinylRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute inset-0 rounded-full border-4 border-white/10 shadow-2xl transition-all duration-300",
          isPlaying && !isDragging && "animate-vinyl",
          isDragging && "scale-105 shadow-3xl",
          onScrub && !disabled && "cursor-grab active:cursor-grabbing",
          disabled && "cursor-not-allowed opacity-50",
          "bg-gradient-to-br from-gray-900 via-gray-800 to-black select-none"
        )}
        style={{
          background: albumArt 
            ? `conic-gradient(from 0deg at center, rgba(0,0,0,0.7) 0deg, rgba(0,0,0,0.5) 60deg, rgba(0,0,0,0.7) 120deg, rgba(0,0,0,0.5) 180deg, rgba(0,0,0,0.7) 240deg, rgba(0,0,0,0.5) 300deg, rgba(0,0,0,0.7) 360deg)`
            : undefined
        }}
      >
        {/* Vinyl Grooves */}
        <div className="absolute inset-2 rounded-full border border-white/5" />
        <div className="absolute inset-4 rounded-full border border-white/5" />
        <div className="absolute inset-6 rounded-full border border-white/5" />
        
        {/* Album Art Area */}
        <div className={cn("absolute inset-6 rounded-full overflow-hidden bg-gray-900 border border-white/10")}>
          {albumArt ? (
            <img 
              src={albumArt} 
              alt="Album artwork"
              className="w-full h-full object-cover"
              style={{
                filter: 'brightness(0.9) contrast(1.1)'
              }}
            />
          ) : (
            <div className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center",
              deckColor === 'emerald' 
                ? "from-emerald-900/50 to-emerald-800/50" 
                : "from-blue-900/50 to-blue-800/50"
            )}>
              <Music className={cn(
                "text-white/40",
                size === 'sm' ? "w-6 h-6" : size === 'md' ? "w-12 h-12" : "w-16 h-16"
              )} />
            </div>
          )}
        </div>

        {/* Center Label */}
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg flex items-center justify-center",
          labelSizeClasses[size],
          deckColor === 'emerald' 
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400/50" 
            : "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400/50"
        )}>
          {/* Center Hole */}
          <div className={cn(
            "rounded-full bg-black border border-white/20",
            centerSizeClasses[size]
          )} />
        </div>

        {/* Shine Effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full opacity-20 transition-opacity duration-500",
            isPlaying && "opacity-30"
          )}
          style={{
            background: `conic-gradient(from 0deg at center, 
              transparent 0deg, 
              rgba(255,255,255,0.1) 30deg, 
              transparent 60deg,
              transparent 300deg,
              rgba(255,255,255,0.1) 330deg,
              transparent 360deg
            )`
          }}
        />
      </div>

      {/* Playing Status Indicator */}
      {isPlaying && (
        <div className={cn(
          "absolute -top-2 -right-2 w-4 h-4 rounded-full animate-pulse shadow-lg",
          deckColor === 'emerald' ? "bg-emerald-400" : "bg-blue-400"
        )}>
          <div className={cn(
            "absolute inset-0 rounded-full animate-ping",
            deckColor === 'emerald' ? "bg-emerald-400" : "bg-blue-400"
          )} />
        </div>
      )}

      {/* Speed Lines (when playing) */}
      {isPlaying && (
        <div className="absolute inset-0 rounded-full opacity-20 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-0.5 h-8 origin-bottom",
                deckColor === 'emerald' ? "bg-emerald-400/30" : "bg-blue-400/30"
              )}
              style={{
                left: '50%',
                bottom: '50%',
                transform: `translateX(-50%) rotate(${i * 45}deg)`,
                transformOrigin: '50% 100%'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
