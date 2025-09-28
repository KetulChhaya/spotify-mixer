import React, { useEffect, useState } from 'react'
import { Disc3, Volume2, Music2, LogOut } from 'lucide-react'
import { DeckPanel } from './DeckPanel'
import { Crossfader } from './Crossfader'
import { AutoCrossfade } from './AutoCrossfade'
import { SpotifyLogin } from './SpotifyLogin'
import { SpotifyBrowser } from './SpotifyBrowser'
import { useAudioStore } from '../stores/audioStore'
import { useSpotifyStore, handleSpotifyCallback, SpotifyTrack } from '../stores/spotifyStore'
import { Separator } from './ui/separator'
import { TooltipProvider } from './ui/tooltip'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'

export const SpotifyMusixer: React.FC = () => {
  const { initAudio, cleanup, loadSpotifyTrack } = useAudioStore()
  const { isAuthenticated, logout, initializeAuth } = useSpotifyStore()
  
  const [isSpotifyDialogOpen, setIsSpotifyDialogOpen] = useState(false)
  const [selectedDeck, setSelectedDeck] = useState<'A' | 'B' | undefined>()


  // Initialize audio on mount and cleanup on unmount
  useEffect(() => {
    initAudio()
    return () => cleanup()
  }, [initAudio, cleanup])

  // Initialize Spotify auth on mount
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Handle Spotify OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('code')) {
      handleSpotifyCallback()
    }
  }, [])

  // Debug Spotify SDK loading
  useEffect(() => {
    const checkSDK = () => {
      console.log('🔍 Spotify SDK Status:', {
        sdkLoaded: !!window.Spotify,
        readyCallback: !!window.onSpotifyWebPlaybackSDKReady
      })
    }
    
    checkSDK()
    
    // Check again after a delay
    const timer = setTimeout(checkSDK, 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleSpotifyTrackSelect = async (track: SpotifyTrack, deck?: 'A' | 'B', startTimeMs: number = 0) => {
    try {
      if (deck) {
        await loadSpotifyTrack(deck, track, startTimeMs)
        setIsSpotifyDialogOpen(false)
        console.log(`Successfully loaded ${track.name} to deck ${deck} @ ${startTimeMs}ms`)
      }
    } catch (error) {
      console.error('Failed to load Spotify track:', error)
    }
  }

  const openSpotifyBrowser = (deck?: 'A' | 'B') => {
    setSelectedDeck(deck)
    setIsSpotifyDialogOpen(true)
  }


  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Subtle background pattern */}
        {/* <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0),
              radial-gradient(circle at 75px 75px, rgba(255,255,255,0.05) 1px, transparent 0)
            `,
            backgroundSize: '100px 100px'
          }} />
        </div> */}

        {/* Header */}
        <header className="relative">
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5" />
          
          {/* Main header content */}
          <div className="relative border-b border-white/[0.08] backdrop-blur-xl bg-slate-950/40">
            <div className="max-w-7xl mx-auto px-6 py-6 lg:py-8">
              <div className="flex items-center justify-between">
                
                {/* Left - Spotify Browse Section */}
                <div className="flex items-center space-x-3">
                  {/* Spotify Browse Button */}
                  {isAuthenticated ? (
                    <Button
                      onClick={() => openSpotifyBrowser()}
                      variant="glass"
                      size="sm"
                      className="group relative overflow-hidden bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 hover:border-emerald-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-blue-500/0 group-hover:from-emerald-500/10 group-hover:to-blue-500/10 transition-all duration-300" />
                      <div className="relative flex items-center space-x-2">
                        <Music2 className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-200" />
                        <span className="text-sm font-medium">Browse</span>
                      </div>
                    </Button>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="glass" 
                          size="sm"
                          className="group relative overflow-hidden bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 hover:border-emerald-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-blue-500/0 group-hover:from-emerald-500/10 group-hover:to-blue-500/10 transition-all duration-300" />
                          <div className="relative flex items-center space-x-2">
                            <Music2 className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-200" />
                            <span className="text-sm font-medium">Connect</span>
                          </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <SpotifyLogin />
                      </DialogContent>
                    </Dialog>
                  )}

                </div>

                {/* Center - Logo */}
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300" />
                    <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 backdrop-blur-sm group-hover:border-white/20 transition-all duration-300">
                      <Disc3 className="w-8 h-8 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300 group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h1 className="text-3xl lg:text-4xl font-light tracking-tight">
                      <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent animate-pulse">
                        Spotify
                      </span>
                      <span className="text-white/60 mx-3">•</span>
                      <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400 bg-clip-text text-transparent animate-pulse" style={{ animationDelay: '0.5s' }}>
                        Mixer
                      </span>
                    </h1>
                    <p className="text-xs lg:text-sm text-slate-400 font-light tracking-wider mt-1 opacity-80">
                      Professional DJ Console
                    </p>
                  </div>
                </div>

                {/* Right - User Info & Actions */}
                <div className="flex items-center space-x-3">
                  {isAuthenticated && (
                    <>
                      <SpotifyLogin />
                      <Button
                        onClick={logout}
                        variant="ghost"
                        size="sm"
                        className="group relative p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 hover:scale-105"
                      >
                        <LogOut className="w-4 h-4" />
                        <div className="absolute inset-0 rounded-md bg-red-500/0 group-hover:bg-red-500/5 transition-colors duration-200" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Deck A */}
            <div className="lg:col-span-1">
              <div className="card-deck">
                <div className="p-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h2 className="text-lg font-light tracking-wider text-gradient-deck-a">
                        DECK A
                      </h2>
                    </div>
                  </div>
                  <Separator className="mb-4 bg-emerald-500/20" />
                  <DeckPanel 
                    deck="A" 
                    onSpotifyClick={() => openSpotifyBrowser('A')}
                  />
                </div>
              </div>
            </div>

            {/* Center - Crossfader */}
            <div className="lg:col-span-1">
              <div className="card-deck">
                <div className="p-4 flex flex-col">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center space-x-3">
                      <Volume2 className="w-5 h-5 text-muted-foreground" />
                      <h2 className="text-lg font-light tracking-wider text-white">
                        MIXER
                      </h2>
                    </div>
                  </div>
                  <Separator className="mb-4 bg-white/10" />
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <Crossfader />
                    <AutoCrossfade />
                  </div>
                </div>
              </div>
            </div>

            {/* Deck B */}
            <div className="lg:col-span-1">
              <div className="card-deck">
                <div className="p-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <h2 className="text-lg font-light tracking-wider text-gradient-deck-b">
                        DECK B
                      </h2>
                    </div>
                  </div>
                  <Separator className="mb-4 bg-blue-500/20" />
                  <DeckPanel 
                    deck="B" 
                    onSpotifyClick={() => openSpotifyBrowser('B')}
                  />
                </div>
              </div>
            </div>

          </div>
        </main>

        {/* Footer - Subtle branding */}
        {/* <footer className="relative border-t border-white/[0.05] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-light">
                Built with Web Audio API • Modern DJ Console
              </p>
            </div>
          </div>
        </footer> */}

        {/* Spotify Browser Dialog */}
        <Dialog open={isSpotifyDialogOpen} onOpenChange={setIsSpotifyDialogOpen}>
          <DialogContent className="sm:max-w-4xl h-[65vh]">
           
            <SpotifyBrowser 
              onTrackSelect={handleSpotifyTrackSelect}
              selectedDeck={selectedDeck}
            />
          </DialogContent>
        </Dialog>


      </div>
    </TooltipProvider>
  )
}

export default SpotifyMusixer