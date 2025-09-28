import React, { useEffect } from 'react'
import { Play, Pause, Volume2, Clock, Music2 } from 'lucide-react'
import { useAudioStore } from '../stores/audioStore'
import { useSpotifyStore } from '../stores/spotifyStore'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { Progress } from './ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Separator } from './ui/separator'
import { VinylRecord } from './VinylRecord'
import { EffectsPanel } from './EffectsPanel'
import { cn, formatTime } from '../lib/utils'

interface DeckPanelProps {
  deck: 'A' | 'B'
  onSpotifyClick?: () => void
}

export const DeckPanel: React.FC<DeckPanelProps> = ({ deck, onSpotifyClick }) => {
  const { 
    deckA, 
    deckB, 
    playPause, 
    setVolume, 
    seekSpotifyTrack,
    setDeckPosition,
    scrubTrack,
    prepareDeck,
    autoCrossfade,
    isCrossfading
  } = useAudioStore()
  
  const { isPremium, isBuffering } = useSpotifyStore()
  
  const currentDeck = deck === 'A' ? deckA : deckB
  const { track, isPlaying, currentTime, volume, isActive, isLoading, lastPlayedPosition } = currentDeck


  const handlePlayPause = () => {
    playPause(deck)
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(deck, value[0])
  }

  const handlePositionChange = async (value: number[]) => {
    if (!track || track.type !== 'spotify') return
    
    const newPosition = value[0]
    const positionMs = Math.round(newPosition * 1000)
    
    if (isActive) {
      // For active deck: seek the actual Spotify player
      await seekSpotifyTrack(deck, positionMs)
    } else {
      // For inactive deck: only update UI position (preparation)
      setDeckPosition(deck, positionMs)
    }
  }

  const handleVinylScrub = (direction: 'forward' | 'backward', intensity: number) => {
    if (!track) return
    scrubTrack(deck, direction, intensity)
  }

  const handlePrepareAtCurrentTime = () => {
    if (!track) return
    const prepareTimeMs = Math.round(currentTime * 1000)
    prepareDeck(deck, prepareTimeMs)
  }


  // Calculate auto-crossfade status
  const getAutoCrossfadeStatus = () => {
    if (!track || !isActive || !autoCrossfade.enabled) return null
    
    const timeRemaining = track.duration - currentTime
    const willTriggerSoon = timeRemaining <= autoCrossfade.triggerTime
    
    return {
      timeRemaining,
      willTriggerSoon,
      triggersIn: autoCrossfade.triggerTime - (track.duration - currentTime)
    }
  }

  const autoCrossfadeStatus = getAutoCrossfadeStatus()

  // Keyboard shortcuts for deck control
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if this deck is focused or for global shortcuts
      if (event.target !== document.body) return
      
      switch (event.key.toLowerCase()) {
        case deck.toLowerCase(): // 'a' for deck A, 'b' for deck B
          event.preventDefault()
          handlePlayPause()
          break
        case (deck === 'A' ? 'q' : 'p'): // Q for deck A volume up, P for deck B volume up
          event.preventDefault()
          setVolume(deck, Math.min(1, volume + 0.1))
          break
        case (deck === 'A' ? 'z' : ';'): // Z for deck A volume down, ; for deck B volume down
          event.preventDefault()
          setVolume(deck, Math.max(0, volume - 0.1))
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [deck, handlePlayPause, setVolume, volume])

  const deckColor = deck === 'A' ? 'emerald' : 'blue'
  const progressVariant = deck === 'A' ? 'deck-a' : 'deck-b'

  return (
    <div className="flex flex-col space-y-4">
      {/* Vinyl Record Display */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <VinylRecord
            albumArt={track?.albumArt}
            isPlaying={isPlaying}
            deckColor={deckColor}
            size="md"
            className="hover-lift"
            onScrub={track ? handleVinylScrub : undefined}
            disabled={isBuffering}
          />
          
          {/* Track Loading Overlay */}
          {!track && (
            <div 
              className="absolute inset-0 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/30 transition-colors group"
              onClick={onSpotifyClick}
            >
              <div className="text-center space-y-2">
                <Music2 className="w-8 h-8 text-white/60 mx-auto group-hover:text-emerald-400 transition-colors" />
                <p className="text-xs text-white/60 font-light group-hover:text-emerald-300 transition-colors">
                  Load from Spotify
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Track Info */}
        {track ? (
          <div className="text-center space-y-2 max-w-full px-4">
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-white truncate max-w-56" title={track.title}>
                {track.title}
              </h3>
              <p className="text-sm text-muted-foreground font-light">{track.artist}</p>
              {track.type === 'spotify' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-center space-x-2 text-xs">
                    <Music2 className="w-3 h-3 text-emerald-400" />
                    <span className={cn(
                      "font-medium",
                      isPremium() ? "text-emerald-400" : "text-yellow-400"
                    )}>
                      {isLoading ? 'Switching...' :
                       isBuffering && isPlaying ? 'Buffering...' :
                       isPremium() 
                        ? 'Premium - Full Track' 
                        : track.previewUrl 
                          ? '30s Preview Only' 
                          : 'Premium Required'}
                    </span>
                  </div>
                  
                  {/* Deck Status */}
                  <div className="flex items-center justify-center space-x-1 text-xs">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isActive ? "bg-emerald-400 animate-pulse" : 
                      track.isPrepared ? "bg-yellow-400" : "bg-gray-400"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      isActive ? "text-emerald-400" : 
                      track.isPrepared ? "text-yellow-400" : "text-gray-400"
                    )}>
                      {isActive ? 'ACTIVE' : track.isPrepared ? 'PREPARED' : 'READY'}
                    </span>
                  </div>
                  
                  {/* Preparation Info */}
                  {track.isPrepared && (
                    <div className="text-xs text-center text-muted-foreground space-y-1">
                      <div>Start: {formatTime(track.preparedStartTime / 1000)} • {!isActive && lastPlayedPosition > 0 && (
                        <span className="text-blue-400">
                          Resume: {formatTime(lastPlayedPosition)}
                        </span>
                      )}</div>
                     
                    </div>
                  )}
                  
                  {/* Auto-Crossfade Warning */}
                  {autoCrossfadeStatus?.willTriggerSoon && (
                    <div className="text-xs text-center px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-400 animate-pulse">
                      ⚠️ Auto-crossfade in {autoCrossfadeStatus.timeRemaining.toFixed(1)}s
                    </div>
                  )}
                  
                  {/* Crossfading Indicator */}
                  {isCrossfading && isActive && (
                    <div className="text-xs text-center px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400">
                      🎵 Crossfading out...
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span className="font-mono">{formatTime(currentTime)}</span>
              </div>
              <span className="text-white/30">•</span>
              <span className="font-mono">{formatTime(track.duration)}</span>
            </div>

            {/* Waveform-style Progress Bar */}
            <div className="w-full max-w-48 mx-auto">
              <Progress 
                value={(currentTime / (track.duration || 1)) * 100} 
                variant={progressVariant}
                className="h-2 bg-white/10"
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 px-4">
            <p className="text-muted-foreground text-lg font-light">No track loaded</p>
            <p className="text-xs text-muted-foreground/60">
              Connect Spotify to get started
            </p>
          </div>
        )}
      </div>

      <Separator className="bg-white/5" />

      {/* Seek Controls */}
      {track && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-light text-muted-foreground">Position</span>
            <span className="text-xs font-mono text-white">
              {Math.round((currentTime / track.duration) * 100)}%
            </span>
          </div>
          
          <Slider
            value={[currentTime]}
            max={track.duration}
            step={0.1}
            onValueChange={handlePositionChange}
            className={cn(
              "w-full seek-slider",
              isBuffering && track.type === 'spotify' && "opacity-50 animate-pulse"
            )}
            variant="default"
            disabled={isBuffering && track.type === 'spotify'}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(track.duration - currentTime)}</span>
          </div>
        </div>
      )}

      <Separator className="bg-white/5" />

      {/* Controls Section */}
      <div className="space-y-4">
        {/* Play/Pause Button */}
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handlePlayPause}
                disabled={!track}
                variant={deck === 'A' ? 'play' : 'play'}
                size="xl"
                className={cn(
                  "shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 relative overflow-hidden",
                  deck === 'A' ? "hover-glow-deck-a" : "hover-glow-deck-b",
                  !track && "opacity-30 cursor-not-allowed",
                  isPlaying && "shadow-2xl"
                )}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
                
                {/* Pulse effect when playing */}
                {isPlaying && (
                  <div className={cn(
                    "absolute inset-0 rounded-full animate-ping opacity-20",
                    deck === 'A' ? "bg-emerald-400" : "bg-blue-400"
                  )} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPlaying ? 'Pause' : 'Play'} • Space</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* DJ Preparation Controls */}
        {track && (
          <div className="space-y-2">
            <Button
              onClick={handlePrepareAtCurrentTime}
              size="sm"
              variant="outline"
              className="w-full text-xs"
              disabled={!track || isLoading}
            >
              Set Cue Point
            </Button>
            
            {track.isPrepared && !isActive && (
              <div className="text-xs text-center text-yellow-400 font-medium">
                Ready at {formatTime(track.preparedStartTime / 1000)} • Press Play to activate
              </div>
            )}
          </div>
        )}

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-light text-muted-foreground">Volume</span>
            </div>
            <span className="text-sm font-mono text-white">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            variant="volume"
            className="w-full"
          />
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Effects Panel */}
      <EffectsPanel deck={deck} />
    </div>
  )
}