import React, { useState, useEffect, useCallback } from 'react'
import { Search, Play, Plus, Clock, Heart, Music, ArrowLeft, List } from 'lucide-react'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useSpotifyStore, SpotifyTrack } from '../stores/spotifyStore'
import { formatTime } from '../lib/utils'

interface SpotifyBrowserProps {
  onTrackSelect: (track: SpotifyTrack, deck?: 'A' | 'B', startTimeMs?: number) => void
  selectedDeck?: 'A' | 'B'
}

export const SpotifyBrowser: React.FC<SpotifyBrowserProps> = ({ 
  onTrackSelect, 
  selectedDeck
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null)
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([])
  const [playlistLoading, setPlaylistLoading] = useState(false)
  
  const {
    searchResults,
    playlists,
    searchLoading,
    searchTracks,
    getUserPlaylists,
    getPlaylistTracks,
  } = useSpotifyStore()

  useEffect(() => {
    // Load user playlists on mount
    getUserPlaylists()
  }, [getUserPlaylists])

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: number
      return (query: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (query.trim()) {
            searchTracks(query)
          }
        }, 1000)
      }
    })(),
    [searchTracks]
  )

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    debouncedSearch(value)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      searchTracks(searchQuery)
    }
  }

  const handleTrackSelect = (track: SpotifyTrack, startTimeMs: number = 0) => {
    setSelectedTrack(track)
    if (selectedDeck) {
      onTrackSelect(track, selectedDeck, startTimeMs)
    }
  }

  // Handle playlist selection and load tracks
  const handlePlaylistSelect = async (playlist: any) => {
    setPlaylistLoading(true)
    setSelectedPlaylist(playlist)
    try {
      const tracks = await getPlaylistTracks(playlist.id)
      setPlaylistTracks(tracks)
    } catch (error) {
      console.error('Failed to load playlist tracks:', error)
    } finally {
      setPlaylistLoading(false)
    }
  }

  // Go back to playlists view
  const handleBackToPlaylists = () => {
    setSelectedPlaylist(null)
    setPlaylistTracks([])
  }

  const TrackItem: React.FC<{ track: SpotifyTrack; showAddButton?: boolean }> = ({ 
    track, 
    showAddButton = true 
  }) => (
    <div 
      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
      onClick={() => handleTrackSelect(track)}
    >
      <div className="flex-shrink-0">
        {track.album.images[0] ? (
          <img 
            src={track.album.images[0].url} 
            alt={track.album.name}
            className="w-12 h-12 rounded-md"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-md flex items-center justify-center">
            <Music className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{track.name}</p>
        <p className="text-muted-foreground text-sm truncate">
          {track.artists.map(artist => artist.name).join(', ')}
        </p>
        <p className="text-muted-foreground/60 text-xs truncate">
          {track.album.name}
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          {formatTime(track.duration_ms / 1000)}
        </div>
        
        {showAddButton && selectedDeck && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="glass"
              onClick={(e) => {
                e.stopPropagation()
                onTrackSelect(track, selectedDeck)
              }}
              className="h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {showAddButton && !selectedDeck && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="glass"
                onClick={(e) => {
                  e.stopPropagation()
                  onTrackSelect(track, 'A')
                }}
                className="h-8 px-2 text-xs"
              >
                A
              </Button>
              <Button
                size="sm"
                variant="glass"
                onClick={(e) => {
                  e.stopPropagation()
                  onTrackSelect(track, 'B')
                }}
                className="h-8 px-2 text-xs"
              >
                B
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-auto flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-white/10">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tracks, artists, albums... (2s debounce)"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <Button 
            type="submit" 
            disabled={!searchQuery.trim() || searchLoading}
            className="w-full"
            variant="glass"
          >
            {searchLoading ? 'Searching...' : 'Search Spotify'}
          </Button>
        </form>
      </div>

      {/* Content Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="search" className="h-full flex flex-col">
          <TabsList className="grid w-auto grid-cols-2 mx-4 mt-4 bg-slate-800/50 border border-white/10 h-10">
            <TabsTrigger 
              value="search" 
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 text-sm px-2 py-1 truncate"
            >
              Search
            </TabsTrigger>
            <TabsTrigger 
              value="playlists"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 text-sm px-2 py-1 truncate"
            >
              Playlists
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="flex-1 overflow-hidden p-4 w-auto">
            <div className="h-full flex flex-col">
              {searchResults.length > 0 ? (
                <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-1">
                  {searchResults.map((track) => (
                    <TrackItem key={track.id} track={track} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <Search className="w-16 h-16 text-muted-foreground/30" />
                  <div>
                    <p className="text-muted-foreground text-lg">No search results</p>
                    <p className="text-muted-foreground/60 text-sm">
                      Try searching for your favorite tracks or artists
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="playlists" className="flex-1 overflow-hidden p-4">
            <div className="h-full overflow-y-auto scrollbar-thin">
              {selectedPlaylist ? (
                // Playlist tracks view
                <div className="space-y-4">
                  {/* Playlist header with back button */}
                  <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <Button
                      onClick={handleBackToPlaylists}
                      variant="ghost"
                      size="sm"
                      className="p-2 hover:bg-white/10"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center space-x-3">
                      {selectedPlaylist.images[0] ? (
                        <img 
                          src={selectedPlaylist.images[0].url} 
                          alt={selectedPlaylist.name}
                          className="w-10 h-10 rounded-md"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-800 rounded-md flex items-center justify-center">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-white font-medium">{selectedPlaylist.name}</h3>
                        <p className="text-muted-foreground text-sm">
                          {playlistTracks.length} tracks • {selectedPlaylist.owner.display_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Playlist tracks */}
                  {playlistLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                      <span className="ml-3 text-muted-foreground">Loading tracks...</span>
                    </div>
                  ) : playlistTracks.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-1">
                      {playlistTracks.map((track) => (
                        <TrackItem key={track.id} track={track} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                      <List className="w-16 h-16 text-muted-foreground/30" />
                      <div>
                        <p className="text-muted-foreground text-lg">No tracks found</p>
                        <p className="text-muted-foreground/60 text-sm">
                          This playlist appears to be empty
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Playlists list view
                playlists.length > 0 ? (
                  <div className="space-y-3">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors cursor-pointer group"
                        onClick={() => handlePlaylistSelect(playlist)}
                      >
                        <div className="flex items-center space-x-3">
                          {playlist.images[0] ? (
                            <img 
                              src={playlist.images[0].url} 
                              alt={playlist.name}
                              className="w-12 h-12 rounded-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-md flex items-center justify-center">
                              <Heart className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate group-hover:text-emerald-300 transition-colors">
                              {playlist.name}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {playlist.tracks.total} tracks • {playlist.owner.display_name}
                            </p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-5 h-5 text-emerald-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Heart className="w-16 h-16 text-muted-foreground/30" />
                    <div>
                      <p className="text-muted-foreground text-lg">No playlists found</p>
                      <p className="text-muted-foreground/60 text-sm">
                        Create some playlists in Spotify to see them here
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
