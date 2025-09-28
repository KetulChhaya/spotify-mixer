import React, { useState } from 'react'
import { 
  RotateCcw, 
  Filter, 
  Volume2, 
  RotateCw, 
  Square, 
  Play, 
  Pause,
  Plus,
  Repeat,
  Square as StopIcon
} from 'lucide-react'
import { Button } from './ui/button'
import { useEffectsStore, EffectType } from '../stores/effectsStore'
import { cn } from '../lib/utils'

interface EffectsPanelProps {
  deck: 'A' | 'B'
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({ deck }) => {
  const [showAddEffect, setShowAddEffect] = useState(false)
  
  const {
    deckA,
    deckB,
    removeEffect,
    updateEffect,
    triggerEffect,
    stopAllEffects,
    getEffectPresets,
    applyPreset
  } = useEffectsStore()
  
  const currentDeckEffects = deck === 'A' ? deckA : deckB
  const effects = Object.values(currentDeckEffects)
  const presets = getEffectPresets()
  
  const getEffectIcon = (type: EffectType) => {
    switch (type) {
      case 'beatRepeat': return <RotateCcw className="w-4 h-4" />
      case 'lowPassFilter': return <Filter className="w-4 h-4" />
      case 'echo': return <Volume2 className="w-4 h-4" />
      case 'reverse': return <RotateCw className="w-4 h-4" />
      case 'vinylBrake': return <Square className="w-4 h-4" />
      default: return <Square className="w-4 h-4" />
    }
  }
  
  const getEffectColor = (type: EffectType) => {
    switch (type) {
      case 'beatRepeat': return 'text-orange-400'
      case 'lowPassFilter': return 'text-blue-400'
      case 'echo': return 'text-purple-400'
      case 'reverse': return 'text-red-400'
      case 'vinylBrake': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }
  
  const handleAddEffect = (effectType: EffectType) => {
    applyPreset(deck, effectType)
    setShowAddEffect(false)
  }
  
  const handleEffectTrigger = (effectId: string) => {
    const effect = currentDeckEffects[effectId]
    console.log(`🎛️ Triggering effect ${effect.name} on deck ${deck}`, effect)
    
    if (effect.mode === 'momentary') {
      triggerEffect(deck, effectId)
    } else {
      triggerEffect(deck, effectId)
    }
  }
  
  
  const toggleMode = (effectId: string) => {
    const effect = currentDeckEffects[effectId]
    const newMode = effect.mode === 'single' ? 'loop' : 'single'
    updateEffect(deck, effectId, { mode: newMode })
  }
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Effects</h3>
        <div className="flex items-center space-x-1">
          <Button
            onClick={() => setShowAddEffect(!showAddEffect)}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-white/10"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => stopAllEffects(deck)}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-400"
          >
            <StopIcon className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Add Effect Menu */}
      {showAddEffect && (
        <div className="grid grid-cols-2 gap-1 p-2 bg-white/5 rounded border border-white/10">
          {Object.entries(presets).map(([type, preset]) => (
            <Button
              key={type}
              onClick={() => handleAddEffect(type as EffectType)}
              size="sm"
              variant="ghost"
              className="h-7 text-xs justify-start hover:bg-white/10"
            >
              {getEffectIcon(type as EffectType)}
              <span className="ml-1">{preset.name}</span>
            </Button>
          ))}
        </div>
      )}
      
      {/* Effects List - Simplified */}
      <div className="space-y-1">
        {effects.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground">No effects</p>
          </div>
        ) : (
          effects.map((effect) => (
            <div
              key={effect.id}
              className={cn(
                "flex items-center justify-between p-2 rounded border transition-all",
                effect.isActive 
                  ? "border-emerald-500/50 bg-emerald-500/10" 
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              )}
            >
              {/* Effect Info */}
              <div className="flex items-center space-x-2">
                <div className={cn("p-1 rounded", getEffectColor(effect.type))}>
                  {getEffectIcon(effect.type)}
                </div>
                <span className="text-xs font-medium text-white">{effect.name}</span>
              </div>
              
              {/* Controls */}
              <div className="flex items-center space-x-1">
                {/* Once/Loop Toggle */}
                <Button
                  onClick={() => toggleMode(effect.id)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-white/10"
                >
                  {effect.mode === 'loop' ? (
                    <Repeat className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Square className="w-3 h-3 text-gray-400" />
                  )}
                </Button>
                
                {/* Play/Stop Button */}
                <Button
                  onClick={() => handleEffectTrigger(effect.id)}
                  size="sm"
                  variant="ghost"
                  className={cn(
                        "h-6 w-6 p-0",
                        effect.isActive 
                          ? "hover:bg-red-500/20 text-red-400" 
                          : "hover:bg-emerald-500/20 text-emerald-400"
                      )}
                >
                  {effect.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
                
                {/* Remove Button */}
                <Button
                  onClick={() => removeEffect(deck, effect.id)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-400"
                >
                  <StopIcon className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
