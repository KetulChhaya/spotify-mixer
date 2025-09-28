import React from 'react'
import { useAudioStore } from '../stores/audioStore'
import { Slider } from './ui/slider'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { SkipBack, SkipForward, Equal, Zap, Volume2, Filter, RotateCcw, RotateCw, Square, Music } from 'lucide-react'
import { cn } from '../lib/utils'
import { useEffectsStore } from '../stores/effectsStore'
import { beatSyncManager } from '../lib/beatSync'

export const Crossfader: React.FC = () => {
  const { crossfaderPosition, setCrossfader, deckA, deckB, startAutoCrossfade, isCrossfading } = useAudioStore()
  const { applyPreset, stopAllEffects } = useEffectsStore()

  const handleCrossfaderChange = (value: number[]) => {
    setCrossfader(value[0])
  }


  const quickButtons = [
    { label: 'A', value: 0, icon: SkipBack, tooltip: 'Deck A Only (Home)' },
    { label: 'Mix', value: 0.5, icon: Equal, tooltip: 'Center Mix (Space)' },
    { label: 'B', value: 1, icon: SkipForward, tooltip: 'Deck B Only (End)' },
  ]

  // Auto crossfade logic
  const handleAutoCrossfade = () => {
    const activeDeckId = deckA.isActive ? 'A' : deckB.isActive ? 'B' : null
    const inactiveDeckId = deckA.isActive ? 'B' : deckB.isActive ? 'A' : null
    
    if (activeDeckId && inactiveDeckId) {
      startAutoCrossfade(activeDeckId, inactiveDeckId)
    }
  }

  const canAutoCrossfade = () => {
    const activeDeck = deckA.isActive ? deckA : deckB.isActive ? deckB : null
    const inactiveDeck = deckA.isActive ? deckB : deckB.isActive ? deckA : null
    
    return activeDeck?.track && inactiveDeck?.track?.isPrepared && !isCrossfading
  }

  // Manual beat sync trigger
  const handleBeatSync = (deck: 'A' | 'B') => {
    const targetDeck = deck === 'A' ? deckA : deckB
    if (!targetDeck.track) return

    const estimatedBPM = beatSyncManager.getEstimatedBPM(
      targetDeck.track.title,
      targetDeck.track.artist
    )

    beatSyncManager.startBeatSync({
      duration: 2000, // 2 seconds
      bpm: estimatedBPM,
      intensity: 0.8,
      deck: deck
    })

    console.log(`🎵 Manual beat sync triggered for deck ${deck}: ${estimatedBPM} BPM`)
  }

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setCrossfader(Math.max(0, crossfaderPosition - 0.05))
          break
        case 'ArrowRight':
          e.preventDefault()
          setCrossfader(Math.min(1, crossfaderPosition + 0.05))
          break
        case 'Home':
          e.preventDefault()
          setCrossfader(0)
          break
        case 'End':
          e.preventDefault()
          setCrossfader(1)
          break
        case ' ':
          e.preventDefault()
          setCrossfader(0.5)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [crossfaderPosition, setCrossfader])

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Title Section */}
      {/* <div className="text-center space-y-2">
        <h3 className="text-2xl font-light tracking-wider text-white">Crossfader</h3>
        <p className="text-sm text-muted-foreground font-light">
          Blend audio between decks
        </p>
      </div> */}


      {/* Main Crossfader */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            {/* Crossfader Track Labels */}
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span className="text-emerald-400 font-medium">A</span>
              <span className="text-white font-mono">
                {Math.round(crossfaderPosition * 100)}%
              </span>
              <span className="text-blue-400 font-medium">B</span>
            </div>
            
            {/* The main crossfader slider */}
            <Slider
              value={[crossfaderPosition]}
              max={1}
              step={0.01}
              onValueChange={handleCrossfaderChange}
              variant="crossfader"
              className="w-full crossfader-main"
            />
            
            {/* Position markers */}
            <div className="flex justify-between mt-2">
              <div className="w-0.5 h-2 bg-emerald-400/50 rounded-full" />
              <div className="w-0.5 h-2 bg-white/30 rounded-full" />
              <div className="w-0.5 h-2 bg-blue-400/50 rounded-full" />
            </div>
          </div>
        </div>

        {/* Quick Position Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {quickButtons.map((button) => (
            <Tooltip key={button.label}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setCrossfader(button.value)}
                  variant="glass"
                  size="sm"
                  className={cn(
                    "transition-all duration-200 hover-lift focus-visible-ring",
                    Math.abs(crossfaderPosition - button.value) < 0.01 && "bg-white/10 border-white/20"
                  )}
                >
                  <button.icon className="w-3 h-3 mr-1" />
                  <span className="text-xs font-medium">{button.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{button.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Auto Crossfade Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleAutoCrossfade}
              disabled={!canAutoCrossfade()}
              variant="glass"
              size="sm"
              className={cn(
                "w-full transition-all duration-200 hover-lift focus-visible-ring",
                isCrossfading ? "bg-orange-600/20 border-orange-400/50" : "bg-emerald-600/20 border-emerald-400/50",
                canAutoCrossfade() && "hover:bg-emerald-600/30"
              )}
            >
              <Zap className={cn("w-3 h-3 mr-2", isCrossfading && "animate-pulse")} />
              <span className="text-xs font-medium">
                {isCrossfading ? 'Crossfading...' : 'Auto Crossfade'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {!canAutoCrossfade() 
                ? 'Need active deck and prepared inactive deck' 
                : 'Start automatic crossfade to prepared deck'
              }
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Beat Sync Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleBeatSync('A')}
                disabled={!deckA.track}
                variant="glass"
                size="sm"
                className="transition-all duration-200 hover-lift focus-visible-ring bg-emerald-600/20 border-emerald-400/50 hover:bg-emerald-600/30"
              >
                <Music className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium">Beat A</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">2s beat sync for Deck A</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleBeatSync('B')}
                disabled={!deckB.track}
                variant="glass"
                size="sm"
                className="transition-all duration-200 hover-lift focus-visible-ring bg-blue-600/20 border-blue-400/50 hover:bg-blue-600/30"
              >
                <Music className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium">Beat B</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">2s beat sync for Deck B</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Common Effects Section - Minimized */}
        <div className="space-y-2 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground">Quick Effects</h4>
            <Button
              onClick={() => {
                stopAllEffects('A')
                stopAllEffects('B')
              }}
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 hover:bg-red-500/20 text-red-400"
            >
              <Square className="w-2 h-2" />
            </Button>
          </div>
          
          {/* Compact Effect Buttons */}
          <div className="flex flex-wrap gap-1">
            {/* Beat Repeat */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    applyPreset('A', 'beatRepeat')
                    applyPreset('B', 'beatRepeat')
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs hover:bg-orange-500/20 text-orange-400"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Beat
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Beat repeat both decks</p>
              </TooltipContent>
            </Tooltip>

            {/* Low Pass Filter */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    applyPreset('A', 'lowPassFilter')
                    applyPreset('B', 'lowPassFilter')
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs hover:bg-blue-500/20 text-blue-400"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  Filter
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Low pass both decks</p>
              </TooltipContent>
            </Tooltip>

            {/* Echo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    applyPreset('A', 'echo')
                    applyPreset('B', 'echo')
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs hover:bg-purple-500/20 text-purple-400"
                >
                  <Volume2 className="w-3 h-3 mr-1" />
                  Echo
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Echo both decks</p>
              </TooltipContent>
            </Tooltip>

            {/* Reverse */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    applyPreset('A', 'reverse')
                    applyPreset('B', 'reverse')
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs hover:bg-red-500/20 text-red-400"
                >
                  <RotateCw className="w-3 h-3 mr-1" />
                  Rev
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Reverse both decks</p>
              </TooltipContent>
            </Tooltip>

            {/* Vinyl Brake */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    applyPreset('A', 'vinylBrake')
                    applyPreset('B', 'vinylBrake')
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs hover:bg-yellow-500/20 text-yellow-400"
                >
                  <Square className="w-3 h-3 mr-1" />
                  Brake
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Vinyl brake both decks</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

      </div>
    </div>
  )
}