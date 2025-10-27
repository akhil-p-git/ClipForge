# ClipForge - Product Requirements Document (PRD)

## Project Overview

**Project Name**: ClipForge  
**Type**: Desktop Video Editor  
**Timeline**: 72 hours (Oct 27-29, 2025)  
**Platform**: Desktop (Mac/Windows)  
**Framework**: Electron + React + TypeScript

---

## Executive Summary

ClipForge is a desktop video editor built for creators who need to record, edit, and export videos quickly. The application combines screen recording, webcam capture, timeline editing, and AI-powered transcription into a single native desktop experience.

**Core Value Proposition**: Record your screen, arrange clips on a timeline, add AI transcriptions, and export professional videos—all without leaving the app.

---

## Tech Stack

### Core Technologies
- **Desktop Framework**: Electron 28+
- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **UI Library**: shadcn/ui (or Material-UI)
- **Build Tool**: Vite

### Media & Timeline
- **Video Player**: Video.js
- **Timeline Visualization**: Wavesurfer.js + Custom React Components
- **Canvas Manipulation**: Fabric.js
- **Media Processing**: FFmpeg (via fluent-ffmpeg in main process)

### AI Features
- **Transcription**: OpenAI Whisper API (MVP)
- **Local Transcription**: Whisper.cpp (Stretch Goal)

### Additional Libraries
- **File Management**: electron-store, chokidar
- **Drag & Drop**: react-dnd
- **Layout**: react-split-pane
- **Build**: electron-builder
- **Video Metadata**: ffprobe (part of FFmpeg)

---

## User Personas

### Primary: Content Creator Chris
- Creates YouTube tutorials and course content
- Records 20-60 minute videos with screen + webcam
- Needs quick editing: trim, splice, add captions
- Values speed over complex effects
- Works on Mac or Windows

### Secondary: Educator Emma
- Records lectures and presentations
- Needs transcriptions for accessibility
- Basic editing skills
- Wants simple, intuitive interface

---

## Key Deadlines

| Milestone | Deadline | Requirements |
|-----------|----------|--------------|
| **MVP** | Tuesday, Oct 28, 10:59 PM CT | Import, timeline, trim, export, packaged app |
| **Full Submission** | Wednesday, Oct 29, 10:59 PM CT | Recording, multi-track, transcription, polished UI |
| **Stretch Goals** | If time permits | Text overlays, transitions, advanced features |

---

## MVP Requirements (Hard Gate)

The following features are **mandatory** to pass the MVP checkpoint on Tuesday night:

### 1. Desktop Application Launch
- [ ] Electron app that launches successfully
- [ ] React frontend renders without errors
- [ ] Basic window controls (minimize, maximize, close)
- [ ] App is packaged as native executable (not just dev mode)

### 2. Video Import
- [ ] Drag & drop video files into app
- [ ] File picker dialog for selecting videos
- [ ] Supported formats: MP4, MOV, WebM
- [ ] Display imported clips in media library

### 3. Timeline View
- [ ] Visual timeline showing imported clips
- [ ] Clips display with thumbnails
- [ ] Playhead indicator for current position
- [ ] Time ruler showing seconds/minutes

### 4. Video Preview Player
- [ ] Video.js player displays selected clip
- [ ] Play/pause functionality
- [ ] Seek to any position in video
- [ ] Audio playback synchronized with video

### 5. Basic Trim Functionality
- [ ] Set in-point (trim start)
- [ ] Set out-point (trim end)
- [ ] Visual indicators for trim points
- [ ] Preview trimmed result

### 6. Export to MP4
- [ ] Export button triggers FFmpeg encoding
- [ ] Progress indicator during export
- [ ] Save file to user-selected location
- [ ] Exported video plays in external players

### 7. Native Packaging
- [ ] Built with electron-builder
- [ ] Installable on target OS
- [ ] No crashes on launch
- [ ] File associations work (optional but nice)

---

## Core Features (Full Submission)

These features complete the full product by Wednesday night:

### Recording Features

#### Screen Recording
- [ ] Screen capture using Electron's desktopCapturer API
- [ ] List available screens and windows for selection
- [ ] Start/stop recording controls
- [ ] Save recording directly to timeline
- [ ] Audio capture from system audio (if available)

#### Webcam Recording
- [ ] Access system camera via getUserMedia()
- [ ] Camera selection dropdown (multiple cameras)
- [ ] Preview before recording
- [ ] Start/stop recording
- [ ] Save recording to timeline

#### Simultaneous Recording
- [ ] Record screen + webcam simultaneously
- [ ] Picture-in-picture positioning for webcam
- [ ] Adjustable webcam size/position
- [ ] Combined output as single video file

#### Audio Capture
- [ ] Microphone input selection
- [ ] Audio level meters
- [ ] Test recording before starting
- [ ] Mix system audio + mic (if possible)

### Import & Media Management

#### File Import
- [ ] Drag & drop multiple files at once
- [ ] Browse button with file picker
- [ ] Supported formats: MP4, MOV, WebM, AVI
- [ ] Show import progress for large files
- [ ] Error handling for unsupported formats

#### Media Library Panel
- [ ] Grid or list view of imported clips
- [ ] Thumbnail preview for each clip
- [ ] Metadata display:
  - Duration
  - Resolution (e.g., 1920x1080)
  - File size
  - Format/codec
- [ ] Search/filter clips by name
- [ ] Delete clips from library

#### Thumbnail Generation
- [ ] Generate thumbnails using FFmpeg
- [ ] Cache thumbnails for performance
- [ ] Scrubbing thumbnail (hover over timeline)

### Timeline Editor

#### Core Timeline Functionality
- [ ] Visual timeline with horizontal scrolling
- [ ] Playhead (red line) shows current time
- [ ] Drag clips from media library onto timeline
- [ ] Arrange clips in sequence
- [ ] Multi-track support (minimum 2 tracks)
  - Main video track
  - Overlay/PiP track

#### Clip Manipulation
- [ ] Drag clips to reorder
- [ ] Trim clips on timeline (resize from edges)
- [ ] Split clip at playhead position
- [ ] Delete clips from timeline
- [ ] Duplicate clips
- [ ] Snap-to-grid or snap to adjacent clips

#### Timeline Navigation
- [ ] Zoom in/out (timeline granularity)
- [ ] Horizontal scroll for long timelines
- [ ] Click anywhere to move playhead
- [ ] Keyboard shortcuts:
  - Space: Play/pause
  - Left/Right arrows: Frame-by-frame
  - I/O: Set in/out points
  - Delete: Remove selected clip

#### Visual Feedback
- [ ] Selected clip highlights
- [ ] Hover effects on clips
- [ ] Trim handles visible on hover
- [ ] Timeline ruler with time markers

### Preview & Playback

#### Real-time Preview
- [ ] Preview window shows current frame at playhead
- [ ] Update preview when playhead moves
- [ ] Show combined output of all tracks
- [ ] Handle overlay/PiP positioning

#### Playback Controls
- [ ] Play button
- [ ] Pause button
- [ ] Stop button (return to start)
- [ ] Speed controls (0.5x, 1x, 1.5x, 2x)
- [ ] Frame-by-frame navigation (< >)

#### Scrubbing
- [ ] Drag playhead to any position
- [ ] Smooth scrubbing without lag
- [ ] Update preview in real-time
- [ ] Show timestamp during scrubbing

#### Audio Playback
- [ ] Synchronized audio during playback
- [ ] Volume control
- [ ] Mute button
- [ ] Audio waveform on timeline (Wavesurfer.js)

### Export & Sharing

#### Export Configuration
- [ ] Resolution options:
  - Source resolution (maintain original)
  - 1080p (1920x1080)
  - 720p (1280x720)
- [ ] Format: MP4 (H.264 codec)
- [ ] Quality/bitrate selection
- [ ] Output filename and location picker

#### Export Process
- [ ] Progress bar showing percentage
- [ ] Time remaining estimate
- [ ] Cancel export option
- [ ] Error handling and retry

#### Post-Export
- [ ] Success notification
- [ ] "Open in Finder/Explorer" button
- [ ] "Open in player" button
- [ ] Export history/log

---

## AI Features (Priority 1)

### Transcription Feature

#### Core Transcription
- [ ] Extract audio from video using FFmpeg
- [ ] Send audio to OpenAI Whisper API
- [ ] Handle 25 MB file limit (chunk if needed)
- [ ] Display transcription results in panel
- [ ] Show word-level timestamps

#### UI Components
- [ ] Transcription panel in bottom drawer
- [ ] "Transcribe" button on clips
- [ ] Progress indicator during transcription
- [ ] Search through transcript
- [ ] Click word to jump to that timestamp

#### Export Options
- [ ] Export transcript as TXT
- [ ] Export transcript as SRT (subtitles)
- [ ] Export transcript as VTT
- [ ] Copy transcript to clipboard

#### Error Handling
- [ ] Handle API failures gracefully
- [ ] Show clear error messages
- [ ] Retry mechanism
- [ ] Offline mode notice

---

## Stretch Goals (If Time Permits)

### Text Overlays
- [ ] Add text boxes to timeline
- [ ] Custom fonts and sizes
- [ ] Position text anywhere on video
- [ ] Animations (fade in/out, slide)
- [ ] Export text as burned-in captions

### Transitions
- [ ] Fade transition between clips
- [ ] Cross-dissolve
- [ ] Slide transitions
- [ ] Duration control

### Audio Controls
- [ ] Volume adjustment per clip
- [ ] Fade in/out effects
- [ ] Audio ducking (auto-lower background)
- [ ] Normalize audio levels

### Filters & Effects
- [ ] Brightness/Contrast adjustment
- [ ] Saturation control
- [ ] Filters: B&W, Sepia, Vintage
- [ ] Crop and rotate

### Export Presets
- [ ] YouTube (1080p, 16:9)
- [ ] Instagram Story (1080x1920, vertical)
- [ ] TikTok (1080x1920, vertical)
- [ ] Twitter (720p, 16:9)

### Advanced Features
- [ ] Keyboard shortcuts for all actions
- [ ] Auto-save project state
- [ ] Undo/redo functionality (Ctrl+Z, Ctrl+Y)
- [ ] Multiple timeline tracks (3+)
- [ ] Background music track
- [ ] Green screen removal
- [ ] Speed control (slow-mo, time-lapse)

### Local Transcription
- [ ] Integrate Whisper.cpp for offline transcription
- [ ] Model download and management
- [ ] Toggle between cloud/local transcription
- [ ] Performance optimization for CPU/GPU

---

## Non-Functional Requirements

### Performance
- **Timeline Responsiveness**: Handle 10+ clips without lag
- **Preview Playback**: Minimum 30 fps for smooth playback
- **Export Speed**: Process at reasonable speed (depends on hardware)
- **App Launch Time**: Under 5 seconds
- **Memory Usage**: No memory leaks during 15+ minute sessions

### Reliability
- **Crash Prevention**: Handle errors gracefully, no unexpected crashes
- **File Handling**: Validate files before processing
- **Auto-save**: Save project state every 2 minutes
- **Recovery**: Restore last session on crash

### Usability
- **Intuitive UI**: Users can import and export without tutorial
- **Clear Feedback**: Loading states, progress bars, error messages
- **Keyboard Shortcuts**: Common actions accessible via keyboard
- **Responsive Layout**: Adjust to different screen sizes

### Compatibility
- **Video Formats**: Support common codecs (H.264, H.265, VP9)
- **OS Compatibility**: Mac and Windows (prioritize one if needed)
- **File Size**: Handle videos up to 2 GB
- **Resolution**: Support up to 4K input

---

## Testing Scenarios

### Critical Path Tests
1. **Import & Arrange**: Import 3 clips, arrange on timeline, export
2. **Recording Flow**: Record 30-second screen capture, add to timeline, export
3. **Transcription**: Import video with speech, transcribe, export SRT
4. **Trim & Split**: Import clip, trim edges, split in middle, export
5. **Multi-track**: Add webcam overlay to screen recording, export

### Edge Cases
- **Large Files**: Import 1 GB+ video
- **Long Timeline**: 20+ clips on timeline
- **Unsupported Format**: Try importing AVI or MKV
- **No Audio**: Video without audio track
- **Corrupt File**: Damaged video file

### Performance Tests
- **Memory Leak Test**: Edit for 15 minutes, check memory
- **Export Stress Test**: Export 10-minute video at 1080p
- **Timeline Scroll**: Smooth scrolling with 15+ clips

---

## Architecture Overview

### Electron Process Architecture

```
┌─────────────────────────────────────────┐
│         Main Process (Node.js)          │
│  - FFmpeg operations                    │
│  - File system access                   │
│  - Screen capture setup                 │
│  - IPC handlers                         │
└────────────┬────────────────────────────┘
             │ IPC (invoke/handle)
┌────────────┴────────────────────────────┐
│      Renderer Process (React)           │
│  - Timeline UI (Wavesurfer + Fabric)    │
│  - Video.js player                      │
│  - Media library                        │
│  - Recording controls                   │
│  - Transcription panel                  │
└─────────────────────────────────────────┘
```

### State Management (Zustand)

```typescript
// Store structure
{
  clips: Clip[],           // All imported clips
  timeline: TimelineClip[], // Clips on timeline
  playhead: number,        // Current time in seconds
  isPlaying: boolean,
  selectedClip: string | null,
  transcriptions: Map<string, Transcription>
}
```

### File Structure

```
ClipForge/
├── electron/
│   ├── main.ts              # Electron entry point
│   ├── preload.ts           # Context bridge
│   ├── ipc/
│   │   ├── ffmpeg.ts        # FFmpeg operations
│   │   ├── recorder.ts      # Screen/webcam capture
│   │   └── transcription.ts # Whisper API calls
│   └── utils/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Timeline/
│   │   │   ├── Timeline.tsx
│   │   │   ├── TimelineTrack.tsx
│   │   │   ├── TimelineClip.tsx
│   │   │   ├── Playhead.tsx
│   │   │   └── TimelineRuler.tsx
│   │   ├── VideoPlayer/
│   │   │   └── VideoPlayer.tsx (Video.js wrapper)
│   │   ├── MediaLibrary/
│   │   │   ├── MediaLibrary.tsx
│   │   │   └── MediaItem.tsx
│   │   ├── RecordingPanel/
│   │   │   ├── ScreenRecorder.tsx
│   │   │   └── WebcamRecorder.tsx
│   │   ├── TranscriptionPanel/
│   │   │   └── TranscriptionPanel.tsx
│   │   └── ExportDialog/
│   │       └── ExportDialog.tsx
│   ├── store/
│   │   └── useStore.ts      # Zustand store
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   └── utils/
│       ├── ffmpeg.ts
│       └── formatters.ts
├── package.json
├── electron-builder.yml
└── tsconfig.json
```

---

## API Definitions

### IPC Channels (Main ↔ Renderer)

#### FFmpeg Operations
```typescript
// Import video and extract metadata
ipcMain.handle('video:import', async (event, filePath: string) => {
  return { id, duration, resolution, fileSize, thumbnail };
});

// Export timeline to video
ipcMain.handle('video:export', async (event, config: ExportConfig) => {
  return { outputPath, success };
});
```

#### Recording
```typescript
// Get available screens
ipcMain.handle('recorder:getSources', async () => {
  return { screens: [], windows: [] };
});

// Start recording
ipcMain.handle('recorder:start', async (event, config) => {
  return { recordingId };
});

// Stop recording and save
ipcMain.handle('recorder:stop', async (event, recordingId) => {
  return { filePath };
});
```

#### Transcription
```typescript
// Transcribe video
ipcMain.handle('transcription:create', async (event, videoPath) => {
  return { transcript, words: [], segments: [] };
});
```

---

## Data Models

### Clip
```typescript
interface Clip {
  id: string;
  filePath: string;
  fileName: string;
  duration: number;      // seconds
  resolution: string;    // "1920x1080"
  fileSize: number;      // bytes
  thumbnail: string;     // base64 or path
  format: string;        // "mp4", "mov"
  hasAudio: boolean;
  createdAt: Date;
}
```

### TimelineClip
```typescript
interface TimelineClip {
  id: string;
  clipId: string;        // Reference to Clip
  trackId: number;       // 0 = main, 1 = overlay
  startTime: number;     // Position on timeline (seconds)
  duration: number;      // Length on timeline
  trimStart: number;     // Trim from clip start
  trimEnd: number;       // Trim from clip end
  volume: number;        // 0-1
}
```

### Transcription
```typescript
interface Transcription {
  clipId: string;
  text: string;
  words: TranscriptionWord[];
  segments: TranscriptionSegment[];
  language: string;
  createdAt: Date;
}

interface TranscriptionWord {
  word: string;
  start: number;         // seconds
  end: number;
  confidence: number;
}

interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}
```

---

## User Interface Design

### Layout Structure

```
┌──────────────────────────────────────────────────────┐
│  Menu Bar: File | Edit | View | Help                 │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │                 │  │                          │  │
│  │  Media Library  │  │   Video Preview Player   │  │
│  │                 │  │                          │  │
│  │  [Clip 1]       │  │      [Video.js]          │  │
│  │  [Clip 2]       │  │                          │  │
│  │  [Clip 3]       │  │    ▶ Play Controls       │  │
│  │                 │  │                          │  │
│  │  + Import       │  │   Recording Panel:       │  │
│  │  🎥 Record      │  │   [Screen] [Webcam]      │  │
│  │                 │  │                          │  │
│  └─────────────────┘  └──────────────────────────┘  │
│                                                       │
├──────────────────────────────────────────────────────┤
│  Timeline (Wavesurfer.js + Fabric.js)                │
│  ┌────────────────────────────────────────────────┐  │
│  │ Track 1: [====Clip 1====] [====Clip 2====]    │  │
│  │ Track 2:        [==Overlay==]                  │  │
│  │          |<-- Playhead                         │  │
│  └────────────────────────────────────────────────┘  │
│  [Zoom -] [Zoom +]  [Export]  [Transcribe]         │
├──────────────────────────────────────────────────────┤
│  Transcription Panel (collapsible)                   │
│  "This is the transcribed text from the video..."    │
│  [0:05] This    [0:06] is    [0:07] the...           │
└──────────────────────────────────────────────────────┘
```

---

## Success Metrics

### MVP Success (Tuesday)
- ✅ App launches without crashes
- ✅ Can import and display video
- ✅ Timeline shows clips
- ✅ Can trim at least one clip
- ✅ Export produces playable MP4
- ✅ Packaged app installs on target OS

### Full Submission Success (Wednesday)
- ✅ All MVP features work reliably
- ✅ Screen recording works
- ✅ Webcam recording works
- ✅ Transcription produces accurate results
- ✅ Multi-track timeline functional
- ✅ Export produces high-quality video
- ✅ No crashes during 5-minute demo

### Stretch Goals
- 🎯 3+ stretch features implemented
- 🎯 Polished UI with animations
- 🎯 Local transcription working
- 🎯 Text overlays and transitions

---

## Risk Mitigation

### High-Risk Areas

1. **FFmpeg Integration**
   - Risk: Complex encoding, hard to debug
   - Mitigation: Test export early, use simple FFmpeg commands first
   - Fallback: Single-clip export only for MVP

2. **Timeline Performance**
   - Risk: Canvas rendering may lag with many clips
   - Mitigation: Implement virtualization, limit visible clips
   - Fallback: Simplify timeline to DOM-based (no canvas)

3. **Screen Recording**
   - Risk: Platform-specific APIs, permissions issues
   - Mitigation: Test on target OS immediately
   - Fallback: Recording not required for MVP

4. **Packaging**
   - Risk: electron-builder config can be tricky
   - Mitigation: Package early and often, test on clean machine
   - Fallback: Provide dev mode instructions

5. **Time Constraint**
   - Risk: 72 hours is very tight
   - Mitigation: Cut scope aggressively, focus on core loop
   - Fallback: Ship MVP with promise of updates

---

## Submission Checklist

### Code Submission
- [ ] GitHub repository with clear README
- [ ] Setup instructions tested on fresh install
- [ ] Architecture documentation
- [ ] Code is commented and clean
- [ ] TypeScript types defined

### Packaged App
- [ ] Installer/executable uploaded to GitHub Releases
- [ ] Or clear build instructions provided
- [ ] Tested on target OS
- [ ] File associations configured (optional)

### Demo Video (3-5 minutes)
- [ ] Show app launch
- [ ] Import video clips
- [ ] Record screen capture
- [ ] Arrange clips on timeline
- [ ] Trim and split clips
- [ ] Transcribe a video
- [ ] Export final video
- [ ] Play exported video

### Documentation
- [ ] README with:
  - What ClipForge does
  - How to install/run
  - How to build from source
  - Tech stack overview
  - Known limitations
- [ ] Architecture diagram
- [ ] Screenshots of main screens

---

## Appendix

### Recommended Reading
- [Electron Documentation](https://www.electronjs.org/docs/latest)
- [Video.js API](https://docs.videojs.com/)
- [Wavesurfer.js Docs](https://wavesurfer-js.org/)
- [FFmpeg Filters](https://ffmpeg.org/ffmpeg-filters.html)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)

### FFmpeg Command Examples

**Extract audio from video:**
```bash
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 output.wav
```

**Trim video:**
```bash
ffmpeg -i input.mp4 -ss 00:00:10 -to 00:00:30 -c copy output.mp4
```

**Concatenate videos:**
```bash
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

**Export with quality:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 22 -c:a aac output.mp4
```

### Keyboard Shortcuts (Recommended)
- **Space**: Play/Pause
- **I**: Set in-point
- **O**: Set out-point
- **S**: Split clip at playhead
- **Delete**: Delete selected clip
- **Cmd/Ctrl + Z**: Undo
- **Cmd/Ctrl + Shift + Z**: Redo
- **Cmd/Ctrl + E**: Export
- **Left Arrow**: Previous frame
- **Right Arrow**: Next frame
- **Shift + Left/Right**: Jump 1 second

---

## Questions & Support

For technical questions during the build:
- Electron IPC issues → Check preload.ts context bridge
- FFmpeg not found → Ensure FFmpeg is bundled or installed
- Timeline lag → Implement canvas optimization or virtualization
- Export fails → Check FFmpeg command syntax and file paths
- Transcription errors → Verify OpenAI API key and audio format

---

**Remember**: Ship something working. A simple editor that works beats a complex editor that crashes. Focus on the core loop: Import → Arrange → Export.

Good luck! 🚀
