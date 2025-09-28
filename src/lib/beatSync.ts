/**
 * Beat Sync System for DJ Mixer
 * Provides rhythmic beat effects during track transitions
 */

export interface BeatSyncOptions {
  duration: number        // Duration in milliseconds
  bpm: number           // Beats per minute
  intensity: number     // Effect intensity (0-1)
  deck: 'A' | 'B'       // Target deck
}

export class BeatSyncManager {
  private activeBeatSync: Map<string, number> = new Map()
  private audioContext: AudioContext | null = null

  constructor() {
    // Initialize audio context when needed
    this.audioContext = null
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  /**
   * Start beat sync effect for track transition
   */
  startBeatSync(options: BeatSyncOptions): void {
    const { duration, bpm, intensity, deck } = options
    const effectId = `beat-sync-${deck}-${Date.now()}`
    
    console.log(`🎵 Starting beat sync for deck ${deck}: ${bpm} BPM for ${duration}ms`)

    // Clear any existing beat sync for this deck
    this.stopBeatSync(deck)

    // Calculate beat interval
    const beatInterval = (60 / bpm) * 1000 // Convert BPM to milliseconds
    const totalBeats = Math.floor(duration / beatInterval)
    
    let beatCount = 0

    const createBeat = () => {
      if (beatCount >= totalBeats) {
        this.stopBeatSync(deck)
        return
      }

      // Create visual beat effect
      this.createVisualBeat(deck, intensity)
      
      // Create audio beat effect (subtle)
      this.createAudioBeat(intensity)

      beatCount++
      
      // Schedule next beat
      const nextBeatTime = beatInterval
      const timeoutId = setTimeout(createBeat, nextBeatTime)
      this.activeBeatSync.set(effectId, timeoutId)
    }

    // Start the first beat
    createBeat()
  }

  /**
   * Stop beat sync for specific deck
   */
  stopBeatSync(deck: 'A' | 'B'): void {
    const keysToDelete: string[] = []
    
    this.activeBeatSync.forEach((timeoutId, effectId) => {
      if (effectId.includes(`deck-${deck}`) || effectId.includes(`-${deck}-`)) {
        clearTimeout(timeoutId)
        keysToDelete.push(effectId)
      }
    })

    keysToDelete.forEach(key => this.activeBeatSync.delete(key))
  }

  /**
   * Stop all beat sync effects
   */
  stopAllBeatSync(): void {
    this.activeBeatSync.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.activeBeatSync.clear()
  }

  /**
   * Create visual beat effect
   */
  private createVisualBeat(deck: 'A' | 'B', intensity: number): void {
    // Create a visual beat indicator
    const beatElement = document.createElement('div')
    beatElement.className = `beat-indicator beat-${deck}`
    beatElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: ${deck === 'A' ? '25%' : '75%'};
      transform: translate(-50%, -50%);
      width: ${20 + intensity * 30}px;
      height: ${20 + intensity * 30}px;
      background: ${deck === 'A' ? 'radial-gradient(circle, #10b981, #059669)' : 'radial-gradient(circle, #3b82f6, #2563eb)'};
      border-radius: 50%;
      opacity: 0.8;
      z-index: 1000;
      pointer-events: none;
      animation: beatPulse 0.2s ease-out;
    `

    // Add CSS animation if not already added
    if (!document.getElementById('beat-sync-styles')) {
      const style = document.createElement('style')
      style.id = 'beat-sync-styles'
      style.textContent = `
        @keyframes beatPulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        .beat-indicator {
          box-shadow: 0 0 20px currentColor;
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(beatElement)

    // Remove element after animation
    setTimeout(() => {
      if (beatElement.parentNode) {
        beatElement.parentNode.removeChild(beatElement)
      }
    }, 200)
  }

  /**
   * Create subtle audio beat effect
   */
  private createAudioBeat(intensity: number): void {
    try {
      const audioContext = this.getAudioContext()
      
      // Create a subtle click sound
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Configure the beat sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(intensity * 0.1, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      console.warn('Could not create audio beat effect:', error)
    }
  }

  /**
   * Get estimated BPM for a track (placeholder - would need actual BPM detection)
   */
  getEstimatedBPM(trackTitle: string, _artist: string): number {
    // This is a simplified BPM estimation
    // In a real implementation, you'd use audio analysis or a BPM database
    
    const title = trackTitle.toLowerCase()
    
    // Common BPM ranges for different genres
    if (title.includes('house') || title.includes('techno') || title.includes('edm')) {
      return 128 // Typical house/techno BPM
    }
    if (title.includes('drum') || title.includes('bass') || title.includes('dubstep')) {
      return 140 // Typical drum & bass BPM
    }
    if (title.includes('hip') || title.includes('rap') || title.includes('trap')) {
      return 85 // Typical hip-hop BPM
    }
    if (title.includes('pop') || title.includes('dance')) {
      return 120 // Typical pop/dance BPM
    }
    
    // Default to 120 BPM (common dance tempo)
    return 120
  }
}

// Export singleton instance
export const beatSyncManager = new BeatSyncManager()
