# ClipForge

A desktop video editor built with Electron + React, featuring screen recording, webcam capture, timeline editing, and AI-powered transcription.

## Tech Stack

- **Electron** 28+ - Desktop framework
- **React** 18 - Frontend UI
- **JavaScript** - Core language
- **Vite** - Build tool
- **Zustand** - State management
- **Video.js** - Video player
- **Wavesurfer.js** - Audio visualization
- **FFmpeg** - Video processing
- **OpenAI Whisper** - AI transcription

## Features

### MVP (Current Focus)
- ✅ Project setup complete
- ✅ Electron + React scaffold
- ⏳ Video import
- ⏳ Timeline editing
- ⏳ Basic trim functionality
- ⏳ Export to MP4

### Full Features (To Come)
- Screen recording
- Webcam capture
- Multi-track timeline
- AI transcription
- Advanced export options

## Development Setup

### Prerequisites

1. **Node.js** (v18 or higher)
2. **FFmpeg** - Required for video processing
   - macOS: `brew install ffmpeg`
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
3. **FFprobe** - Usually included with FFmpeg

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Note: Some packages have peer dependency warnings but work fine with --legacy-peer-deps
```

### Running the App

```bash
# Start Vite dev server
npm run dev

# In another terminal, start Electron
npm run electron
```

Or use the combined command:
```bash
npm run electron:dev
```

### Building

```bash
# Build for production
npm run build
```

This will:
1. Build the React app with Vite
2. Package it with Electron Builder
3. Create platform-specific installers in `dist-electron/`

## Project Structure

```
ClipForge/
├── electron/
│   ├── main.js           # Electron main process
│   └── preload.js        # Context bridge for IPC
├── src/
│   ├── components/       # React components
│   │   ├── Timeline/
│   │   ├── VideoPlayer/
│   │   ├── MediaLibrary/
│   │   ├── RecordingPanel/
│   │   └── TranscriptionPanel/
│   ├── store/            # Zustand store
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
└── README.md
```

## Timeline

- **MVP Deadline**: Tuesday, Oct 28, 10:59 PM CT
- **Final Deadline**: Wednesday, Oct 29, 10:59 PM CT

## Architecture

### IPC (Inter-Process Communication)

The app uses Electron's IPC to communicate between the main process (Node.js) and renderer process (React):

**Main Process (electron/main.js)**:
- FFmpeg operations
- File system access
- Screen capture
- Window management

**Renderer Process (React)**:
- UI components
- Timeline visualization
- Video playback
- User interactions

### State Management

Using Zustand for global state:
- Clips collection
- Timeline state
- Playhead position
- UI state

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `electron` | Desktop app framework |
| `react` | UI library |
| `zustand` | State management |
| `video.js` | Video player |
| `wavesurfer.js` | Audio waveforms |
| `allotment` | Resizable panels |
| `fluent-ffmpeg` | Video processing |
| `@ffmpeg/ffmpeg` | FFmpeg in browser (fallback) |

## Known Issues

- Some npm packages have peer dependency warnings but work correctly
- FFmpeg must be installed separately on the system
- Development requires running two processes (Vite + Electron)

## Next Steps

1. Implement video import with drag & drop
2. Add Video.js player component
3. Create timeline with Wavesurfer
4. Implement basic trim functionality
5. Add export with FFmpeg

## Contributing

This is a hackathon project. See `ClipForge_PRD.md` and `ClipForge_TaskList.md` for detailed requirements and implementation plan.

## License

MIT

