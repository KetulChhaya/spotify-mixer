// Spotify Web Playback SDK Types
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: typeof Spotify
  }
}

declare namespace Spotify {
  interface Player {
    new (options: {
      name: string
      getOAuthToken: (cb: (token: string) => void) => void
      volume?: number
    }): Player

    addListener(
      event: 'ready' | 'not_ready',
      callback: (data: { device_id: string }) => void
    ): void

    addListener(
      event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
      callback: (data: { message: string }) => void
    ): void

    addListener(
      event: 'player_state_changed',
      callback: (state: PlaybackState | null) => void
    ): void

    connect(): Promise<boolean>
    disconnect(): void
    getCurrentState(): Promise<PlaybackState | null>
    setName(name: string): Promise<void>
    getVolume(): Promise<number>
    setVolume(volume: number): Promise<void>
    pause(): Promise<void>
    resume(): Promise<void>
    togglePlay(): Promise<void>
    seek(position: number): Promise<void>
    previousTrack(): Promise<void>
    nextTrack(): Promise<void>
  }

  interface PlaybackState {
    context: {
      uri: string
      metadata: any
    }
    disallows: {
      pausing: boolean
      peeking_next: boolean
      peeking_prev: boolean
      resuming: boolean
      seeking: boolean
      skipping_next: boolean
      skipping_prev: boolean
    }
    paused: boolean
    position: number
    repeat_mode: number
    shuffle: boolean
    track_window: {
      current_track: Track
      next_tracks: Track[]
      previous_tracks: Track[]
    }
  }

  interface Track {
    uri: string
    id: string | null
    type: 'track' | 'episode' | 'ad'
    media_type: 'audio' | 'video'
    name: string
    is_playable: boolean
    album: {
      uri: string
      name: string
      images: Image[]
    }
    artists: Artist[]
  }

  interface Artist {
    uri: string
    name: string
  }

  interface Image {
    url: string
    width: number | null
    height: number | null
  }
}

export {};
