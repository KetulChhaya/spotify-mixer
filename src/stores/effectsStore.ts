import { create } from 'zustand'

export type EffectType = 'beatRepeat' | 'lowPassFilter' | 'echo' | 'reverse' | 'vinylBrake'

// Direct Spotify effect application
const applySpotifyEffect = (player: any, effect: Effect) => {
  const { type } = effect
  
  console.log(`🎛️ Applying ${type} effect to Spotify player`)
  
  switch (type) {
    case 'beatRepeat':
      applyBeatRepeatEffect(player)
      break
    case 'lowPassFilter':
      applyLowPassFilterEffect(player)
      break
    case 'echo':
      applyEchoEffect(player)
      break
    case 'reverse':
      applyReverseEffect(player)
      break
    case 'vinylBrake':
      applyVinylBrakeEffect(player)
      break
  }
}

// Beat Repeat Effect - More subtle volume modulation instead of pause/resume
const applyBeatRepeatEffect = (player: any) => {
  const beatInterval = 1000 / 1.0 // 1.0 Hz
  const baseVolume = 0.8
  
  const interval = setInterval(() => {
    // Create a subtle stutter effect with volume instead of pause/resume
    const stutterIntensity = 0.5
    const stutterDuration = 20 + (stutterIntensity * 30) // 20-50ms
    
    // Quick volume dip to create stutter effect
    player.setVolume(baseVolume * 0.3)
    
    setTimeout(() => {
      player.setVolume(baseVolume)
    }, stutterDuration)
  }, beatInterval)
  
  // Store interval for cleanup
  ;(player as any)._effectIntervals = (player as any)._effectIntervals || new Map()
  ;(player as any)._effectIntervals.set('beatRepeat', interval)
}

// Low Pass Filter Effect - Simulate by reducing volume and adding subtle modulation
const applyLowPassFilterEffect = (player: any) => {
  const baseVolume = 0.8
  const filterIntensity = 0.5
  
  // Set initial filtered volume
  const filteredVolume = baseVolume * (1 - filterIntensity * 0.4) // Reduce volume to simulate filtering
  player.setVolume(filteredVolume)
  
  // Add subtle tremolo effect to simulate filter modulation
  const interval = setInterval(() => {
    const tremolo = Math.sin(Date.now() * 0.005) * 0.05 * filterIntensity // Slower, more subtle tremolo
    const volume = filteredVolume + tremolo
    player.setVolume(Math.max(0.1, Math.min(1, volume))) // Keep volume above 0.1
  }, 100) // Slower update rate for smoother effect
  
  ;(player as any)._effectIntervals = (player as any)._effectIntervals || new Map()
  ;(player as any)._effectIntervals.set('lowPassFilter', interval)
}

// Echo Effect - Create rhythmic volume modulation to simulate echo
const applyEchoEffect = (player: any) => {
  const echoDelay = 500 // 500ms delay
  const echoIntensity = 0.5
  const baseVolume = 0.8
  
  const interval = setInterval(() => {
    // Create echo pattern with volume dips
    const echoPattern = [
      { delay: 0, volume: baseVolume * 0.8 },
      { delay: echoDelay / 3, volume: baseVolume * (0.6 + echoIntensity * 0.2) },
      { delay: echoDelay / 2, volume: baseVolume * (0.4 + echoIntensity * 0.3) },
      { delay: echoDelay, volume: baseVolume }
    ]
    
    echoPattern.forEach(({ delay, volume }) => {
      setTimeout(() => {
        player.setVolume(Math.max(0.1, volume))
      }, delay)
    })
  }, echoDelay * 1.5) // Longer interval between echo patterns
  
  ;(player as any)._effectIntervals = (player as any)._effectIntervals || new Map()
  ;(player as any)._effectIntervals.set('echo', interval)
}

// Reverse Effect - Simulate with volume modulation instead of seeking
const applyReverseEffect = (player: any) => {
  const reverseIntensity = 0.5
  const baseVolume = 0.8
  
  // Create a "reverse" effect with volume modulation
  const interval = setInterval(() => {
    // Create a reverse-like effect with volume dips and peaks
    const time = Date.now() * 0.01
    const reversePattern = Math.sin(time) * Math.sin(time * 0.5) * reverseIntensity
    const volume = baseVolume * (0.7 + reversePattern * 0.3)
    
    player.setVolume(Math.max(0.1, Math.min(1, volume)))
  }, 50)
  
  ;(player as any)._effectIntervals = (player as any)._effectIntervals || new Map()
  ;(player as any)._effectIntervals.set('reverse', interval)
}

// Vinyl Brake Effect - More dramatic and realistic
const applyVinylBrakeEffect = (player: any) => {
  const brakeIntensity = 0.5
  const brakeDuration = 2000 // 2 seconds
  const baseVolume = 0.8
  let startTime = Date.now()
  
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / brakeDuration, 1)
    
    // Create exponential decay for more realistic brake effect
    const decayFactor = Math.pow(1 - progress, 2) * brakeIntensity
    const volume = baseVolume * (1 - decayFactor)
    
    // Add some noise for vinyl-like effect
    const noise = (Math.random() - 0.5) * 0.1 * brakeIntensity
    const finalVolume = Math.max(0.05, volume + noise)
    
    player.setVolume(finalVolume)
    
    // Stop when progress reaches 1
    if (progress >= 1) {
      clearInterval(interval)
      player.setVolume(baseVolume)
    }
  }, 30) // Faster updates for smoother brake effect
  
  ;(player as any)._effectIntervals = (player as any)._effectIntervals || new Map()
  ;(player as any)._effectIntervals.set('vinylBrake', interval)
}

// Stop all effects on Spotify player
const stopSpotifyEffects = (player: any) => {
  if ((player as any)._effectIntervals) {
    ;(player as any)._effectIntervals.forEach((interval: any) => {
      clearInterval(interval)
    })
    ;(player as any)._effectIntervals.clear()
  }
  // Restore normal volume
  player.setVolume(0.8)
  console.log('🛑 Stopped all Spotify effects')
}

export type EffectMode = 'single' | 'loop' | 'toggle' | 'momentary'

export interface Effect {
  id: string
  type: EffectType
  name: string
  mode: EffectMode
  isActive: boolean
  intensity: number // 0-100
  rate: number // 0-100 (for time-based effects)
  depth: number // 0-100 (for modulation effects)
  mix: number // 0-100 (dry/wet balance)
  lastTriggered: number
  duration: number // For single effects (ms)
}

export interface DeckEffects {
  [key: string]: Effect
}

interface EffectsState {
  deckA: DeckEffects
  deckB: DeckEffects
  
  // Effect management
  addEffect: (deck: 'A' | 'B', effect: Omit<Effect, 'id' | 'isActive' | 'lastTriggered'>) => void
  removeEffect: (deck: 'A' | 'B', effectId: string) => void
  updateEffect: (deck: 'A' | 'B', effectId: string, updates: Partial<Effect>) => void
  triggerEffect: (deck: 'A' | 'B', effectId: string) => void
  stopEffect: (deck: 'A' | 'B', effectId: string) => void
  stopAllEffects: (deck: 'A' | 'B') => void
  
  // Audio processing integration
  processAudioEffects: (deck: 'A' | 'B') => void
  updateSpotifyEffects: (deck: 'A' | 'B') => void
  
  // Effect presets
  getEffectPresets: () => Record<EffectType, Omit<Effect, 'id' | 'isActive' | 'lastTriggered'>>
  applyPreset: (deck: 'A' | 'B', effectType: EffectType) => void
}

const defaultEffectPresets: Record<EffectType, Omit<Effect, 'id' | 'isActive' | 'lastTriggered'>> = {
  beatRepeat: {
    type: 'beatRepeat',
    name: 'Beat Repeat',
    mode: 'loop',
    intensity: 50,
    rate: 50,
    depth: 0,
    mix: 50,
    duration: 1000
  },
  lowPassFilter: {
    type: 'lowPassFilter',
    name: 'Low Pass Filter',
    mode: 'toggle',
    intensity: 80,
    rate: 0,
    depth: 0,
    mix: 50,
    duration: 0
  },
  echo: {
    type: 'echo',
    name: 'Echo',
    mode: 'loop',
    intensity: 60,
    rate: 30,
    depth: 0,
    mix: 40,
    duration: 0
  },
  reverse: {
    type: 'reverse',
    name: 'Reverse',
    mode: 'single',
    intensity: 100,
    rate: 0,
    depth: 0,
    mix: 100,
    duration: 2000
  },
  vinylBrake: {
    type: 'vinylBrake',
    name: 'Vinyl Brake',
    mode: 'single',
    intensity: 100,
    rate: 0,
    depth: 0,
    mix: 100,
    duration: 1500
  }
}

export const useEffectsStore = create<EffectsState>((set, get) => ({
  deckA: {},
  deckB: {},
  
  addEffect: (deck: 'A' | 'B', effectData) => {
    const effectId = `${effectData.type}_${Date.now()}`
    const effect: Effect = {
      ...effectData,
      id: effectId,
      isActive: false,
      lastTriggered: 0
    }
    
    set((state) => ({
      ...state,
      [deck === 'A' ? 'deckA' : 'deckB']: {
        ...state[deck === 'A' ? 'deckA' : 'deckB'],
        [effectId]: effect
      }
    }))
    
    console.log(`🎛️ Added ${effect.name} to deck ${deck}`)
  },
  
  removeEffect: (deck: 'A' | 'B', effectId: string) => {
    set((state) => {
      const deckEffects = state[deck === 'A' ? 'deckA' : 'deckB']
      const { [effectId]: removed, ...remaining } = deckEffects
      
      return {
        ...state,
        [deck === 'A' ? 'deckA' : 'deckB']: remaining
      }
    })
    
    console.log(`🗑️ Removed effect ${effectId} from deck ${deck}`)
  },
  
  updateEffect: (deck: 'A' | 'B', effectId: string, updates: Partial<Effect>) => {
    set((state) => ({
      ...state,
      [deck === 'A' ? 'deckA' : 'deckB']: {
        ...state[deck === 'A' ? 'deckA' : 'deckB'],
        [effectId]: {
          ...state[deck === 'A' ? 'deckA' : 'deckB'][effectId],
          ...updates
        }
      }
    }))
  },
  
  triggerEffect: (deck: 'A' | 'B', effectId: string) => {
    const state = get()
    const deckEffects = state[deck === 'A' ? 'deckA' : 'deckB']
    const effect = deckEffects[effectId]
    
    if (!effect) return
    
    const now = Date.now()
    
    // Handle different effect modes
    switch (effect.mode) {
      case 'single':
        // Single trigger with duration
        set((state) => ({
          ...state,
          [deck === 'A' ? 'deckA' : 'deckB']: {
            ...state[deck === 'A' ? 'deckA' : 'deckB'],
            [effectId]: {
              ...effect,
              isActive: true,
              lastTriggered: now
            }
          }
        }))
        
        // Auto-stop after duration
        setTimeout(() => {
          get().stopEffect(deck, effectId)
        }, effect.duration)
        break
        
      case 'loop':
        // Toggle loop mode
        set((state) => ({
          ...state,
          [deck === 'A' ? 'deckA' : 'deckB']: {
            ...state[deck === 'A' ? 'deckA' : 'deckB'],
            [effectId]: {
              ...effect,
              isActive: !effect.isActive,
              lastTriggered: now
            }
          }
        }))
        break
        
      case 'toggle':
        // Toggle on/off
        set((state) => ({
          ...state,
          [deck === 'A' ? 'deckA' : 'deckB']: {
            ...state[deck === 'A' ? 'deckA' : 'deckB'],
            [effectId]: {
              ...effect,
              isActive: !effect.isActive,
              lastTriggered: now
            }
          }
        }))
        break
        
      case 'momentary':
        // Only active while held (handled by UI)
        set((state) => ({
          ...state,
          [deck === 'A' ? 'deckA' : 'deckB']: {
            ...state[deck === 'A' ? 'deckA' : 'deckB'],
            [effectId]: {
              ...effect,
              isActive: true,
              lastTriggered: now
            }
          }
        }))
        break
    }
    
    console.log(`🎵 Triggered ${effect.name} on deck ${deck} (${effect.mode} mode)`)
    
    // Process audio effects
    get().processAudioEffects(deck)
    get().updateSpotifyEffects(deck)
  },
  
  stopEffect: (deck: 'A' | 'B', effectId: string) => {
    set((state) => ({
      ...state,
      [deck === 'A' ? 'deckA' : 'deckB']: {
        ...state[deck === 'A' ? 'deckA' : 'deckB'],
        [effectId]: {
          ...state[deck === 'A' ? 'deckA' : 'deckB'][effectId],
          isActive: false
        }
      }
    }))
    
    console.log(`⏹️ Stopped effect ${effectId} on deck ${deck}`)
    
    // Process audio effects after stopping
    get().processAudioEffects(deck)
    
    // Stop Spotify effects and reapply remaining ones
    import('./spotifyStore').then(({ useSpotifyStore }) => {
      const spotifyStore = useSpotifyStore.getState()
      const { player } = spotifyStore
      
      if (player) {
        stopSpotifyEffects(player)
        // Reapply remaining active effects
        get().updateSpotifyEffects(deck)
      }
    })
  },
  
  stopAllEffects: (deck: 'A' | 'B') => {
    const state = get()
    const deckEffects = state[deck === 'A' ? 'deckA' : 'deckB']
    
    Object.keys(deckEffects).forEach(effectId => {
      get().stopEffect(deck, effectId)
    })
    
    // Also stop Spotify effects
    import('./spotifyStore').then(({ useSpotifyStore }) => {
      const spotifyStore = useSpotifyStore.getState()
      const { player } = spotifyStore
      
      if (player) {
        stopSpotifyEffects(player)
      }
    })
    
    console.log(`🛑 Stopped all effects on deck ${deck}`)
  },
  
  getEffectPresets: () => defaultEffectPresets,
  
  applyPreset: (deck: 'A' | 'B', effectType: EffectType) => {
    const preset = defaultEffectPresets[effectType]
    get().addEffect(deck, preset)
  },

  processAudioEffects: (deck: 'A' | 'B') => {
    // Import audio store dynamically to avoid circular dependency
    import('./audioStore').then(({ useAudioStore }) => {
      const audioStore = useAudioStore.getState()
      audioStore.processEffects(deck)
    }).catch((error) => {
      console.error('Failed to process audio effects:', error)
    })
  },

  updateSpotifyEffects: (deck: 'A' | 'B') => {
    // Get Spotify player from Spotify store
    import('./spotifyStore').then(({ useSpotifyStore }) => {
      const spotifyStore = useSpotifyStore.getState()
      const { player } = spotifyStore
      
      if (player) {
        const state = get()
        const deckEffects = deck === 'A' ? state.deckA : state.deckB
        
        // Apply active effects directly to Spotify player
        Object.values(deckEffects).forEach((effect) => {
          if (effect.isActive) {
            console.log(`🎵 Applying ${effect.name} to Spotify player`)
            applySpotifyEffect(player, effect)
          }
        })
        
        console.log(`🎵 Updated Spotify effects for deck ${deck}`)
      } else {
        console.warn('Spotify player not available for effects')
      }
    }).catch((error) => {
      console.error('Failed to update Spotify effects:', error)
    })
  }
}))

// Export effect presets for easy access
export const EFFECT_PRESETS = defaultEffectPresets
