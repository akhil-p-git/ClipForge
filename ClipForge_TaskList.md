# ClipForge - Task List & Implementation Guide

## Overview

This task list breaks down the ClipForge project into actionable phases with time estimates. The total timeline is 72 hours, split across 3 days with two critical deadlines.

**Timeline:**
- **Day 1 (Monday, Oct 27)**: Setup + MVP Development
- **Day 2 (Tuesday, Oct 28)**: MVP Completion → **DEADLINE 10:59 PM CT**
- **Day 3 (Wednesday, Oct 29)**: Core Features + Polish → **FINAL DEADLINE 10:59 PM CT**

---

## Phase 0: Project Setup & Architecture
**Duration**: 3-4 hours  
**Goal**: Get development environment running with basic Electron + React scaffold

### Task 0.1: Initialize Project (30 min)
- [ ] Create GitHub repository: `clipforge`
- [ ] Initialize project: `npm create vite@latest clipforge -- --template react-ts`
- [ ] Install Electron dependencies:
  ```bash
  npm install --save-dev electron electron-builder concurrently
  npm install --save-dev vite-plugin-electron vite-plugin-electron-renderer
  ```
- [ ] Install core dependencies:
  ```bash
  npm install zustand video.js wavesurfer.js fabric react-split-pane
  npm install @types/video.js
  ```
- [ ] Verify app runs: `npm run dev`

**Acceptance Criteria:**
- React app renders "Hello World"
- No TypeScript errors
- Git initialized with .gitignore

---

### Task 0.2: Configure Electron (1 hour)
- [ ] Create `electron/` directory
- [ ] Create `electron/main.ts`:
  ```typescript
  import { app, BrowserWindow } from 'electron';
  import path from 'path';

  function createWindow() {
    const win = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // Load Vite dev server in development
    if (process.env.NODE_ENV === 'development') {
      win.loadURL('http://localhost:5173');
      win.webContents.openDevTools();
    } else {
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  app.whenReady().then(createWindow);
  ```

- [ ] Create `electron/preload.ts` (context bridge):
  ```typescript
  import { contextBridge, ipcRenderer } from 'electron';

  contextBridge.exposeInMainWorld('electronAPI', {
    importVideo: (filePath: string) => ipcRenderer.invoke('video:import', filePath),
    exportVideo: (config: any) => ipcRenderer.invoke('video:export', config),
    // Add more IPC methods as needed
  });
  ```

- [ ] Update `package.json` scripts:
  ```json
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview"
  }
  ```

- [ ] Configure `vite.config.ts` with electron plugin
- [ ] Test Electron window launches

**Acceptance Criteria:**
- Electron window opens showing React app
- Dev tools accessible
- Hot reload works

---

### Task 0.3: Install FFmpeg (30 min)
- [ ] Install fluent-ffmpeg: `npm install fluent-ffmpeg @types/fluent-ffmpeg`
- [ ] Install ffmpeg binary:
  - **Mac**: `brew install ffmpeg` (or download from ffmpeg.org)
  - **Windows**: Download static build from ffmpeg.org
- [ ] Create `electron/ipc/ffmpeg.ts`:
  ```typescript
  import ffmpeg from 'fluent-ffmpeg';
  import { ipcMain } from 'electron';

  // Set ffmpeg path if needed
  // ffmpeg.setFfmpegPath('/path/to/ffmpeg');

  ipcMain.handle('ffmpeg:probe', async (event, filePath: string) => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  });
  ```

- [ ] Test FFmpeg works: Run `ffmpeg -version` in terminal

**Acceptance Criteria:**
- FFmpeg command runs successfully
- Can call ffprobe on a test video
- No "FFmpeg not found" errors

---

### Task 0.4: Setup Project Structure (30 min)
- [ ] Create directory structure:
  ```
  src/
  ├── components/
  │   ├── Timeline/
  │   ├── VideoPlayer/
  │   ├── MediaLibrary/
  │   ├── RecordingPanel/
  │   └── TranscriptionPanel/
  ├── store/
  │   └── useStore.ts
  ├── types/
  │   └── index.ts
  └── utils/
  ```

- [ ] Create TypeScript types in `src/types/index.ts`:
  ```typescript
  export interface Clip {
    id: string;
    filePath: string;
    fileName: string;
    duration: number;
    resolution: string;
    fileSize: number;
    thumbnail?: string;
    format: string;
    hasAudio: boolean;
    createdAt: Date;
  }

  export interface TimelineClip {
    id: string;
    clipId: string;
    trackId: number;
    startTime: number;
    duration: number;
    trimStart: number;
    trimEnd: number;
  }
  ```

- [ ] Create Zustand store in `src/store/useStore.ts`:
  ```typescript
  import { create } from 'zustand';
  import { Clip, TimelineClip } from '../types';

  interface AppState {
    clips: Clip[];
    timelineClips: TimelineClip[];
    playhead: number;
    isPlaying: boolean;
    addClip: (clip: Clip) => void;
    addToTimeline: (clip: TimelineClip) => void;
    setPlayhead: (time: number) => void;
  }

  export const useStore = create<AppState>((set) => ({
    clips: [],
    timelineClips: [],
    playhead: 0,
    isPlaying: false,
    addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
    addToTimeline: (clip) => set((state) => ({ timelineClips: [...state.timelineClips, clip] })),
    setPlayhead: (time) => set({ playhead: time }),
  }));
  ```

**Acceptance Criteria:**
- All directories created
- Types compile without errors
- Zustand store accessible in components

---

### Task 0.5: Install UI Dependencies (30 min)
- [ ] Install shadcn/ui or Material-UI:
  ```bash
  # If using shadcn/ui
  npx shadcn-ui@latest init
  npx shadcn-ui@latest add button dialog input
  ```

- [ ] Install additional UI libraries:
  ```bash
  npm install react-icons lucide-react
  npm install react-split-pane
  npm install react-dnd react-dnd-html5-backend
  ```

- [ ] Create basic app layout in `src/App.tsx`:
  ```tsx
  import SplitPane from 'react-split-pane';

  function App() {
    return (
      <div className="h-screen flex flex-col">
        {/* Menu Bar */}
        <div className="h-12 bg-gray-800 text-white flex items-center px-4">
          ClipForge
        </div>

        {/* Main Content */}
        <SplitPane split="vertical" minSize={200} defaultSize={300}>
          <div className="bg-gray-100 p-4">Media Library</div>
          <SplitPane split="horizontal" minSize={200} defaultSize="60%">
            <div className="bg-black flex items-center justify-center">
              Video Preview
            </div>
            <div className="bg-gray-200 p-4">Timeline</div>
          </SplitPane>
        </SplitPane>
      </div>
    );
  }
  ```

**Acceptance Criteria:**
- App shows split pane layout
- Resizable panels work
- Basic styling applied

---

## Phase 1: MVP Development (Day 1-2)
**Duration**: 20-24 hours  
**Goal**: Complete all MVP requirements for Tuesday 10:59 PM CT deadline

### Task 1.1: Video Import (3 hours)

#### 1.1a: File Picker Import
- [ ] Create import button in Media Library
- [ ] Add IPC handler in `electron/ipc/ffmpeg.ts`:
  ```typescript
  ipcMain.handle('video:import', async (event, filePath: string) => {
    const metadata = await ffmpeg.ffprobe(filePath);
    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    
    return {
      id: Date.now().toString(),
      filePath,
      fileName: path.basename(filePath),
      duration: metadata.format.duration,
      resolution: `${videoStream.width}x${videoStream.height}`,
      fileSize: metadata.format.size,
      format: metadata.format.format_name,
      hasAudio: metadata.streams.some(s => s.codec_type === 'audio'),
      createdAt: new Date()
    };
  });
  ```

- [ ] Implement file dialog in renderer:
  ```typescript
  const handleImport = async () => {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'mov', 'webm', 'avi'] }
      ]
    });
    
    if (!result.canceled) {
      for (const filePath of result.filePaths) {
        const clip = await window.electronAPI.importVideo(filePath);
        useStore.getState().addClip(clip);
      }
    }
  };
  ```

#### 1.1b: Drag & Drop Import
- [ ] Add drag & drop zone in Media Library
- [ ] Handle drop events:
  ```typescript
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      const clip = await window.electronAPI.importVideo(file.path);
      useStore.getState().addClip(clip);
    }
  };
  ```

#### 1.1c: Media Library UI
- [ ] Create `src/components/MediaLibrary/MediaLibrary.tsx`
- [ ] Display imported clips in grid
- [ ] Show filename, duration, resolution
- [ ] Generate placeholder thumbnails (gray boxes with file icon)

**Acceptance Criteria:**
- Can import videos via button and drag-drop
- Clips appear in media library
- Metadata displays correctly
- Multiple imports work

**Time Checkpoint**: End of Monday afternoon (~6 PM)

---

### Task 1.2: Video Preview Player (2 hours)

- [ ] Create `src/components/VideoPlayer/VideoPlayer.tsx`
- [ ] Install Video.js if not already: `npm install video.js`
- [ ] Implement Video.js wrapper:
  ```tsx
  import { useEffect, useRef } from 'react';
  import videojs from 'video.js';
  import 'video.js/dist/video-js.css';

  export default function VideoPlayer({ src }: { src: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<any>(null);

    useEffect(() => {
      if (videoRef.current) {
        playerRef.current = videojs(videoRef.current, {
          controls: true,
          fluid: true,
          preload: 'auto'
        });
      }

      return () => {
        if (playerRef.current) {
          playerRef.current.dispose();
        }
      };
    }, []);

    useEffect(() => {
      if (playerRef.current && src) {
        playerRef.current.src({ src, type: 'video/mp4' });
      }
    }, [src]);

    return (
      <div data-vjs-player>
        <video ref={videoRef} className="video-js vjs-big-play-centered" />
      </div>
    );
  }
  ```

- [ ] Connect player to selected clip from media library
- [ ] Implement click to preview functionality
- [ ] Add play/pause button
- [ ] Add seek functionality

**Acceptance Criteria:**
- Clicking clip loads it in player
- Video plays with audio
- Can seek to any position
- Player controls work

---

### Task 1.3: Basic Timeline View (4 hours)

#### 1.3a: Timeline Container & Ruler
- [ ] Create `src/components/Timeline/Timeline.tsx`
- [ ] Initialize Wavesurfer.js:
  ```typescript
  import WaveSurfer from 'wavesurfer.js';

  const wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#ddd',
    progressColor: '#4CAF50',
    height: 100,
    backend: 'MediaElement'
  });
  ```

- [ ] Create time ruler showing seconds/minutes
- [ ] Add zoom controls (+ / - buttons)
- [ ] Implement horizontal scrolling

#### 1.3b: Timeline Tracks
- [ ] Create `src/components/Timeline/TimelineTrack.tsx`
- [ ] Render at least 2 tracks (main video + overlay)
- [ ] Add track headers/labels

#### 1.3c: Playhead
- [ ] Create `src/components/Timeline/Playhead.tsx`
- [ ] Render red vertical line at current time
- [ ] Sync playhead with video player
- [ ] Click timeline to move playhead

#### 1.3d: Drag Clips to Timeline
- [ ] Integrate react-dnd
- [ ] Make media library clips draggable
- [ ] Make timeline a drop zone
- [ ] Add clip to timeline on drop
- [ ] Create `TimelineClip` component showing clip on timeline

**Acceptance Criteria:**
- Timeline shows time ruler
- Playhead moves during playback
- Can drag clips from library to timeline
- Timeline displays clips visually

**Time Checkpoint**: End of Monday night (~11 PM)

---

### Task 1.4: Trim Functionality (3 hours)

- [ ] Add trim handles to timeline clips (left and right edges)
- [ ] Implement drag-to-trim on handles:
  ```typescript
  const handleTrimStart = (e: MouseEvent) => {
    const newTrimStart = calculateTrimFromMouseX(e.clientX);
    updateClip(clipId, { trimStart: newTrimStart });
  };
  ```

- [ ] Show visual indicators for trimmed regions (e.g., semi-transparent overlay)
- [ ] Update clip duration on timeline when trimmed
- [ ] Add "Set In Point" button (keyboard: I)
- [ ] Add "Set Out Point" button (keyboard: O)
- [ ] Update preview player to show trimmed range

**Acceptance Criteria:**
- Can drag trim handles to adjust clip start/end
- Trimmed clip updates visually
- Preview reflects trim changes
- I/O keyboard shortcuts work

**Time Checkpoint**: Tuesday morning (~10 AM)

---

### Task 1.5: Basic Export (4 hours)

#### 1.5a: Export Dialog
- [ ] Create `src/components/ExportDialog/ExportDialog.tsx`
- [ ] Add export button to UI
- [ ] Dialog shows:
  - Output filename input
  - Resolution dropdown (Source, 1080p, 720p)
  - Output location picker
  - Export button

#### 1.5b: FFmpeg Export Handler
- [ ] Create IPC handler in `electron/ipc/ffmpeg.ts`:
  ```typescript
  ipcMain.handle('video:export', async (event, config) => {
    const { clips, outputPath, resolution } = config;
    
    // For single clip (MVP):
    const clip = clips[0];
    
    return new Promise((resolve, reject) => {
      ffmpeg(clip.filePath)
        .setStartTime(clip.trimStart)
        .setDuration(clip.duration)
        .size(resolution)
        .output(outputPath)
        .on('progress', (progress) => {
          event.sender.send('export:progress', progress.percent);
        })
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', (err) => reject(err))
        .run();
    });
  });
  ```

#### 1.5c: Progress Indicator
- [ ] Show progress bar during export
- [ ] Display percentage complete
- [ ] Add cancel button
- [ ] Show success notification on completion

#### 1.5d: Single Clip Export
- [ ] Export first clip on timeline with trim applied
- [ ] Test exported video plays in VLC/QuickTime
- [ ] Verify audio is included

**Acceptance Criteria:**
- Export dialog opens and closes
- Clicking export starts FFmpeg process
- Progress bar updates in real-time
- Exported MP4 file is playable
- Trimmed regions are applied correctly

**Time Checkpoint**: Tuesday afternoon (~4 PM)

---

### Task 1.6: Package Application (2 hours)

- [ ] Configure `electron-builder.yml`:
  ```yaml
  appId: com.gauntlet.clipforge
  productName: ClipForge
  directories:
    output: dist-electron
  mac:
    category: public.app-category.video
    target: dmg
  win:
    target: nsis
  ```

- [ ] Update package.json:
  ```json
  "build": {
    "appId": "com.gauntlet.clipforge",
    "files": ["dist/**/*", "electron/**/*"],
    "extraResources": ["ffmpeg/**/*"]
  }
  ```

- [ ] Bundle FFmpeg binaries with app
- [ ] Build app: `npm run build`
- [ ] Test packaged app on target OS
- [ ] Fix any "module not found" errors
- [ ] Create installer/dmg

**Acceptance Criteria:**
- App builds without errors
- Installer installs successfully
- Packaged app launches
- All features work in packaged mode
- No "FFmpeg not found" errors

**Time Checkpoint**: Tuesday evening (~8 PM)

---

### Task 1.7: MVP Testing & Bug Fixes (2 hours)

- [ ] Test full workflow:
  1. Import 2-3 videos
  2. Drag clips to timeline
  3. Trim at least one clip
  4. Export to MP4
  5. Play exported video

- [ ] Fix any crashes or critical bugs
- [ ] Test on clean machine (no dev tools)
- [ ] Verify packaged app works
- [ ] Create MVP demo video (2 min showing import, trim, export)

**Acceptance Criteria:**
- Complete workflow works without crashes
- Exported video is correct
- Demo video recorded
- Ready to submit MVP

**🚨 MVP DEADLINE: Tuesday, October 28th, 10:59 PM CT 🚨**

---

## Phase 2: Core Features (Day 2-3)
**Duration**: 18-20 hours  
**Goal**: Complete all core features for final submission Wednesday night

### Task 2.1: Screen Recording (4 hours)

#### 2.1a: Screen Capture Setup
- [ ] Add screen recording button to UI
- [ ] Implement desktopCapturer in main process:
  ```typescript
  ipcMain.handle('recorder:getSources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window']
    });
    return sources;
  });
  ```

- [ ] Create screen selection dialog in renderer
- [ ] Show list of available screens and windows

#### 2.1b: Recording Implementation
- [ ] Start recording with getUserMedia:
  ```typescript
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId
      }
    }
  });
  
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];
  
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    // Save to file
  };
  
  mediaRecorder.start();
  ```

- [ ] Add recording controls (start, stop, pause)
- [ ] Show recording indicator (red dot)
- [ ] Display recording timer

#### 2.1c: Save Recording
- [ ] Save recorded blob to file system
- [ ] Auto-import recording to media library
- [ ] Generate thumbnail
- [ ] Add to timeline automatically (optional)

**Acceptance Criteria:**
- Can list available screens/windows
- Recording starts and stops correctly
- Recorded video saves as WebM
- Recording appears in media library

**Time Checkpoint**: Wednesday morning (~10 AM)

---

### Task 2.2: Webcam Recording (2 hours)

- [ ] Add webcam recording button
- [ ] List available cameras:
  ```typescript
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter(d => d.kind === 'videoinput');
  ```

- [ ] Create camera selection dropdown
- [ ] Show webcam preview before recording
- [ ] Implement recording similar to screen capture
- [ ] Add microphone selection
- [ ] Show audio level meters

**Acceptance Criteria:**
- Can select camera from list
- Webcam preview shows
- Recording saves with audio
- Webcam recordings appear in library

---

### Task 2.3: Multi-Clip Timeline & Sequencing (3 hours)

#### 2.3a: Multiple Clips on Timeline
- [ ] Allow dragging multiple clips to timeline
- [ ] Arrange clips in sequence
- [ ] Auto-snap clips to each other
- [ ] Show gaps between clips visually

#### 2.3b: Clip Manipulation
- [ ] Drag clips to reorder on timeline
- [ ] Trim clips directly on timeline (already done in MVP)
- [ ] Split clip at playhead:
  ```typescript
  const splitClip = (clipId: string, splitTime: number) => {
    const clip = findClip(clipId);
    const leftClip = { ...clip, duration: splitTime };
    const rightClip = { ...clip, trimStart: splitTime, duration: clip.duration - splitTime };
    return [leftClip, rightClip];
  };
  ```

- [ ] Delete clips from timeline (keyboard: Delete)
- [ ] Duplicate clips (keyboard: Cmd+D)

#### 2.3c: Multi-Track Support
- [ ] Allow clips on Track 1 and Track 2
- [ ] Track 2 overlays on Track 1 (Picture-in-Picture)
- [ ] Resize and position overlays
- [ ] Set overlay opacity/blend mode

**Acceptance Criteria:**
- Can add 5+ clips to timeline
- Clips play in sequence
- Can split and delete clips
- Overlay track works

**Time Checkpoint**: Wednesday early afternoon (~2 PM)

---

### Task 2.4: AI Transcription (3 hours)

#### 2.4a: Extract Audio for Transcription
- [ ] Create FFmpeg handler to extract audio:
  ```typescript
  ipcMain.handle('video:extractAudio', async (event, videoPath) => {
    const audioPath = videoPath.replace('.mp4', '.wav');
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .output(audioPath)
        .on('end', () => resolve(audioPath))
        .on('error', reject)
        .run();
    });
  });
  ```

#### 2.4b: Call OpenAI Whisper API
- [ ] Install openai SDK: `npm install openai`
- [ ] Create transcription handler:
  ```typescript
  import OpenAI from 'openai';
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  ipcMain.handle('transcription:create', async (event, audioPath) => {
    const audioFile = fs.createReadStream(audioPath);
    
    const transcript = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    });
    
    return transcript;
  });
  ```

#### 2.4c: Transcription Panel UI
- [ ] Create `src/components/TranscriptionPanel/TranscriptionPanel.tsx`
- [ ] Add "Transcribe" button on clips
- [ ] Show loading spinner during transcription
- [ ] Display transcript text
- [ ] Show word-level timestamps
- [ ] Click word to jump to that time in video

#### 2.4d: Export Transcripts
- [ ] Export as plain text (.txt)
- [ ] Export as SRT subtitles:
  ```
  1
  00:00:00,000 --> 00:00:02,500
  This is the first subtitle
  ```

- [ ] Export as VTT (WebVTT format)
- [ ] Copy to clipboard button

**Acceptance Criteria:**
- Can transcribe imported videos
- Transcription accuracy is good
- Can click words to seek video
- Can export as TXT, SRT, VTT

**Time Checkpoint**: Wednesday late afternoon (~5 PM)

---

### Task 2.5: Enhanced Export (2 hours)

#### 2.5a: Multi-Clip Export
- [ ] Update FFmpeg export to handle multiple clips:
  ```typescript
  // Create concat file
  const concatFile = clips.map(c => `file '${c.filePath}'`).join('\n');
  
  ffmpeg()
    .input(concatFilePath)
    .inputOptions(['-f concat', '-safe 0'])
    .outputOptions(['-c copy'])
    .output(outputPath)
    .run();
  ```

- [ ] Handle trimmed clips correctly
- [ ] Apply transitions between clips (if time)

#### 2.5b: Export Options
- [ ] Resolution presets (720p, 1080p, source)
- [ ] Quality/bitrate selector (Low, Medium, High)
- [ ] Frame rate options (24, 30, 60 fps)
- [ ] Audio bitrate options

#### 2.5c: Multi-Track Export
- [ ] Overlay Track 2 on Track 1
- [ ] Position overlays correctly
- [ ] Apply overlay opacity
- [ ] Use FFmpeg overlay filter:
  ```bash
  ffmpeg -i main.mp4 -i overlay.mp4 -filter_complex \
    "[1:v]scale=320:240[v1];[0:v][v1]overlay=x=10:y=10" output.mp4
  ```

**Acceptance Criteria:**
- Can export timeline with multiple clips
- Clips concatenate correctly
- Overlays render in correct position
- Quality options work

---

### Task 2.6: Polish & UX Improvements (2 hours)

- [ ] Add keyboard shortcuts:
  - Space: Play/Pause
  - I/O: Set in/out points
  - S: Split clip
  - Delete: Remove clip
  - Cmd+Z: Undo
  - Cmd+E: Export

- [ ] Add undo/redo functionality (use zustand middleware)
- [ ] Improve timeline zoom (smooth zooming)
- [ ] Add snap-to-grid on timeline
- [ ] Show tooltips on hover
- [ ] Add loading states for all async operations
- [ ] Better error messages
- [ ] Dark mode theme
- [ ] App icon and branding

**Acceptance Criteria:**
- Keyboard shortcuts work
- UI feels responsive
- Error messages are clear
- App looks polished

**Time Checkpoint**: Wednesday evening (~8 PM)

---

### Task 2.7: Final Testing & Packaging (2 hours)

- [ ] Full end-to-end testing:
  1. Import 3 videos
  2. Record screen capture
  3. Record webcam
  4. Arrange clips on timeline
  5. Split and trim clips
  6. Add overlay on second track
  7. Transcribe one video
  8. Export final video at 1080p
  9. Verify exported video

- [ ] Test on clean machine
- [ ] Package final build
- [ ] Create GitHub release with installer
- [ ] Upload to Google Drive/Dropbox as backup
- [ ] Test download and install from release

**Acceptance Criteria:**
- All features work in packaged app
- No crashes during demo workflow
- Installer works on clean machine

---

### Task 2.8: Demo Video & Documentation (1 hour)

- [ ] Record 3-5 minute demo video showing:
  - App launch
  - Import clips
  - Screen recording
  - Timeline editing (trim, split, arrange)
  - Transcription feature
  - Export to MP4
  - Final exported video playback

- [ ] Update README.md:
  - Project description
  - Features list
  - Installation instructions
  - How to build from source
  - Tech stack details
  - Known limitations
  - Screenshots

- [ ] Add architecture diagram
- [ ] Document any known bugs
- [ ] Include troubleshooting section

**🚨 FINAL DEADLINE: Wednesday, October 29th, 10:59 PM CT 🚨**

---

## Phase 3: Stretch Goals (If Time Permits)
**Duration**: Variable  
**Priority**: Low (only if core features are done)

### Stretch 3.1: Text Overlays (3 hours)
- [ ] Add text layer to timeline
- [ ] Position text on video
- [ ] Font selection
- [ ] Text animations (fade in/out)
- [ ] Export with burned-in text

### Stretch 3.2: Transitions (2 hours)
- [ ] Fade transition between clips
- [ ] Cross-dissolve
- [ ] Slide transitions
- [ ] Adjustable transition duration

### Stretch 3.3: Audio Controls (2 hours)
- [ ] Volume adjustment per clip
- [ ] Fade in/out audio
- [ ] Audio ducking
- [ ] Normalize audio levels

### Stretch 3.4: Filters & Effects (3 hours)
- [ ] Brightness/contrast sliders
- [ ] Saturation control
- [ ] Color filters (B&W, Sepia)
- [ ] Crop and rotate

### Stretch 3.5: Export Presets (1 hour)
- [ ] YouTube preset (1080p, 16:9)
- [ ] Instagram Story (1080x1920, vertical)
- [ ] TikTok preset (1080x1920)
- [ ] Twitter preset (720p)

### Stretch 3.6: Local Transcription (4 hours)
- [ ] Install whisper.cpp Node.js bindings
- [ ] Download Whisper models
- [ ] Implement local transcription
- [ ] Add toggle: Cloud vs Local
- [ ] Show progress for local transcription

### Stretch 3.7: Advanced Features
- [ ] Auto-save project state
- [ ] Project file format (.clipforge)
- [ ] Background music track
- [ ] Green screen removal
- [ ] Speed control (slow-mo, time-lapse)
- [ ] Batch export multiple timelines

---

## Time Management Tips

### Daily Schedule Suggestion

**Monday (Oct 27)**
- 9:00 AM - 12:00 PM: Setup & Architecture (Phase 0)
- 12:00 PM - 1:00 PM: Lunch break
- 1:00 PM - 6:00 PM: Video import & player (Tasks 1.1, 1.2)
- 6:00 PM - 7:00 PM: Dinner break
- 7:00 PM - 11:00 PM: Timeline basics (Task 1.3)
- 11:00 PM: Sleep

**Tuesday (Oct 28) - MVP DEADLINE**
- 9:00 AM - 12:00 PM: Trim functionality (Task 1.4)
- 12:00 PM - 1:00 PM: Lunch break
- 1:00 PM - 5:00 PM: Export implementation (Task 1.5)
- 5:00 PM - 6:00 PM: Dinner break
- 6:00 PM - 8:00 PM: Packaging (Task 1.6)
- 8:00 PM - 10:00 PM: Testing & bug fixes (Task 1.7)
- **10:59 PM: SUBMIT MVP** ✅
- 11:00 PM: Sleep

**Wednesday (Oct 29) - FINAL DEADLINE**
- 9:00 AM - 1:00 PM: Recording features (Tasks 2.1, 2.2)
- 1:00 PM - 2:00 PM: Lunch break
- 2:00 PM - 5:00 PM: Multi-clip timeline & transcription (Tasks 2.3, 2.4)
- 5:00 PM - 6:00 PM: Dinner break
- 6:00 PM - 9:00 PM: Enhanced export & polish (Tasks 2.5, 2.6)
- 9:00 PM - 10:30 PM: Final testing & demo video (Tasks 2.7, 2.8)
- **10:59 PM: SUBMIT FINAL** ✅

---

## Risk Management & Fallbacks

### If Running Behind Schedule

**If behind by Tuesday morning:**
- Skip thumbnail generation (use generic icons)
- Simplify timeline UI (DOM-based instead of Canvas)
- Single clip export only for MVP

**If behind by Tuesday evening:**
- Skip packaging, submit with "run in dev mode" instructions
- Provide build instructions instead of installer
- Focus on getting core functionality working

**If behind by Wednesday:**
- Skip recording features (not required for MVP)
- Skip transcription (it's AI feature, not core)
- Focus on: import → timeline → export workflow
- Submit what works, even if incomplete

### Critical Blockers & Solutions

**Problem: FFmpeg not working**
- Solution: Use pre-built FFmpeg binaries from ffmpeg.org
- Test: `ffmpeg -version` should print version info
- Fallback: Use @ffmpeg/ffmpeg (browser-based, slower)

**Problem: Timeline performance issues**
- Solution: Limit visible clips, implement virtualization
- Fallback: Use simple DOM-based timeline without Canvas

**Problem: Export takes too long**
- Solution: Show progress, allow cancel
- Optimization: Use FFmpeg hardware acceleration (`-hwaccel auto`)

**Problem: Packaging fails**
- Solution: Submit with dev mode instructions
- Include clear build steps in README

---

## Testing Checklist

### Before MVP Submission (Tuesday)
- [ ] Import 3 different video files
- [ ] Drag clip to timeline
- [ ] Trim clip start and end
- [ ] Export to MP4
- [ ] Exported video plays correctly
- [ ] App packages without errors
- [ ] Packaged app launches

### Before Final Submission (Wednesday)
- [ ] All MVP tests pass
- [ ] Record 30-second screen capture
- [ ] Record webcam video
- [ ] Arrange 5+ clips on timeline
- [ ] Split clip in middle
- [ ] Delete clip from timeline
- [ ] Add overlay on Track 2
- [ ] Transcribe a video
- [ ] Export transcript as SRT
- [ ] Export multi-clip timeline
- [ ] Verify all exports play correctly
- [ ] Test on clean machine

---

## Submission Checklist

### Code Repository (GitHub)
- [ ] All code committed and pushed
- [ ] README.md with clear instructions
- [ ] Architecture documentation
- [ ] Screenshots of app
- [ ] .gitignore excludes node_modules, dist, etc.

### Packaged Application
- [ ] Built with electron-builder
- [ ] Installer uploaded to GitHub Releases
- [ ] Or: Google Drive/Dropbox link provided
- [ ] Platform-specific builds (Mac .dmg, Windows .exe)
- [ ] Build instructions in README

### Demo Video (3-5 minutes)
- [ ] Shows app launching
- [ ] Import workflow
- [ ] Recording workflow (screen + webcam)
- [ ] Timeline editing (trim, split, arrange)
- [ ] Transcription feature
- [ ] Export process
- [ ] Final exported video plays

### Documentation
- [ ] README includes:
  - What ClipForge does
  - Installation steps
  - How to run from source
  - Build instructions
  - Tech stack overview
  - Features completed
  - Known limitations/bugs
- [ ] Architecture diagram (optional but nice)
- [ ] Screenshots of main screens

---

## Emergency Contacts & Resources

### Documentation Links
- [Electron Docs](https://www.electronjs.org/docs/latest)
- [Video.js API](https://docs.videojs.com/)
- [Wavesurfer.js](https://wavesurfer-js.org/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Zustand Guide](https://docs.pmnd.rs/zustand/getting-started/introduction)

### Debugging Tips
- **Electron not launching**: Check electron/main.ts for syntax errors
- **IPC not working**: Verify contextBridge in preload.ts
- **FFmpeg errors**: Check file paths, ensure FFmpeg is in PATH
- **Video won't play**: Verify codec support, try different video
- **Export fails**: Check output path is writable, verify FFmpeg command

### FFmpeg Quick Reference

**Get video info:**
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

**Trim video:**
```bash
ffmpeg -i input.mp4 -ss 00:00:10 -to 00:00:30 -c copy output.mp4
```

**Concatenate videos:**
```bash
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

**Extract audio:**
```bash
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 output.wav
```

**Overlay video:**
```bash
ffmpeg -i base.mp4 -i overlay.mp4 -filter_complex "[1]scale=320:240[v];[0][v]overlay=10:10" out.mp4
```

---

## Final Reminders

1. **Submit on time** - Better to submit something incomplete than nothing
2. **Test early** - Don't wait until the last day to test packaging
3. **Commit often** - Push to GitHub every hour to avoid losing work
4. **Focus on MVP first** - Core features before polish
5. **Keep it simple** - Simple working features > complex broken features
6. **Ask for help** - If stuck for >30 minutes, seek help
7. **Take breaks** - 72 hours is a marathon, not a sprint

**You got this! 🚀**

Remember: A simple, working video editor beats a complex, broken one. Focus on the core loop: Import → Arrange → Export. Everything else is bonus.

Good luck shipping ClipForge!
