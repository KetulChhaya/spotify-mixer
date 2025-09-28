import { Effect } from '../stores/effectsStore'

export class AudioEffectsProcessor {
  private audioContext: AudioContext
  private gainNode: GainNode
  private effectsNodes: Map<string, AudioNode> = new Map()
  private isInitialized = false

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.gainNode = audioContext.createGain()
    this.gainNode.connect(audioContext.destination)
  }

  initialize() {
    if (this.isInitialized) return
    this.isInitialized = true
    console.log('🎛️ Audio Effects Processor initialized')
  }

  // Create effect nodes based on effect type
  createEffectNode(effect: Effect): AudioNode | null {
    const { type, intensity, rate, mix } = effect
    
    switch (type) {
      case 'beatRepeat':
        return this.createBeatRepeatNode(intensity, rate)
      case 'lowPassFilter':
        return this.createLowPassFilterNode(intensity)
      case 'echo':
        return this.createEchoNode(intensity, rate, mix)
      case 'reverse':
        return this.createReverseNode(intensity)
      case 'vinylBrake':
        return this.createVinylBrakeNode(intensity)
      default:
        return null
    }
  }

  // Beat Repeat Effect
  private createBeatRepeatNode(intensity: number, rate: number): AudioNode {
    const gainNode = this.audioContext.createGain()
    const oscillator = this.audioContext.createOscillator()
    const lfo = this.audioContext.createGain()
    
    // Beat repeat timing (1/4, 1/8, 1/16 notes)
    const beatRate = 0.5 + (rate / 100) * 1.5 // 0.5 to 2.0 Hz
    oscillator.frequency.setValueAtTime(beatRate, this.audioContext.currentTime)
    oscillator.type = 'square'
    
    // Intensity controls the gate effect
    const gateIntensity = intensity / 100
    lfo.gain.setValueAtTime(gateIntensity, this.audioContext.currentTime)
    
    oscillator.connect(lfo)
    lfo.connect(gainNode.gain)
    
    oscillator.start()
    
    return gainNode
  }

  // Low Pass Filter Effect
  private createLowPassFilterNode(intensity: number): AudioNode {
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    
    // Intensity controls cutoff frequency
    const cutoffFreq = 200 + (intensity / 100) * 1800 // 200Hz to 2000Hz
    filter.frequency.setValueAtTime(cutoffFreq, this.audioContext.currentTime)
    filter.Q.setValueAtTime(1, this.audioContext.currentTime)
    
    return filter
  }

  // Echo Effect
  private createEchoNode(intensity: number, rate: number, mix: number): AudioNode {
    const input = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    const delay = this.audioContext.createDelay(2) // Max 2 second delay
    const feedback = this.audioContext.createGain()
    const wetGain = this.audioContext.createGain()
    const dryGain = this.audioContext.createGain()
    
    // Echo timing based on rate
    const delayTime = 0.1 + (rate / 100) * 0.9 // 0.1 to 1.0 seconds
    delay.delayTime.setValueAtTime(delayTime, this.audioContext.currentTime)
    
    // Feedback based on intensity
    const feedbackAmount = (intensity / 100) * 0.8 // 0 to 0.8
    feedback.gain.setValueAtTime(feedbackAmount, this.audioContext.currentTime)
    
    // Wet/Dry mix
    const wetLevel = mix / 100
    const dryLevel = 1 - wetLevel
    wetGain.gain.setValueAtTime(wetLevel, this.audioContext.currentTime)
    dryGain.gain.setValueAtTime(dryLevel, this.audioContext.currentTime)
    
    // Connect the echo chain
    input.connect(delay)
    input.connect(dryGain)
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wetGain)
    dryGain.connect(output)
    wetGain.connect(output)
    
    return { input, output } as any
  }

  // Reverse Effect (simulated with phase inversion)
  private createReverseNode(intensity: number): AudioNode {
    const gainNode = this.audioContext.createGain()
    const oscillator = this.audioContext.createOscillator()
    const lfo = this.audioContext.createGain()
    
    // Reverse effect with phase modulation
    oscillator.frequency.setValueAtTime(0.5, this.audioContext.currentTime)
    oscillator.type = 'sawtooth'
    
    const reverseIntensity = intensity / 100
    lfo.gain.setValueAtTime(reverseIntensity, this.audioContext.currentTime)
    
    oscillator.connect(lfo)
    lfo.connect(gainNode.gain)
    
    oscillator.start()
    
    return gainNode
  }

  // Vinyl Brake Effect
  private createVinylBrakeNode(intensity: number): AudioNode {
    const gainNode = this.audioContext.createGain()
    const oscillator = this.audioContext.createOscillator()
    const lfo = this.audioContext.createGain()
    
    // Vinyl brake with decreasing frequency
    oscillator.frequency.setValueAtTime(1, this.audioContext.currentTime)
    oscillator.type = 'sine'
    
    const brakeIntensity = intensity / 100
    lfo.gain.setValueAtTime(brakeIntensity, this.audioContext.currentTime)
    
    // Exponential decay for brake effect
    oscillator.frequency.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + 1.5)
    
    oscillator.connect(lfo)
    lfo.connect(gainNode.gain)
    
    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + 1.5)
    
    return gainNode
  }

  // Apply effect to audio stream
  applyEffect(effectId: string, effect: Effect, audioSource: AudioNode): void {
    const effectNode = this.createEffectNode(effect)
    if (!effectNode) return

    // Store the effect node
    this.effectsNodes.set(effectId, effectNode)
    
    // Connect audio source through effect to output
    audioSource.disconnect()
    audioSource.connect(effectNode)
    
    if ('output' in effectNode && effectNode.output) {
      (effectNode.output as AudioNode).connect(this.gainNode)
    } else {
      effectNode.connect(this.gainNode)
    }
    
    console.log(`🎵 Applied ${effect.name} effect (${effect.mode})`)
  }

  // Remove effect from audio stream
  removeEffect(effectId: string, audioSource: AudioNode): void {
    const effectNode = this.effectsNodes.get(effectId)
    if (!effectNode) return

    // Disconnect and clean up
    audioSource.disconnect()
    effectNode.disconnect()
    
    // Reconnect source directly to output
    audioSource.connect(this.gainNode)
    
    this.effectsNodes.delete(effectId)
    console.log(`🗑️ Removed effect ${effectId}`)
  }

  // Update effect parameters in real-time
  updateEffect(effectId: string, effect: Effect, audioSource: AudioNode): void {
    // Remove old effect and apply new one
    this.removeEffect(effectId, audioSource)
    this.applyEffect(effectId, effect, audioSource)
  }

  // Stop all effects
  stopAllEffects(audioSource: AudioNode): void {
    // Disconnect all effects
    this.effectsNodes.forEach((effectNode) => {
      effectNode.disconnect()
    })
    this.effectsNodes.clear()
    
    // Reconnect source directly
    audioSource.disconnect()
    audioSource.connect(this.gainNode)
    
    console.log('🛑 Stopped all effects')
  }

  // Clean up
  cleanup(): void {
    this.stopAllEffects(this.gainNode)
    this.gainNode.disconnect()
    this.isInitialized = false
  }
}

// Global effects processor instance
let effectsProcessor: AudioEffectsProcessor | null = null

export const getEffectsProcessor = (audioContext: AudioContext): AudioEffectsProcessor => {
  if (!effectsProcessor) {
    effectsProcessor = new AudioEffectsProcessor(audioContext)
    effectsProcessor.initialize()
  }
  return effectsProcessor
}

export const cleanupEffectsProcessor = (): void => {
  if (effectsProcessor) {
    effectsProcessor.cleanup()
    effectsProcessor = null
  }
}
