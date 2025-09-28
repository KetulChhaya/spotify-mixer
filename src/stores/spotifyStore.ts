import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string; width: number; height: number }[]
  }
  duration_ms: number
  preview_url: string | null
  uri: string
  external_urls: {
    spotify: string
  }
}

export interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: { url: string }[]
  country: string
  product: string // 'premium' | 'free'
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  images: { url: string }[]
  tracks: {
    total: number
  }
  owner: {
    display_name: string
  }
}

interface SpotifyState {
  // Authentication
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  isAuthenticated: boolean
  user: SpotifyUser | null
  
  // Playback
  deviceId: string | null
  player: any | null // Spotify.Player type from SDK
  isPlayerReady: boolean
  playbackState: any | null // Current playback state from SDK
  isBuffering: boolean
  
  // Content
  searchResults: SpotifyTrack[]
  playlists: SpotifyPlaylist[]
  currentTrack: SpotifyTrack | null
  
  // Loading states
  isLoading: boolean
  searchLoading: boolean
  
  // Actions
  login: () => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken?: string, expiresIn?: number) => void
  refreshAccessToken: () => Promise<boolean>
  initializeAuth: () => Promise<void>
  
  // Spotify API
  searchTracks: (query: string) => Promise<void>
  getUserPlaylists: () => Promise<void>
  getPlaylistTracks: (playlistId: string) => Promise<SpotifyTrack[]>
  
  // Player control
  initializePlayer: () => Promise<void>
  playTrack: (trackUri: string, positionMs?: number) => Promise<void>
  pausePlayback: () => Promise<void>
  resumePlayback: () => Promise<void>
  seekToPosition: (positionMs: number) => Promise<void>
  setVolume: (volume: number) => Promise<void>
  
  // Helper methods
  fetchUserProfile: () => Promise<void>
  isPremium: () => boolean
  canPlayFullTracks: () => boolean
  getCurrentPlaybackState: () => Promise<any>
  updatePlaybackState: (state: any) => void
  ensureValidToken: () => Promise<boolean>
  isTokenExpired: () => boolean
  makeSpotifyAPICall: (url: string, options?: RequestInit) => Promise<Response>
}

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

// Generate random string for OAuth security
const generateRandomString = (length: number): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let text = ''
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

// Generate code verifier and challenge for PKCE
const generateCodeVerifier = (): string => {
  return generateRandomString(128)
}

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Create authorization URL with PKCE
const createAuthUrl = async (): Promise<string> => {
  const state = generateRandomString(16)
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  // Store code verifier for later use
  localStorage.setItem('code_verifier', codeVerifier)
  localStorage.setItem('oauth_state', state)
  
  const scope = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

// Exchange authorization code for tokens using PKCE
const exchangeCodeForTokens = async (code: string, state: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> => {
  // Verify state parameter
  const storedState = localStorage.getItem('oauth_state')
  if (state !== storedState) {
    throw new Error('Invalid state parameter')
  }

  // Get code verifier
  const codeVerifier = localStorage.getItem('code_verifier')
  if (!codeVerifier) {
    throw new Error('No code verifier found')
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  })

  // Clean up stored values
  localStorage.removeItem('code_verifier')
  localStorage.removeItem('oauth_state')

  if (!response.ok) {
    const errorData = await response.text()
    console.error('Token exchange failed:', errorData)
    throw new Error('Failed to exchange code for tokens')
  }

  return response.json()
}

export const useSpotifyStore = create<SpotifyState>()(
  persist(
    (set, get) => ({
      // Initial state
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,
      user: null,
      deviceId: null,
      player: null,
      isPlayerReady: false,
      playbackState: null,
      isBuffering: false,
      searchResults: [],
      playlists: [],
      currentTrack: null,
      isLoading: false,
      searchLoading: false,

      // Authentication actions
      login: async () => {
        try {
          const authUrl = await createAuthUrl()
          window.location.href = authUrl
        } catch (error) {
          console.error('Failed to create auth URL:', error)
        }
      },

      logout: () => {
        const { player } = get()
        if (player) {
          player.disconnect()
        }
        
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          isAuthenticated: false,
          user: null,
          deviceId: null,
          player: null,
          isPlayerReady: false,
          searchResults: [],
          playlists: [],
          currentTrack: null,
        })
      },

      setTokens: (accessToken: string, refreshToken?: string, expiresIn?: number) => {
        const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : null
        
        set({
          accessToken,
          refreshToken: refreshToken || get().refreshToken,
          expiresAt,
          isAuthenticated: true,
        })

        // Fetch user profile
        get().fetchUserProfile()
        
        // Initialize Web Playback SDK for Premium users
        setTimeout(() => {
          if (get().isPremium()) {
            // Wait for Spotify SDK to be ready
            if (window.Spotify) {
              get().initializePlayer()
            } else {
              // Set up the callback for when SDK is ready
              window.onSpotifyWebPlaybackSDKReady = () => {
                console.log('🎵 Spotify Web Playback SDK loaded, initializing player...')
                get().initializePlayer()
              }
            }
          }
        }, 1000) // Small delay to ensure user profile is loaded
      },

      // Initialize auth state on app load
      initializeAuth: async () => {
        const { accessToken, refreshToken, isTokenExpired } = get()
        
        if (!accessToken || !refreshToken) {
          console.log('No stored tokens found')
          return
        }

        if (isTokenExpired()) {
          console.log('🔄 Stored token expired, attempting refresh...')
          const refreshed = await get().refreshAccessToken()
          if (!refreshed) {
            console.log('Failed to refresh token, user needs to re-authenticate')
            get().logout()
            return
          }
        }

        console.log('✅ Authentication initialized successfully')
        // Fetch fresh user profile
        get().fetchUserProfile()
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          console.warn('No refresh token available')
          return false
        }

        try {
          console.log('🔄 Refreshing access token...')
          
          const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              client_id: CLIENT_ID,
              // Note: PKCE flow doesn't require client_secret
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('Token refresh failed:', response.status, errorData)
            
            // If refresh token is invalid, logout user
            if (response.status === 400 || response.status === 401) {
              console.warn('Refresh token invalid, logging out user')
              get().logout()
            }
            return false
          }

          const data = await response.json()
          console.log('✅ Token refreshed successfully')
          
          get().setTokens(
            data.access_token, 
            data.refresh_token || refreshToken, // Keep existing refresh token if not provided
            data.expires_in
          )
          return true
        } catch (error) {
          console.error('Failed to refresh token:', error)
          return false
        }
      },

      // API helpers
      fetchUserProfile: async () => {
        const tokenValid = await get().ensureValidToken()
        if (!tokenValid) return

        const { accessToken } = get()

        try {
          const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })

          if (response.status === 401) {
            // Token might be invalid, try refreshing once more
            const refreshed = await get().refreshAccessToken()
            if (refreshed) {
              return get().fetchUserProfile()
            }
            return
          }

          if (response.ok) {
            const user = await response.json()
            set({ user })
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error)
        }
      },

      // Premium status helpers
      isPremium: () => {
        const { user } = get()
        return user?.product === 'premium'
      },

      canPlayFullTracks: () => {
        const { user, isPlayerReady, deviceId } = get()
        const isPremium = user?.product === 'premium'
        
        console.log('🔍 Premium Playback Check:', {
          isPremium,
          isPlayerReady,
          deviceId,
          canPlay: isPremium && isPlayerReady
        })
        
        return isPremium && isPlayerReady
      },

      getCurrentPlaybackState: async () => {
        const { player } = get()
        if (!player) return null
        
        try {
          const state = await player.getCurrentState()
          set({ playbackState: state })
          return state
        } catch (error) {
          console.error('Failed to get playback state:', error)
          return null
        }
      },

      updatePlaybackState: (state: any) => {
        set({ playbackState: state })
      },

      // Token management helpers
      isTokenExpired: () => {
        const { expiresAt } = get()
        if (!expiresAt) return true
        
        // Consider token expired if it expires within the next 5 minutes
        const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000)
        return expiresAt <= fiveMinutesFromNow
      },

      ensureValidToken: async () => {
        const { accessToken, isTokenExpired, refreshAccessToken } = get()
        
        if (!accessToken) {
          console.warn('No access token available')
          return false
        }

        if (isTokenExpired()) {
          console.log('🔄 Token expired, attempting refresh...')
          const refreshed = await refreshAccessToken()
          if (!refreshed) {
            console.error('Failed to refresh token')
            return false
          }
        }

        return true
      },

      // Helper for API calls with automatic token refresh
      makeSpotifyAPICall: async (url: string, options: RequestInit = {}) => {
        const tokenValid = await get().ensureValidToken()
        if (!tokenValid) throw new Error('No valid token available')

        const { accessToken } = get()
        
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        })

        // If token is invalid, try refreshing once
        if (response.status === 401) {
          console.log('🔄 API call failed with 401, attempting token refresh...')
          const refreshed = await get().refreshAccessToken()
          if (refreshed) {
            const { accessToken: newToken } = get()
            return fetch(url, {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              },
            })
          }
        }

        return response
      },

      searchTracks: async (query: string) => {
        if (!query.trim()) return

        set({ searchLoading: true })

        try {
          const response = await get().makeSpotifyAPICall(
            `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=20`
          )

          if (response.ok) {
            const data = await response.json()
            set({ searchResults: data.tracks.items })
          } else {
            console.error('Search failed:', response.status, response.statusText)
          }
        } catch (error) {
          console.error('Failed to search tracks:', error)
        } finally {
          set({ searchLoading: false })
        }
      },

      getUserPlaylists: async () => {
        const { accessToken } = get()
        if (!accessToken) return

        try {
          const response = await fetch(`${SPOTIFY_API_BASE}/me/playlists?limit=50`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            set({ playlists: data.items })
          }
        } catch (error) {
          console.error('Failed to fetch playlists:', error)
        }
      },

      getPlaylistTracks: async (playlistId: string) => {
        const { accessToken } = get()
        if (!accessToken) return []

        try {
          const response = await fetch(
            `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            return data.items.map((item: any) => item.track)
          }
        } catch (error) {
          console.error('Failed to fetch playlist tracks:', error)
        }
        
        return []
      },

      // Player control
      initializePlayer: async () => {
        const { accessToken, user } = get()
        
        console.log('🔄 Initializing Spotify Web Playback SDK...', {
          hasAccessToken: !!accessToken,
          isPremium: user?.product === 'premium',
          hasSpotifySDK: !!window.Spotify
        })
        
        if (!accessToken) {
          console.error('❌ No access token available')
          return
        }

        return new Promise((resolve, reject) => {
          if (!window.Spotify) {
            console.error('❌ Spotify Web Playback SDK not loaded')
            reject(new Error('Spotify SDK not loaded'))
            return
          }

          const player = new window.Spotify.Player({
            name: 'Spotify Mixer Web Player',
            getOAuthToken: (cb: (token: string) => void) => {
              cb(accessToken)
            },
            volume: 0.5,
          })

          // Error handling
          player.addListener('initialization_error', ({ message }: { message: string }) => {
            console.error('Failed to initialize:', message)
          })

          player.addListener('authentication_error', ({ message }: { message: string }) => {
            console.error('Authentication error:', message)
          })

          player.addListener('account_error', ({ message }: { message: string }) => {
            console.error('Account error:', message)
          })

          // Ready
          player.addListener('ready', ({ device_id }: { device_id: string }) => {
            console.log('✅ Spotify Web Playback SDK Ready with Device ID:', device_id)
            set({
              deviceId: device_id,
              player,
              isPlayerReady: true,
            })
            resolve(undefined)
          })

          // Not ready
          player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.log('❌ Spotify Web Playback SDK Not Ready for Device ID:', device_id)
            set({
              isPlayerReady: false,
            })
          })

          // Player state changed - track position, buffering, etc.
          player.addListener('player_state_changed', (state: any) => {
            console.log('🎵 Player state changed:', state)
            set({
              playbackState: state,
              isBuffering: state?.loading || false,
              currentTrack: state?.track_window?.current_track || get().currentTrack
            })
            
            // Update audio store with current position for deck sync
            if (state && !state.paused) {
              import('./audioStore').then(({ updateSpotifyPosition }) => {
                updateSpotifyPosition(state.position, state.track_window?.current_track?.duration_ms || 0)
              })
            }
          })

          // Add timeout for initialization
          const timeout = setTimeout(() => {
            console.error('⏰ Spotify player initialization timeout')
            reject(new Error('Player initialization timeout'))
          }, 10000) // 10 second timeout

          // Clear timeout when resolved
          const originalResolve = resolve
          resolve = (...args) => {
            clearTimeout(timeout)
            originalResolve(...args)
          }

          // Connect to the player
          console.log('🔗 Connecting to Spotify Web Playback SDK...')
          player.connect().then((success: boolean) => {
            console.log('🎵 Spotify player connection result:', success)
          }).catch((error: any) => {
            console.error('❌ Failed to connect player:', error)
            clearTimeout(timeout)
            reject(error)
          })
        })
      },

      playTrack: async (trackUri: string, positionMs = 0) => {
        const { deviceId, isPlayerReady } = get()
        if (!deviceId || !isPlayerReady) {
          console.error('Player not ready for playback')
          return
        }

        try {
          const response = await get().makeSpotifyAPICall(
            `${SPOTIFY_API_BASE}/me/player/play?device_id=${deviceId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                uris: [trackUri],
                position_ms: positionMs,
              }),
            }
          )

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Spotify play API error:', response.status, errorText)
            throw new Error(`Failed to play track: ${response.status}`)
          }

          console.log('Successfully started Spotify playback:', trackUri)
        } catch (error) {
          console.error('Failed to play track:', error)
          throw error
        }
      },

      pausePlayback: async () => {
        try {
          await get().makeSpotifyAPICall(`${SPOTIFY_API_BASE}/me/player/pause`, {
            method: 'PUT',
          })
        } catch (error) {
          console.error('Failed to pause playback:', error)
        }
      },

      resumePlayback: async () => {
        try {
          await get().makeSpotifyAPICall(`${SPOTIFY_API_BASE}/me/player/play`, {
            method: 'PUT',
          })
        } catch (error) {
          console.error('Failed to resume playback:', error)
        }
      },

      seekToPosition: async (positionMs: number) => {
        const { player } = get()

        // Use SDK for immediate seeking if available (faster)
        if (player) {
          try {
            await player.seek(positionMs)
            console.log('🎯 Seeked via SDK to:', positionMs)
            return
          } catch (error) {
            console.warn('SDK seek failed, falling back to API:', error)
          }
        }

        // Fallback to Web API with token refresh
        try {
          await get().makeSpotifyAPICall(
            `${SPOTIFY_API_BASE}/me/player/seek?position_ms=${positionMs}`,
            {
              method: 'PUT',
            }
          )
          console.log('🎯 Seeked via API to:', positionMs)
        } catch (error) {
          console.error('Failed to seek:', error)
        }
      },

      setVolume: async (volume: number) => {
        const { accessToken } = get()
        if (!accessToken) return

        try {
          const volumePercent = Math.round(volume * 100)
          await fetch(
            `${SPOTIFY_API_BASE}/me/player/volume?volume_percent=${volumePercent}`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )
        } catch (error) {
          console.error('Failed to set volume:', error)
        }
      },
    }),
    {
      name: 'spotify-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
)

// Handle OAuth callback
export const handleSpotifyCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const state = urlParams.get('state')
  const error = urlParams.get('error')

  if (error) {
    console.error('Spotify auth error:', error)
    return false
  }

  if (code && state) {
    try {
      const tokens = await exchangeCodeForTokens(code, state)
      useSpotifyStore.getState().setTokens(
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in
      )
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/')
      return true
    } catch (error) {
      console.error('Failed to handle callback:', error)
      alert('Authentication failed. Please try again.')
      return false
    }
  }

  return false
}
