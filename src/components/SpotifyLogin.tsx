import React from 'react'
import { LogIn, Music, Play } from 'lucide-react'
import { Button } from './ui/button'
import { useSpotifyStore } from '../stores/spotifyStore'
import { PremiumStatus } from './PremiumStatus'

export const SpotifyLogin: React.FC = () => {
  const { login, isAuthenticated, user, isPremium, isPlayerReady, initializePlayer } = useSpotifyStore()

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {user.images?.[0] && (
            <img 
              src={user.images[0].url} 
              alt={user.display_name}
              className="w-8 h-8 rounded-full border-2 border-emerald-500/30"
            />
          )}
          <div className="text-sm">
            <p className="text-white font-medium">{user.display_name}</p>
            <PremiumStatus variant="inline" className="text-xs" />
          </div>
        </div>
        
        {/* Show player initialization button for Premium users */}
        {isPremium() && !isPlayerReady && (
          <Button
            onClick={() => initializePlayer()}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="w-4 h-4 mr-1" />
            Enable Player
          </Button>
        )}
        
        {/* Show player status for Premium users */}
        {isPremium() && isPlayerReady && (
          <div className="text-xs text-emerald-400 font-medium">
            ✅ Player Ready
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="text-center space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-center">
          <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-full border border-emerald-500/30">
            <Music className="w-12 h-12 text-emerald-400" />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect to Spotify</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Access millions of tracks and create professional DJ mixes with Spotify integration.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Button
          onClick={login}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-6 px-8 rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all duration-200"
          size="lg"
        >
          <LogIn className="w-5 h-5 mr-3" />
          Login with Spotify
        </Button>

        <div className="text-xs text-muted-foreground/60 space-y-1">
          <p>• Spotify Premium required for full track playback</p>
          <p>• Free accounts can use 30-second previews</p>
          <p>• Your data stays private and secure</p>
        </div>
      </div>
    </div>
  )
}
