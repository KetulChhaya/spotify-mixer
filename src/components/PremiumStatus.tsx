import React from 'react'
import { Crown, AlertTriangle } from 'lucide-react'
import { useSpotifyStore } from '../stores/spotifyStore'
import { cn } from '../lib/utils'

interface PremiumStatusProps {
  className?: string
  showIcon?: boolean
  showText?: boolean
  variant?: 'badge' | 'inline' | 'full'
}

export const PremiumStatus: React.FC<PremiumStatusProps> = ({ 
  className = '', 
  showIcon = true, 
  showText = true,
  variant = 'inline'
}) => {
  const { user, isPremium, isAuthenticated } = useSpotifyStore()

  if (!isAuthenticated || !user) {
    return null
  }

  const premium = isPremium()
  
  const iconComponent = premium ? (
    <Crown className="w-4 h-4 text-yellow-400" />
  ) : (
    <AlertTriangle className="w-4 h-4 text-orange-400" />
  )

  const textContent = premium ? 'Premium' : 'Free Account'
  const subText = premium 
    ? 'Full track access' 
    : 'Preview access only'

  const baseClasses = cn(
    "flex items-center space-x-2",
    className
  )

  if (variant === 'badge') {
    return (
      <div className={cn(
        baseClasses,
        "px-3 py-1 rounded-full text-xs font-medium",
        premium 
          ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20" 
          : "bg-orange-400/10 text-orange-400 border border-orange-400/20"
      )}>
        {showIcon && iconComponent}
        {showText && <span>{textContent}</span>}
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={cn(baseClasses, "flex-col items-start space-x-0 space-y-1")}>
        <div className="flex items-center space-x-2">
          {showIcon && iconComponent}
          {showText && (
            <span className={cn(
              "font-medium",
              premium ? "text-yellow-400" : "text-orange-400"
            )}>
              {textContent}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{subText}</p>
      </div>
    )
  }

  // Default inline variant
  return (
    <div className={baseClasses}>
      {showIcon && iconComponent}
      {showText && (
        <span className={cn(
          "text-sm font-medium",
          premium ? "text-yellow-400" : "text-orange-400"
        )}>
          {textContent}
        </span>
      )}
    </div>
  )
}

// Hook for easy Premium status checking
export const usePremiumStatus = () => {
  const { user, isPremium, canPlayFullTracks, isAuthenticated } = useSpotifyStore()
  
  return {
    isPremium: isPremium(),
    canPlayFullTracks: canPlayFullTracks(),
    isAuthenticated,
    user,
    accountType: user?.product || 'unknown',
    hasFullAccess: isPremium() && isAuthenticated,
    limitsMessage: isPremium() 
      ? null 
      : 'Upgrade to Spotify Premium for full track access and unlimited skips'
  }
}
