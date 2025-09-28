# Spotify DJ Mixer

A professional 2-deck DJ mixer with Spotify integration, built with React, TypeScript, and Web Audio API. Features real-time audio mixing, beat sync effects, and seamless track transitions.

## Features

- **2-Deck Setup**: Independent Deck A and Deck B with full control
- **Spotify Integration**: Full access to Spotify's music library
- **Premium Support**: Full track playback for Spotify Premium users
- **Preview Mode**: 30-second previews for free Spotify accounts
- **Real Audio Mixing**: Working crossfader with actual audio blending
- **Beat Sync Effects**: 2-second rhythmic beat effects during track transitions
- **Auto-Crossfade**: Automatic track transitions with configurable timing
- **Audio Effects**: Beat repeat, low-pass filter, echo, reverse, and vinyl brake effects
- **Professional Controls**: Play/pause, volume control, seeking, and vinyl scrubbing
- **Modern UI**: Clean, responsive interface with glassmorphism design

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   # Edit .env with your Spotify app credentials
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:3000`

## How to Use

### Basic DJ Controls
1. **Connect Spotify**: Click "Connect Spotify" and authorize the application
2. **Load Tracks**: Click "Load from Spotify" on each deck to browse and select tracks
3. **Play/Pause**: Use the large circular play button on each deck
4. **Control Volume**: Adjust the volume slider for each deck independently
5. **Mix with Crossfader**: 
   - Move crossfader left for Deck A only
   - Center position for equal mix
   - Move right for Deck B only
   - Use quick buttons for instant positioning

### Advanced Features
6. **Beat Sync**: 
   - Automatic 2-second beat effects during auto-crossfade
   - Manual "Beat A" and "Beat B" buttons for on-demand sync
   - Smart BPM detection based on track metadata
7. **Auto-Crossfade**: 
   - Automatic track transitions with configurable timing
   - Triggers 15 seconds before track end (configurable)
   - Smooth S-curve transitions
8. **Audio Effects**: 
   - Apply effects to individual decks or both simultaneously
   - Beat repeat, low-pass filter, echo, reverse, vinyl brake
9. **Track Seeking**: Click on the progress bar to jump to different parts
10. **Vinyl Scrubbing**: Click and drag on the vinyl records for real-time scrubbing

## Keyboard Shortcuts

- **Arrow Left/Right**: Move crossfader
- **Home**: Set crossfader to Deck A only
- **End**: Set crossfader to Deck B only
- **Space**: Center crossfader

## Beat Sync System

The beat sync feature provides rhythmic visual and audio feedback during track transitions:

- **Automatic Trigger**: Activates during auto-crossfade track switches
- **Manual Control**: "Beat A" and "Beat B" buttons for manual triggering
- **Smart BPM Detection**: Automatically estimates BPM based on track title/genre
- **Visual Effects**: Pulsing circles on screen during beats
- **Audio Cues**: Subtle click sounds synchronized with the rhythm
- **2-Second Duration**: Perfect timing for smooth transitions

## Technical Stack

- **React 18** - UI framework with TypeScript
- **Zustand** - State management
- **Spotify Web API** - Music streaming and library access
- **Spotify Web Playback SDK** - Premium track playback
- **Web Audio API** - Real audio processing and effects
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible UI components
- **Vite** - Fast build tool and dev server

## Spotify Integration

- **Free Account**: 30-second track previews with full mixing capabilities
- **Premium Account**: Full track playback with Spotify Web Playback SDK
- **Track Search**: Browse and search Spotify's entire music library
- **Real-time Playback**: Synchronized playback control across decks
- **Playlist Support**: Load tracks from your Spotify playlists

## Requirements

- **Spotify Account**: Free or Premium Spotify account
- **Modern Browser**: Chrome, Firefox, Safari, Edge (latest versions)
- **Web Audio API Support**: Required for audio processing
- **HTTPS**: Required for Spotify Web Playback SDK (Premium features)

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit

# Linting
npx eslint src --ext .ts,.tsx
```

## Setup

1. **Spotify App Registration**: 
   - Go to [Spotify Developer Console](https://developer.spotify.com/)
   - Create a new app
   - Set redirect URI to `http://localhost:3000/callback`

2. **Environment Variables**: 
   - Copy `env.example` to `.env`
   - Add your Spotify app credentials:
   ```env
   VITE_SPOTIFY_CLIENT_ID=your_client_id
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
   ```

3. **HTTPS for Production**: 
   - Required for Spotify Web Playback SDK
   - Use Vite's HTTPS mode: `npm run dev -- --https`

## Premium vs Free Features

| Feature | Free Account | Premium Account |
|---------|--------------|----------------|
| Track Search | ✅ | ✅ |
| 30s Preview Playback | ✅ | ✅ |
| Full Track Playback | ❌ | ✅ |
| Crossfader Mixing | ✅ | ✅ |
| Beat Sync Effects | ✅ | ✅ |
| Audio Effects | ✅ | ✅ |
| Auto-Crossfade | ✅ | ✅ |
| Volume Control | ✅ | ✅ |
| Seeking/Scrubbing | ✅ (Preview only) | ✅ (Full track) |

## Architecture

- **State Management**: Zustand stores for audio, Spotify, and effects
- **Audio Processing**: Web Audio API for real-time effects and mixing
- **Spotify Integration**: Web Playback SDK for premium features
- **Component Structure**: Modular React components with TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism effects

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details