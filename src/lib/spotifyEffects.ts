import { Effect } from '../stores/effectsStore'

// Spotify Effects Manager
// Since we can't directly access Spotify's audio stream, we'll use the Spotify Web Playback SDK's built-in effects
// and simulate additional effects through volume and playback control

export class SpotifyEffectsManager {
  private spotifyPlayer: any = null
  private activeEffects: Map<string, Effect> = new Map()
  private effectIntervals: Map<string, number> = new Map()

  constructor(spotifyPlayer: any) {
    this.spotifyPlayer = spotifyPlayer
  }

  // Apply effect to Spotify player
  applyEffect(effect: Effect): void {
    const { type, isActive } = effect
    
    if (!isActive) return

    console.log(`🎵 Applying ${type} effect to Spotify player`)

    switch (type) {
      case 'beatRepeat':
        this.applyBeatRepeat(effect)
        break
      case 'lowPassFilter':
        this.applyLowPassFilter(effect)
        break
      case 'echo':
        this.applyEcho(effect)
        break
      case 'reverse':
        this.applyReverse(effect)
        break
      case 'vinylBrake':
        this.applyVinylBrake(effect)
        break
    }
  }

  // Beat Repeat Effect
  private applyBeatRepeat(effect: Effect): void {
    if (!this.spotifyPlayer) return

    const { intensity, rate } = effect
    const beatInterval = 1000 / (0.5 + (rate / 100) * 1.5) // 0.5 to 2.0 Hz
    
    const beatRepeatInterval = setInterval(() => {
      if (effect.isActive) {
        // Simulate beat repeat by briefly pausing and resuming
        this.spotifyPlayer.pause().then(() => {
          setTimeout(() => {
            this.spotifyPlayer.resume()
          }, 50 * (intensity / 100)) // 0-50ms pause based on intensity
        })
      }
    }, beatInterval)

    this.effectIntervals.set(effect.id, beatRepeatInterval)
  }

  // Low Pass Filter Effect (simulated with volume modulation)
  private applyLowPassFilter(effect: Effect): void {
    if (!this.spotifyPlayer) return

    const { intensity } = effect
    const baseVolume = 0.8
    const filterIntensity = intensity / 100
    
    // Simulate low pass by reducing volume and adding slight tremolo
    const filterInterval = setInterval(() => {
      if (effect.isActive) {
        const tremolo = Math.sin(Date.now() * 0.01) * 0.1 * filterIntensity
        const volume = baseVolume * (1 - filterIntensity * 0.5) + tremolo
        this.spotifyPlayer.setVolume(Math.max(0, Math.min(1, volume)))
      }
    }, 50)

    this.effectIntervals.set(effect.id, filterInterval)
  }

  // Echo Effect (simulated with volume modulation)
  private applyEcho(effect: Effect): void {
    if (!this.spotifyPlayer) return

    const { intensity, rate, mix } = effect
    const echoDelay = 100 + (rate / 100) * 400 // 100-500ms delay
    const echoIntensity = (intensity / 100) * 0.3
    const wetLevel = mix / 100

    const echoInterval = setInterval(() => {
      if (effect.isActive) {
        // Create echo by briefly reducing volume then restoring
        const originalVolume = 0.8
        this.spotifyPlayer.setVolume(originalVolume * (1 - wetLevel))
        
        setTimeout(() => {
          this.spotifyPlayer.setVolume(originalVolume * (1 - wetLevel + echoIntensity))
        }, echoDelay / 4)
        
        setTimeout(() => {
          this.spotifyPlayer.setVolume(originalVolume)
        }, echoDelay / 2)
      }
    }, echoDelay)

    this.effectIntervals.set(effect.id, echoInterval)
  }

  // Reverse Effect (simulated with seek manipulation)
  private applyReverse(effect: Effect): void {
    if (!this.spotifyPlayer) return

    const { intensity } = effect
    const reverseIntensity = intensity / 100

    // Get current position and create reverse effect
    this.spotifyPlayer.getCurrentState().then((state: any) => {
      if (state && effect.isActive) {
        const currentPosition = state.position
        const reverseDuration = 2000 * reverseIntensity // 0-2 seconds
        
        // Simulate reverse by seeking backwards
        const reverseInterval = setInterval(() => {
          if (effect.isActive) {
            this.spotifyPlayer.seek(currentPosition - (Date.now() % reverseDuration))
          }
        }, 100)

        this.effectIntervals.set(effect.id, reverseInterval)
      }
    })
  }

  // Vinyl Brake Effect
  private applyVinylBrake(effect: Effect): void {
    if (!this.spotifyPlayer) return

    const { intensity } = effect
    const brakeIntensity = intensity / 100
    const brakeDuration = 1500 // 1.5 seconds

    // Simulate vinyl brake by rapidly reducing volume
    const brakeInterval = setInterval(() => {
      if (effect.isActive) {
        const elapsed = Date.now() % brakeDuration
        const progress = elapsed / brakeDuration
        const volume = 0.8 * (1 - progress * brakeIntensity)
        this.spotifyPlayer.setVolume(Math.max(0, volume))
      }
    }, 50)

    this.effectIntervals.set(effect.id, brakeInterval)

    // Auto-stop after duration
    setTimeout(() => {
      this.stopEffect(effect.id)
    }, brakeDuration)
  }

  // Stop specific effect
  stopEffect(effectId: string): void {
    const interval = this.effectIntervals.get(effectId)
    if (interval) {
      clearInterval(interval)
      this.effectIntervals.delete(effectId)
    }
    this.activeEffects.delete(effectId)
    
    // Restore normal volume
    if (this.spotifyPlayer) {
      this.spotifyPlayer.setVolume(0.8)
    }
    
    console.log(`⏹️ Stopped effect ${effectId}`)
  }

  // Stop all effects
  stopAllEffects(): void {
    this.effectIntervals.forEach((interval) => {
      clearInterval(interval)
    })
    this.effectIntervals.clear()
    this.activeEffects.clear()
    
    // Restore normal volume
    if (this.spotifyPlayer) {
      this.spotifyPlayer.setVolume(0.8)
    }
    
    console.log('🛑 Stopped all effects')
  }

  // Update effect
  updateEffect(effect: Effect): void {
    this.stopEffect(effect.id)
    if (effect.isActive) {
      this.applyEffect(effect)
    }
  }

  // Clean up
  cleanup(): void {
    this.stopAllEffects()
  }
}

// Global effects manager instance
let spotifyEffectsManager: SpotifyEffectsManager | null = null

export const getSpotifyEffectsManager = (spotifyPlayer: any): SpotifyEffectsManager => {
  if (!spotifyEffectsManager) {
    spotifyEffectsManager = new SpotifyEffectsManager(spotifyPlayer)
  }
  return spotifyEffectsManager
}

export const cleanupSpotifyEffectsManager = (): void => {
  if (spotifyEffectsManager) {
    spotifyEffectsManager.cleanup()
    spotifyEffectsManager = null
  }
}
