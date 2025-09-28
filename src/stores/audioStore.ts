import { create } from 'zustand'
import { useSpotifyStore } from './spotifyStore'
import { getEffectsProcessor } from '../lib/audioEffects'
import { beatSyncManager } from '../lib/beatSync'

// Crossfade curve calculations
const getCrossfadeValue = (progress: number, curve: 'linear' | 'smooth' | 'power'): number => {
  // Clamp progress between 0 and 1
  progress = Math.max(0, Math.min(1, progress))
  
  switch (curve) {
    case 'linear':
      return progress
    case 'smooth':
      // S-curve (smoothstep)
      return progress * progress * (3 - 2 * progress)
    case 'power':
      // Power curve for more dramatic transitions
      return Math.pow(progress, 1.5)
    default:
      return progress
  }
}

export interface Track {
  id: string
  title: string
  artist: string
  duration: number
  albumArt?: string
  
  // Spotify properties (Spotify-only DJ mixer)
  spotifyUri: string
  spotifyId: string
  previewUrl?: string
  type: 'spotify'
  
  // DJ preparation properties
  preparedStartTime: number    // Target start position (ms)
  isPrepared: boolean          // Ready for instant activation
  preparationTimestamp: number // When it was prepared
}

interface DeckState {
  track: Track | null
  isPlaying: boolean
  currentTime: number
  volume: number
  isActive: boolean           // Whether this deck controls the Spotify player
  isLoading: boolean          // Whether deck is switching/loading
  lastActivated: number       // Timestamp of last activation
  lastPlayedPosition: number  // Last position when deck was deactivated (seconds)
}

interface AutoCrossfadeSettings {
  enabled: boolean
  duration: number           // Crossfade duration in seconds
  triggerTime: number        // Seconds before track end to trigger
  curve: 'linear' | 'smooth' | 'power' // Crossfade curve type
  autoActivateNext: boolean  // Auto-activate prepared deck
  switchTiming: number       // When to switch tracks (0.0-1.0, default 0.75)
}

interface AudioState {
  audioContext: AudioContext | null
  deckAGain: GainNode | null
  deckBGain: GainNode | null
  masterGain: GainNode | null
  
  deckA: DeckState
  deckB: DeckState
  crossfaderPosition: number
  
  // Auto-crossfade state
  autoCrossfade: AutoCrossfadeSettings
  isCrossfading: boolean
  crossfadeStartTime: number
  crossfadeDirection: 'A-to-B' | 'B-to-A' | null
  
  // Position tracking
  positionUpdateInterval: number | null
  
  // System
  initAudio: () => void
  cleanup: () => void
  
  // DJ Preparation System (Spotify-only)
  loadSpotifyTrack: (deck: 'A' | 'B', spotifyTrack: any, startTimeMs?: number) => Promise<void>
  prepareDeck: (deck: 'A' | 'B', startTimeMs: number) => void
  activateDeck: (deck: 'A' | 'B', preservePosition?: boolean) => Promise<boolean>
  playPause: (deck: 'A' | 'B') => Promise<void>
  
  // Enhanced controls
  setVolume: (deck: 'A' | 'B', volume: number) => void
  setCrossfader: (position: number) => void
  seekSpotifyTrack: (deck: 'A' | 'B', positionMs: number) => Promise<void>
  scrubTrack: (deck: 'A' | 'B', direction: 'forward' | 'backward', intensity: number) => void
  
  // Position management
  updateSpotifyPosition: (positionMs: number, durationMs: number, deck?: 'A' | 'B') => void
  setDeckPosition: (deck: 'A' | 'B', positionMs: number) => void
  
  // Auto-crossfade system
  setAutoCrossfadeSettings: (settings: Partial<AutoCrossfadeSettings>) => void
  startAutoCrossfade: (fromDeck: 'A' | 'B', toDeck: 'A' | 'B') => Promise<void>
  stopAutoCrossfade: () => void
  checkAutoCrossfadeTrigger: () => void
  
  // Position tracking
  startPositionTracking: () => void
  stopPositionTracking: () => void
  
  // Effects processing
  processEffects: (deck: 'A' | 'B') => Promise<void>
  stopEffects: (deck: 'A' | 'B') => Promise<void>
}


export const useAudioStore = create<AudioState>((set, get) => ({
  audioContext: null,
  deckAGain: null,
  deckBGain: null,
  masterGain: null,
  
  deckA: {
    track: null,
    isPlaying: false,
    currentTime: 0,
    volume: 0.8,
    isActive: false,
    isLoading: false,
    lastActivated: 0,
    lastPlayedPosition: 0,
  },
  
  deckB: {
    track: null,
    isPlaying: false,
    currentTime: 0,
    volume: 0.8,
    isActive: false,
    isLoading: false,
    lastActivated: 0,
    lastPlayedPosition: 0,
    },
    
    crossfaderPosition: 0.5,
    
  // Auto-crossfade initial state
  autoCrossfade: {
    enabled: true,
    duration: 8,              // 8 second crossfade
    triggerTime: 15,          // Start 15 seconds before track end
    curve: 'smooth',          // Smooth S-curve transition
    autoActivateNext: true,   // Auto-activate prepared deck
    switchTiming: 0.75,       // Switch at 75% through crossfade (6s into 8s)
  },
  isCrossfading: false,
  crossfadeStartTime: 0,
  crossfadeDirection: null,
  
  // Position tracking
  positionUpdateInterval: null,
    
  initAudio: () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const deckAGain = audioContext.createGain()
      const deckBGain = audioContext.createGain()
      const masterGain = audioContext.createGain()
      
      deckAGain.connect(masterGain)
      deckBGain.connect(masterGain)
      masterGain.connect(audioContext.destination)
      
      deckAGain.gain.value = 0.8
      deckBGain.gain.value = 0.8
      masterGain.gain.value = 0.8
      
      set({
        audioContext,
        deckAGain,
        deckBGain,
        masterGain,
      })
      
      get().setCrossfader(0.5)
      console.log('Audio context initialized')
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
    }
  },
  
    
  loadSpotifyTrack: async (deck: 'A' | 'B', spotifyTrack: any, startTimeMs = 0) => {
    try {
      // Get album art (largest image)
      const albumArt = spotifyTrack.album.images.length > 0 
        ? spotifyTrack.album.images[0].url 
        : undefined

      const track: Track = {
        id: spotifyTrack.id,
        title: spotifyTrack.name,
        artist: spotifyTrack.artists.map((artist: any) => artist.name).join(', '),
        duration: spotifyTrack.duration_ms / 1000,
        albumArt,
        spotifyUri: spotifyTrack.uri,
        spotifyId: spotifyTrack.id,
        previewUrl: spotifyTrack.preview_url,
        type: 'spotify',
        preparedStartTime: startTimeMs,
        isPrepared: true,
        preparationTimestamp: Date.now(),
      }

      if (deck === 'A') {
        set((state) => ({
          ...state,
          deckA: {
            ...state.deckA,
            track,
            isPlaying: false,
            // Don't reset currentTime if deck is already playing (preserve position)
            currentTime: state.deckA.isPlaying ? state.deckA.currentTime : startTimeMs / 1000,
            isLoading: false,
          },
        }))
      } else {
        set((state) => ({
          ...state,
          deckB: {
            ...state.deckB,
            track,
            isPlaying: false,
            // Don't reset currentTime if deck is already playing (preserve position)
            currentTime: state.deckB.isPlaying ? state.deckB.currentTime : startTimeMs / 1000,
            isLoading: false,
          },
        }))
        }
        
      console.log(`✅ Deck ${deck} prepared: ${track.title} @ ${startTimeMs}ms`)
      } catch (error) {
      console.error('Failed to load Spotify track:', error)
        throw error
      }
    },
    
  prepareDeck: (deck: 'A' | 'B', startTimeMs: number) => {
    const state = get()
    const currentDeck = deck === 'A' ? state.deckA : state.deckB
    
    if (!currentDeck.track) {
      console.warn(`Cannot prepare deck ${deck}: No track loaded`)
      return
    }

    // Update preparation settings
    const updatedTrack = {
      ...currentDeck.track,
      preparedStartTime: startTimeMs,
      isPrepared: true,
      preparationTimestamp: Date.now(),
    }

    if (deck === 'A') {
      set((state) => ({
        ...state,
        deckA: {
          ...state.deckA,
          track: updatedTrack,
          // Only update currentTime if deck is not active (to avoid interfering with playback)
          currentTime: state.deckA.isActive ? state.deckA.currentTime : startTimeMs / 1000,
        },
      }))
    } else {
      set((state) => ({
        ...state,
        deckB: {
          ...state.deckB,
          track: updatedTrack,
          // Only update currentTime if deck is not active (to avoid interfering with playback)
          currentTime: state.deckB.isActive ? state.deckB.currentTime : startTimeMs / 1000,
        },
      }))
    }

    console.log(`🎯 Deck ${deck} prepared at ${startTimeMs}ms ${currentDeck.isActive ? '(active deck - position preserved)' : '(inactive deck - position updated)'}`)
  },

  activateDeck: async (deck: 'A' | 'B', preservePosition = false) => {
      const state = get()
    const targetDeck = deck === 'A' ? state.deckA : state.deckB
    // const otherDeck = deck === 'A' ? state.deckB : state.deckA // Unused for now

    if (!targetDeck.track || !targetDeck.track.isPrepared) {
      console.error(`Cannot activate deck ${deck}: Track not prepared`)
      return false
    }

    try {
      // Set loading state
      if (deck === 'A') {
        set((state) => ({ ...state, deckA: { ...state.deckA, isLoading: true } }))
      } else {
        set((state) => ({ ...state, deckB: { ...state.deckB, isLoading: true } }))
      }

      // Determine start position based on context
      let startPositionMs: number
      
      if (preservePosition) {
        // During crossfade or resuming: check for last played position
        if (targetDeck.lastPlayedPosition > 0) {
          startPositionMs = Math.round(targetDeck.lastPlayedPosition * 1000)
          console.log(`🔄 Resuming deck ${deck} from last position: ${startPositionMs}ms`)
        } else if (targetDeck.currentTime > 0) {
          startPositionMs = Math.round(targetDeck.currentTime * 1000)
          console.log(`🔄 Resuming deck ${deck} from current position: ${startPositionMs}ms`)
        } else {
          startPositionMs = targetDeck.track.preparedStartTime
          console.log(`🎯 No previous position, starting deck ${deck} from cue point: ${startPositionMs}ms`)
        }
      } else {
        // Fresh activation: use prepared cue point
        startPositionMs = targetDeck.track.preparedStartTime
        console.log(`🎯 Starting deck ${deck} from cue point: ${startPositionMs}ms`)
      }

      // Use Spotify store to switch tracks
      const { playTrack } = useSpotifyStore.getState()
      await playTrack(targetDeck.track.spotifyUri, startPositionMs)

      // Update deck states and save current positions
      if (deck === 'A') {
        set((state) => ({
          ...state,
          deckA: {
            ...state.deckA,
            isActive: true,
            isPlaying: true,
            isLoading: false,
            lastActivated: Date.now(),
            // Update current time to match the start position
            currentTime: startPositionMs / 1000,
          },
          deckB: {
            ...state.deckB,
            isActive: false,
            isPlaying: false,
            // Save current position when deactivating
            lastPlayedPosition: state.deckB.isActive ? state.deckB.currentTime : state.deckB.lastPlayedPosition,
          },
        }))
      } else {
        set((state) => ({
          ...state,
          deckB: {
            ...state.deckB,
            isActive: true,
            isPlaying: true,
            isLoading: false,
            lastActivated: Date.now(),
            // Update current time to match the start position
            currentTime: startPositionMs / 1000,
          },
          deckA: {
            ...state.deckA,
            isActive: false,
            isPlaying: false,
            // Save current position when deactivating
            lastPlayedPosition: state.deckA.isActive ? state.deckA.currentTime : state.deckA.lastPlayedPosition,
          },
        }))
      }

      console.log(`🎵 Deck ${deck} activated: ${targetDeck.track.title}`)
      
      // Trigger beat sync effect if this is a crossfade transition
      const currentState = get()
      if (currentState.isCrossfading) {
        const estimatedBPM = beatSyncManager.getEstimatedBPM(
          targetDeck.track.title, 
          targetDeck.track.artist
        )
        
        beatSyncManager.startBeatSync({
          duration: 2000, // 2 seconds
          bpm: estimatedBPM,
          intensity: 0.7,
          deck: deck
        })
        
        console.log(`🎵 Beat sync started for deck ${deck}: ${estimatedBPM} BPM for 2s`)
      }
      
      // Start position tracking for the newly activated deck
      get().startPositionTracking()
      
      return true
        
      } catch (error) {
      console.error(`Failed to activate deck ${deck}:`, error)
      
      // Reset loading state
      if (deck === 'A') {
        set((state) => ({ ...state, deckA: { ...state.deckA, isLoading: false } }))
      } else {
        set((state) => ({ ...state, deckB: { ...state.deckB, isLoading: false } }))
      }
      
      return false
    }
  },
    
  playPause: async (deck: 'A' | 'B') => {
    const state = get()
    const currentDeck = deck === 'A' ? state.deckA : state.deckB
    
    if (!currentDeck.track) return

    // If deck is not active, activate it first
    if (!currentDeck.isActive) {
      const success = await get().activateDeck(deck)
      if (!success) return
      
      // Start position tracking when activating and playing
      get().startPositionTracking()
    } else {
      // Toggle playback on active deck
      const { pausePlayback, resumePlayback } = useSpotifyStore.getState()
      
      if (currentDeck.isPlaying) {
        await pausePlayback()
        
        // Stop position tracking when pausing
        get().stopPositionTracking()
        
        if (deck === 'A') {
          set((state) => ({ ...state, deckA: { ...state.deckA, isPlaying: false } }))
        } else {
          set((state) => ({ ...state, deckB: { ...state.deckB, isPlaying: false } }))
        }
      } else {
        await resumePlayback()
        
        // Start position tracking when resuming
        get().startPositionTracking()
        
        if (deck === 'A') {
          set((state) => ({ ...state, deckA: { ...state.deckA, isPlaying: true } }))
        } else {
          set((state) => ({ ...state, deckB: { ...state.deckB, isPlaying: true } }))
        }
      }
    }
  },

  // Legacy method - now handled by activateDeck/playPause
  handleSpotifyPlayback: (deck: 'A' | 'B') => {
    console.warn('handleSpotifyPlayback deprecated - use activateDeck/playPause instead')
    get().activateDeck(deck)
  },

  // Legacy method - now handled by activateDeck  
  playSpotifyPreview: (deck: 'A' | 'B') => {
    console.warn('playSpotifyPreview deprecated - use activateDeck/playPause instead')
    get().activateDeck(deck)
  },

  // Legacy method - now handled by activateDeck
  playSpotifyFullTrack: async (deck: 'A' | 'B') => {
    console.warn('playSpotifyFullTrack deprecated - use activateDeck/playPause instead')
    await get().activateDeck(deck)
  },
  
  setVolume: (deck: 'A' | 'B', volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    const { deckA, deckB, crossfaderPosition } = get()
    const currentDeck = deck === 'A' ? deckA : deckB
    const gainNode = deck === 'A' ? get().deckAGain : get().deckBGain
    
    // Apply crossfader to volume
    const crossfaderMix = deck === 'A' ? (1 - crossfaderPosition) : crossfaderPosition
    const finalVolume = clampedVolume * crossfaderMix
    
    // Only apply Spotify volume changes if this deck is currently active
    if (currentDeck.track?.type === 'spotify' && currentDeck.isActive) {
      const { setVolume: setSpotifyVolume, player } = useSpotifyStore.getState()
      
      // Use player SDK for volume if available (more responsive)
      if (player) {
        player.setVolume(finalVolume).catch((error: any) => {
          console.warn('Failed to set Spotify volume via SDK:', error)
          // Fallback to API
          setSpotifyVolume(finalVolume)
        })
      } else {
        setSpotifyVolume(finalVolume)
      }
    }
    
    // Handle local tracks volume
    if (gainNode) {
      gainNode.gain.value = finalVolume
    }
    
    // Update state
    if (deck === 'A') {
      set((state) => ({
        ...state,
        deckA: { ...state.deckA, volume: clampedVolume },
      }))
    } else {
      set((state) => ({
        ...state,
        deckB: { ...state.deckB, volume: clampedVolume },
      }))
    }
    
    console.log(`🎚️ Set deck ${deck} volume to ${Math.round(clampedVolume * 100)}% ${currentDeck.isActive ? '(active - applied to Spotify)' : '(inactive - UI only)'}`)
  },
  
  setCrossfader: (position: number) => {
    const clampedPosition = Math.max(0, Math.min(1, position))
    const { deckAGain, deckBGain, deckA, deckB } = get()
    
    // Crossfader curves for smooth mixing
    const deckAMix = 1 - clampedPosition  // Full volume at position 0
    const deckBMix = clampedPosition      // Full volume at position 1
    
    // Apply crossfader to local tracks
    if (deckAGain && deckBGain) {
      deckAGain.gain.value = deckA.volume * deckAMix
      deckBGain.gain.value = deckB.volume * deckBMix
    }
    
    // Apply crossfader to Spotify tracks
    const { setVolume: setSpotifyVolume, player } = useSpotifyStore.getState()
    
    if (deckA.track?.type === 'spotify' && deckA.isPlaying) {
      const finalVolumeA = deckA.volume * deckAMix
      if (player) {
        player.setVolume(finalVolumeA).catch(() => setSpotifyVolume(finalVolumeA))
      } else {
        setSpotifyVolume(finalVolumeA)
      }
    }
    
    if (deckB.track?.type === 'spotify' && deckB.isPlaying) {
      const finalVolumeB = deckB.volume * deckBMix
      if (player) {
        player.setVolume(finalVolumeB).catch(() => setSpotifyVolume(finalVolumeB))
      } else {
        setSpotifyVolume(finalVolumeB)
      }
    }
    
    set({ crossfaderPosition: clampedPosition })
  },
  
    
    cleanup: () => {
    const { audioContext } = get()
    
    // Stop position tracking
    get().stopPositionTracking()
    
    if (audioContext) {
      audioContext.close()
    }
      
    set({
      audioContext: null,
      deckAGain: null,
      deckBGain: null,
      masterGain: null,
      positionUpdateInterval: null,
      deckA: { 
        track: null, 
        isPlaying: false, 
        currentTime: 0, 
        volume: 0.8, 
        isActive: false, 
        isLoading: false, 
        lastActivated: 0,
        lastPlayedPosition: 0,
      },
      deckB: { 
        track: null, 
        isPlaying: false, 
        currentTime: 0, 
        volume: 0.8, 
        isActive: false, 
        isLoading: false, 
        lastActivated: 0,
        lastPlayedPosition: 0,
      },
    })
  },

  updateSpotifyPosition: (positionMs: number, durationMs: number, deck?: 'A' | 'B') => {
    // Convert to seconds for consistency with local tracks
    const currentTime = positionMs / 1000
    const duration = durationMs / 1000
    
    // Auto-detect which deck is ACTIVE and playing Spotify track if not specified
    if (!deck) {
      const state = get()
      if (state.deckA.track?.type === 'spotify' && state.deckA.isActive && state.deckA.isPlaying) {
        deck = 'A'
      } else if (state.deckB.track?.type === 'spotify' && state.deckB.isActive && state.deckB.isPlaying) {
        deck = 'B'
      } else {
        // No active Spotify deck playing - don't update anything
        return
      }
    }
    
    // Only update if the specified deck is actually active
      const state = get()
    const targetDeck = deck === 'A' ? state.deckA : state.deckB
    
    if (!targetDeck.isActive) {
      console.warn(`Ignoring position update for inactive deck ${deck}`)
      return
    }
    
    if (deck === 'A') {
      set((state) => ({
        ...state,
        deckA: { 
          ...state.deckA, 
          currentTime,
          track: state.deckA.track ? { ...state.deckA.track, duration } : null
        },
      }))
    } else {
      set((state) => ({
        ...state,
        deckB: { 
          ...state.deckB, 
          currentTime,
          track: state.deckB.track ? { ...state.deckB.track, duration } : null
        },
      }))
    }
    
    // Check if auto-crossfade should be triggered after position update
    get().checkAutoCrossfadeTrigger()
  },

  setDeckPosition: (deck: 'A' | 'B', positionMs: number) => {
    // This method is for setting deck position independently (UI-only for inactive decks)
    const currentTime = positionMs / 1000
    
    if (deck === 'A') {
      set((state) => ({
        ...state,
        deckA: { ...state.deckA, currentTime },
      }))
    } else {
      set((state) => ({
        ...state,
        deckB: { ...state.deckB, currentTime },
      }))
    }
    
    console.log(`📍 Set deck ${deck} position to ${positionMs}ms (UI only)`)
  },

  seekSpotifyTrack: async (deck: 'A' | 'B', positionMs: number) => {
    const state = get()
    const currentDeck = deck === 'A' ? state.deckA : state.deckB
    
    if (!currentDeck.track || currentDeck.track.type !== 'spotify') {
      console.error('No Spotify track to seek')
      return
    }

    // Always update the deck's UI position immediately for responsiveness
    const currentTime = positionMs / 1000
    if (deck === 'A') {
      set((state) => ({
        ...state,
        deckA: { ...state.deckA, currentTime },
      }))
    } else {
      set((state) => ({
        ...state,
        deckB: { ...state.deckB, currentTime },
      }))
    }

    // Only perform actual Spotify seek if this deck is currently active
    if (currentDeck.isActive) {
      try {
        const { seekToPosition } = useSpotifyStore.getState()
        await seekToPosition(positionMs)
        console.log(`🎯 Seeked active deck ${deck} to ${positionMs}ms`)
      } catch (error) {
        console.error('Failed to seek Spotify track:', error)
        // Revert UI change if seek failed
        if (deck === 'A') {
          set((state) => ({
            ...state,
            deckA: { ...state.deckA, currentTime: currentDeck.currentTime },
          }))
        } else {
          set((state) => ({
            ...state,
            deckB: { ...state.deckB, currentTime: currentDeck.currentTime },
          }))
        }
      }
    } else {
      // For inactive decks, just update the UI position (preparation)
      console.log(`📍 Updated inactive deck ${deck} position to ${positionMs}ms (UI only)`)
    }
  },

  scrubTrack: (deck: 'A' | 'B', direction: 'forward' | 'backward', intensity: number) => {
    const state = get()
    const currentDeck = deck === 'A' ? state.deckA : state.deckB
    
    if (!currentDeck.track || currentDeck.track.type !== 'spotify') return
    
    // Calculate scrub amount based on intensity
    const scrubAmount = intensity * 2 // 2 seconds max scrub per gesture
    const directionMultiplier = direction === 'forward' ? 1 : -1
    const newTime = Math.max(0, Math.min(currentDeck.track.duration, currentDeck.currentTime + (scrubAmount * directionMultiplier)))
    
    const positionMs = Math.round(newTime * 1000)
    
    if (currentDeck.isActive) {
      // For active deck: scrub the actual Spotify player
      get().seekSpotifyTrack(deck, positionMs)
    } else {
      // For inactive deck: only update UI position
      get().setDeckPosition(deck, positionMs)
    }
    
    console.log(`🎧 Scrubbing ${currentDeck.isActive ? 'active' : 'inactive'} deck ${deck} ${direction} with intensity ${intensity.toFixed(2)} to ${newTime.toFixed(2)}s`)
  },

  // Auto-crossfade system implementation
  setAutoCrossfadeSettings: (settings: Partial<AutoCrossfadeSettings>) => {
    set((state) => ({
      ...state,
      autoCrossfade: { ...state.autoCrossfade, ...settings }
    }))
    console.log('🎛️ Auto-crossfade settings updated:', settings)
  },

  startAutoCrossfade: async (fromDeck: 'A' | 'B', toDeck: 'A' | 'B') => {
      const state = get()
    const { autoCrossfade } = state
    const sourceDeck = fromDeck === 'A' ? state.deckA : state.deckB
    const targetDeck = toDeck === 'A' ? state.deckA : state.deckB

    if (!sourceDeck.track || !targetDeck.track || !targetDeck.track.isPrepared) {
      console.warn(`Cannot start auto-crossfade: Missing prepared tracks`)
      return
    }

    if (state.isCrossfading) {
      console.warn(`Auto-crossfade already in progress`)
      return
    }

    console.log(`🎵 Starting optimized auto-crossfade: ${fromDeck} → ${toDeck} (${autoCrossfade.duration}s)`)

    // Set crossfading state
    set((state) => ({
      ...state,
      isCrossfading: true,
      crossfadeStartTime: Date.now(),
      crossfadeDirection: fromDeck === 'A' ? 'A-to-B' : 'B-to-A'
    }))

    // Calculate optimal switch timing (configurable)
    const switchPoint = autoCrossfade.duration * autoCrossfade.switchTiming
    const totalDuration = autoCrossfade.duration * 1000 // Convert to milliseconds
    const switchTime = switchPoint * 1000

    // Start visual crossfade immediately
    const startTime = Date.now()
    let hasActivated = false
    
    const animateCrossfade = async () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / totalDuration, 1)
      
      // Calculate crossfade value using selected curve
      const fadeValue = getCrossfadeValue(progress, autoCrossfade.curve)
      
      // Calculate new crossfader position
      let newPosition: number
      if (fromDeck === 'A') {
        // Fading from A to B: 0 → 1
        newPosition = fadeValue
      } else {
        // Fading from B to A: 1 → 0
        newPosition = 1 - fadeValue
      }
      
      // Apply crossfader position
      get().setCrossfader(newPosition)
      
      // Activate target deck at optimal timing (75% through crossfade)
      if (!hasActivated && elapsed >= switchTime && autoCrossfade.autoActivateNext && !targetDeck.isActive) {
        hasActivated = true
        try {
          console.log(`🔄 Switching tracks at optimal timing (${switchPoint}s into crossfade)`)
          await get().activateDeck(toDeck, false)
        } catch (error) {
          console.error('Failed to activate target deck during auto-crossfade:', error)
        }
      }
      
      // Continue animation or finish
      if (progress < 1) {
        requestAnimationFrame(animateCrossfade)
      } else {
        // Crossfade complete
        console.log(`✅ Auto-crossfade complete: ${fromDeck} → ${toDeck}`)
        get().stopAutoCrossfade()
      }
    }

    // Start the animation
    requestAnimationFrame(animateCrossfade)
  },

  stopAutoCrossfade: () => {
    set((state) => ({
      ...state,
      isCrossfading: false,
      crossfadeStartTime: 0,
      crossfadeDirection: null
    }))
    
    // Stop all beat sync effects when crossfade ends
    beatSyncManager.stopAllBeatSync()
    
    console.log('🛑 Auto-crossfade stopped')
  },

  checkAutoCrossfadeTrigger: () => {
    const state = get()
    const { autoCrossfade, deckA, deckB, isCrossfading } = state

    if (!autoCrossfade.enabled || isCrossfading) return

    // Check which deck is currently active
    const activeDeck = deckA.isActive ? deckA : deckB.isActive ? deckB : null
    const inactiveDeck = deckA.isActive ? deckB : deckB.isActive ? deckA : null
    const activeDeckId = deckA.isActive ? 'A' : deckB.isActive ? 'B' : null
    const inactiveDeckId = deckA.isActive ? 'B' : deckB.isActive ? 'A' : null

    if (!activeDeck || !inactiveDeck || !activeDeckId || !inactiveDeckId) return
    if (!activeDeck.track || !inactiveDeck.track || !inactiveDeck.track.isPrepared) return

    // Calculate time remaining in current track
    const timeRemaining = activeDeck.track.duration - activeDeck.currentTime

    // Check if we should trigger auto-crossfade
    if (timeRemaining <= autoCrossfade.triggerTime && timeRemaining > 0) {
      console.log(`🔔 Auto-crossfade trigger: ${timeRemaining.toFixed(1)}s remaining`)
      get().startAutoCrossfade(activeDeckId, inactiveDeckId)
    }
  },

  startPositionTracking: () => {
    const state = get()
    
    // Clear existing interval if any
    if (state.positionUpdateInterval) {
      clearInterval(state.positionUpdateInterval)
    }

    // Start continuous position polling every 250ms for smooth updates
    const interval = setInterval(async () => {
      try {
        // Import Spotify store dynamically to avoid circular dependency
        const { useSpotifyStore } = await import('./spotifyStore')
        const spotifyState = useSpotifyStore.getState()
        
        if (!spotifyState.player || !spotifyState.isPlayerReady) return

        // Get current player state
        const playerState = await spotifyState.player.getCurrentState()
        
        if (playerState && !playerState.paused && playerState.track_window?.current_track) {
          // Update position in audio store
          get().updateSpotifyPosition(
            playerState.position,
            playerState.track_window.current_track.duration_ms
          )
        }
      } catch (error) {
        console.warn('Position tracking error:', error)
      }
    }, 250) // Update every 250ms for smooth progress

    set({ positionUpdateInterval: interval })
    console.log('🕐 Started continuous position tracking (250ms intervals)')
  },

  stopPositionTracking: () => {
    const state = get()
    
    if (state.positionUpdateInterval) {
      clearInterval(state.positionUpdateInterval)
      set({ positionUpdateInterval: null })
      console.log('⏹️ Stopped position tracking')
    }
  },

  processEffects: async (deck: 'A' | 'B') => {
    const state = get()
    const { audioContext } = state
    
    if (!audioContext) {
      console.warn('Audio context not initialized for effects processing')
      return
    }

    try {
      const effectsProcessor = getEffectsProcessor(audioContext)
      const currentDeck = deck === 'A' ? state.deckA : state.deckB
      const gainNode = deck === 'A' ? state.deckAGain : state.deckBGain
      
      if (!currentDeck.track || !gainNode) return

      // Get effects from effects store
      const { useEffectsStore } = await import('./effectsStore')
      const effectsStore = useEffectsStore.getState()
      const deckEffects = deck === 'A' ? effectsStore.deckA : effectsStore.deckB
      
      // Apply active effects
      Object.values(deckEffects).forEach((effect: any) => {
        if (effect.isActive) {
          effectsProcessor.applyEffect(effect.id, effect, gainNode)
        }
      })
      
      console.log(`🎛️ Processing effects for deck ${deck}`)
    } catch (error) {
      console.error('Failed to process effects:', error)
    }
  },

  stopEffects: async (deck: 'A' | 'B') => {
    const state = get()
    const { audioContext } = state
    
    if (!audioContext) return

    try {
      const effectsProcessor = getEffectsProcessor(audioContext)
      const gainNode = deck === 'A' ? state.deckAGain : state.deckBGain
      
      if (!gainNode) return

      // Get effects from effects store
      const { useEffectsStore } = await import('./effectsStore')
      const effectsStore = useEffectsStore.getState()
      const deckEffects = deck === 'A' ? effectsStore.deckA : effectsStore.deckB
      
      // Remove all effects for this deck
      Object.keys(deckEffects).forEach((effectId) => {
        effectsProcessor.removeEffect(effectId, gainNode)
      })
      
      console.log(`🛑 Stopped all effects for deck ${deck}`)
    } catch (error) {
      console.error('Failed to stop effects:', error)
    }
  },
  }))

// Export specific methods for use by other stores
export const updateSpotifyPosition = (positionMs: number, durationMs: number, deck?: 'A' | 'B') => {
  useAudioStore.getState().updateSpotifyPosition(positionMs, durationMs, deck)
}