# ClipForge

A powerful desktop video editor built with Electron + React, featuring screen recording, webcam capture, timeline editing, and AI-powered transcription.

## Tech Stack

- **Electron** 28+ - Desktop framework
- **React** 18 - Frontend UI
- **JavaScript** - Core language
- **Vite** - Build tool
- **Zustand** - State management
- **FFmpeg** - Video processing & export
- **OpenAI Whisper** - AI transcription
- **React DnD** - Drag & drop timeline

## Features

### ✅ Completed Features
- ✅ Video import (drag & drop or file picker)
- ✅ Screen recording with system audio
- ✅ Webcam recording
- ✅ Multi-clip timeline editing
- ✅ Drag & drop timeline arrangement
- ✅ Timeline export (concatenate multiple clips)
- ✅ AI-powered transcription (OpenAI Whisper)
- ✅ Export to MP4 with quality settings
- ✅ Real-time video preview
- ✅ Keyboard shortcuts

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

# Install FFmpeg (required for export functionality)
brew install ffmpeg

# Or on Windows/Linux:
# Download from https://ffmpeg.org/download.html
```

### Environment Setup (Optional)

For AI transcription features, you'll need an OpenAI API key:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Get your API key from: https://platform.openai.com/api-keys

**Note**: The `.env` file is git-ignored for security. Never commit API keys to version control.

### Running the App

```bash
# Combined command (recommended)
npm run electron:dev
```

This will start Vite dev server and Electron together.

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

## Important Notes

- **FFmpeg Required**: FFmpeg must be installed on your system for video export to work
  - macOS: `brew install ffmpeg`
  - Windows/Linux: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **Development Mode**: Running `npm run electron:dev` starts both Vite dev server and Electron
- **Peer Dependencies**: Use `npm install --legacy-peer-deps` to avoid dependency conflicts

## Quick Start Guide

### Recording
1. **Screen Recording**: Click "Screen" button, select screen/window, configure audio, and start recording
2. **Webcam Recording**: Click "Webcam" button, select camera, and start recording
3. Recordings are automatically saved and added to your media library

### Editing
1. **Import Video**: Click "Import" button or drag & drop video files into the media library
2. **Preview**: Click any clip in the media library to preview it
3. **Add to Timeline**: Drag clips from library to the timeline (clips auto-position sequentially)
4. **Arrange Clips**: Drag clips on the timeline to reorder them
5. **Export Timeline**: Click "Export Timeline" to concatenate all clips into a single MP4

### Transcription
1. **Add OpenAI API Key**: Set `OPENAI_API_KEY` in your `.env` file
2. **Select Clip**: Click a clip in the media library
3. **Transcribe**: Click the transcription button to generate AI-powered captions
4. **Export**: Save transcription as text file

## Keyboard Shortcuts

- **Space**: Play/Pause
- **I**: Set in point (mark start of selection)
- **O**: Set out point (mark end of selection)

## Current Status

🎉 **All core features complete!** ClipForge is fully functional for:
- Multi-source recording (screen + webcam)
- Timeline-based editing with multiple clips
- Professional-quality exports with FFmpeg
- AI transcription powered by OpenAI Whisper

## Contributing

This is a hackathon project. See `ClipForge_PRD.md` and `ClipForge_TaskList.md` for detailed requirements and implementation plan.

## License

MIT

