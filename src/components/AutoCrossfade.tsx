import React, { useState } from 'react'
import { Settings, Zap } from 'lucide-react'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import * as Switch from '@radix-ui/react-switch'
import { Separator } from './ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { useAudioStore } from '../stores/audioStore'
import { cn } from '../lib/utils'

export const AutoCrossfade: React.FC = () => {
  const { 
    autoCrossfade, 
    isCrossfading, 
    crossfadeDirection,
    deckA,
    deckB,
    setAutoCrossfadeSettings
  } = useAudioStore()

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleDurationChange = (value: number[]) => {
    setAutoCrossfadeSettings({ duration: value[0] })
  }

  const handleTriggerTimeChange = (value: number[]) => {
    setAutoCrossfadeSettings({ triggerTime: value[0] })
  }

  const handleCurveChange = (curve: 'linear' | 'smooth' | 'power') => {
    setAutoCrossfadeSettings({ curve })
  }

  const handleToggleEnabled = (enabled: boolean) => {
    setAutoCrossfadeSettings({ enabled })
  }

  const handleToggleAutoActivate = (autoActivateNext: boolean) => {
    setAutoCrossfadeSettings({ autoActivateNext })
  }


  const getTimeRemaining = () => {
    const activeDeck = deckA.isActive ? deckA : deckB.isActive ? deckB : null
    if (!activeDeck?.track) return null
    
    const remaining = activeDeck.track.duration - activeDeck.currentTime
    return Math.max(0, remaining)
  }

  const timeRemaining = getTimeRemaining()
  const willTriggerSoon = timeRemaining !== null && timeRemaining <= autoCrossfade.triggerTime

  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Title Section */}
      

      {/* Status Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isCrossfading ? "bg-emerald-400 animate-pulse" :
              autoCrossfade.enabled ? "bg-emerald-400" : "bg-gray-400"
            )} />
            <span className="text-sm font-light text-white">
              {isCrossfading ? 'Crossfading...' :
               autoCrossfade.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          
          <Switch.Root
            checked={autoCrossfade.enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={isCrossfading}
            className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-input"
          >
            <Switch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
          </Switch.Root>
        </div>

        {/* Crossfade Progress */}
        {isCrossfading && crossfadeDirection && (
          <div className="space-y-2">
            <div className="text-xs text-center text-emerald-400 font-medium">
              {crossfadeDirection === 'A-to-B' ? 'Deck A → Deck B' : 'Deck B → Deck A'}
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 animate-pulse transition-all duration-300" 
                   style={{ width: '100%' }} />
            </div>
            <div className="text-xs text-center text-yellow-400 font-medium">
              ⚡ Optimized switching at 75% for minimal gap
            </div>
          </div>
        )}

        {/* Time Remaining Warning */}
        {autoCrossfade.enabled && !isCrossfading && timeRemaining !== null && (
          <div className={cn(
            "text-xs text-center px-2 py-1 rounded-md",
            willTriggerSoon ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
          )}>
            {willTriggerSoon 
              ? `⚠️ Auto-crossfade in ${timeRemaining.toFixed(1)}s`
              : `⏱️ ${timeRemaining.toFixed(1)}s remaining`
            }
          </div>
        )}
      </div>

      <Separator className="bg-white/5" />

      {/* Settings Only */}
      <div className="space-y-2">
        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="glass"
              size="sm"
              className="w-full"
            >
              <Settings className="w-3 h-3 mr-2" />
              <span className="text-xs">Settings</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <span>Auto-Crossfade Settings</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Duration Setting */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Crossfade Duration</label>
                  <span className="text-sm text-muted-foreground">{autoCrossfade.duration}s</span>
                </div>
                <Slider
                  value={[autoCrossfade.duration]}
                  onValueChange={handleDurationChange}
                  min={2}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How long the crossfade transition takes
                </p>
              </div>

              {/* Trigger Time Setting */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Trigger Time</label>
                  <span className="text-sm text-muted-foreground">{autoCrossfade.triggerTime}s</span>
                </div>
                <Slider
                  value={[autoCrossfade.triggerTime]}
                  onValueChange={handleTriggerTimeChange}
                  min={5}
                  max={60}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Start crossfade this many seconds before track ends
                </p>
              </div>

              {/* Curve Type */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Crossfade Curve</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['linear', 'smooth', 'power'] as const).map((curve) => (
                    <Button
                      key={curve}
                      onClick={() => handleCurveChange(curve)}
                      variant={autoCrossfade.curve === curve ? "default" : "outline"}
                      size="sm"
                      className="text-xs capitalize"
                    >
                      {curve}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Shape of the volume transition curve
                </p>
              </div>

              {/* Auto-Activate Setting */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Auto-Activate Next Deck</label>
                  <p className="text-xs text-muted-foreground">
                    Automatically switch Spotify player to prepared deck
                  </p>
                </div>
                <Switch.Root
                  checked={autoCrossfade.autoActivateNext}
                  onCheckedChange={handleToggleAutoActivate}
                  className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-input"
                >
                  <Switch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
                </Switch.Root>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Info */}
      <div className="text-xs text-muted-foreground/50 font-light text-center space-y-1">
        <p>Duration: {autoCrossfade.duration}s • Trigger: {autoCrossfade.triggerTime}s</p>
        <p>Curve: {autoCrossfade.curve} • Auto-activate: {autoCrossfade.autoActivateNext ? 'On' : 'Off'}</p>
      </div>
    </div>
  )
}
