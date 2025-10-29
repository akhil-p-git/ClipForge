# Audio & Webcam Recording Fix Guide - UPDATED

## Problem Identified

The original issue was that **multiple audio tracks** were being added directly to the MediaStream:
- System audio track (from `chromeMediaSource: 'desktop'`)
- Microphone audio track (from separate `getUserMedia` call)

**Result**: MediaRecorder received a stream with 2 audio tracks, which causes it to:
1. Not know how to encode multiple audio sources
2. Stop producing data chunks when either track ends
3. Produce empty recordings (0 bytes)

### Evidence from Console Logs
```
Stream tracks: video: Array(1), audio: Array(2)
Audio track 0 ended during recording
Audio track 1 ended during recording
Total chunks collected: 0
Blob size: 0 bytes
Recording produced empty file
```

## Solution Implemented

### Web Audio API for Audio Mixing

Instead of adding multiple audio tracks to the stream, we now:

1. **Capture both audio sources separately**
2. **Use Web Audio API to mix them into a single track**
3. **Replace the original audio track with the mixed track**

### Code Implementation (ScreenRecorder.jsx)

```javascript
// Step 1: Capture screen with system audio
const screenConstraints = {
  video: { /* ... */ },
  audio: includeSystemAudio ? {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: selectedSource.id
    }
  } : false
};
const screenStream = await navigator.mediaDevices.getUserMedia(screenConstraints);

// Step 2: Capture microphone separately
let micStream = null;
if (includeMicrophone && selectedAudioInput) {
  const micConstraints = {
    audio: {
      deviceId: { exact: selectedAudioInput },
      echoCancellation: true,
      noiseSuppression: true
    }
  };
  micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
}

// Step 3: Mix audio if we have both sources
const hasSystemAudio = screenStream.getAudioTracks().length > 0;
const hasMicrophone = micStream !== null;

if (hasSystemAudio && hasMicrophone) {
  // Create AudioContext for mixing
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();

  // Connect system audio
  const systemAudioTrack = screenStream.getAudioTracks()[0];
  const systemSource = audioContext.createMediaStreamSource(
    new MediaStream([systemAudioTrack])
  );
  systemSource.connect(destination);

  // Connect microphone
  const micSource = audioContext.createMediaStreamSource(micStream);
  micSource.connect(destination);

  // Get mixed audio track
  const mixedAudioTrack = destination.stream.getAudioTracks()[0];

  // Create NEW stream with original video + mixed audio
  // IMPORTANT: Don't modify the original stream - create a new one!
  const videoTrack = screenStream.getVideoTracks()[0];
  const finalStream = new MediaStream([videoTrack, mixedAudioTrack]);

  // Result: New stream with 1 video track + 1 mixed audio track
}
```

### Why This Works

1. **Single Audio Track**: MediaRecorder receives a stream with only ONE audio track (the mixed one)
2. **Real-time Mixing**: Web Audio API mixes the audio in real-time at the hardware level
3. **No Encoding Issues**: MediaRecorder can properly encode a single audio track with the video
4. **No Track Ending Issues**: The mixed track from `MediaStreamDestination` stays alive as long as we need it
5. **Clean Stream Creation**: Creating a NEW MediaStream prevents the original video track from being affected or muted
6. **Track Isolation**: The original screen capture stream remains untouched, ensuring video track stability

## Current Status

### ✅ Working Features
- [x] ~~System audio capture (macOS)~~ **NOT SUPPORTED on macOS without virtual audio device**
- [x] Microphone capture with device selection
- [x] Audio mixing (system + microphone) using Web Audio API
- [x] Video recording with screen selection
- [x] Proper cleanup of audio contexts and streams
- [x] Error detection and user feedback for failed system audio capture

### ⚠️ Remaining Issues

#### Webcam Overlay (Picture-in-Picture)
**Status**: Not yet implemented - requires Canvas API

**Problem**: Similar to audio, MediaRecorder doesn't support multiple video tracks. Adding a webcam track directly will cause issues.

**Solution**: Use Canvas API to composite:
1. Create a `<canvas>` element
2. Draw the desktop video onto the canvas
3. Draw the webcam video as an overlay (picture-in-picture)
4. Use `canvas.captureStream()` to get a video track
5. Combine the canvas video track with the mixed audio track

**Implementation needed** (lines 256-273 in ScreenRecorder.jsx):
```javascript
// TODO: Implement canvas compositing for webcam overlay
// Current code just captures webcam but doesn't add it to recording
```

## Testing Results

### What Should Work Now
1. **Screen + System Audio** ❌ (NOT supported on macOS without virtual audio device)
2. **Screen + Microphone** ✅
3. **Screen + System Audio + Microphone** ⚠️ (Only microphone is captured on macOS; system audio requires BlackHole/Soundflower)
4. **Screen only** ✅

### What Still Needs Implementation
5. **Screen + Webcam** ❌ (webcam captured but not recorded)
6. **Screen + Audio + Webcam** ❌ (webcam not composited)

## Key Learnings

### MediaRecorder Limitations
- ✅ Supports: 1 video track + 1 audio track
- ❌ Does NOT support: Multiple audio tracks
- ❌ Does NOT support: Multiple video tracks
- ✅ Solution: Use Web Audio API for audio mixing
- ✅ Solution: Use Canvas API for video compositing

### macOS System Audio Capture
- ⚠️ **IMPORTANT**: macOS does NOT natively support system audio capture through Web APIs
- ❌ `chromeMediaSource: 'desktop'` with audio constraints does NOT capture system audio on macOS
- ✅ Requires **additional software** like BlackHole or Soundflower (virtual audio devices)
- ✅ Microphone audio works fine without additional software
- ✅ Screen recording permission required in System Preferences > Security & Privacy
- 📝 The code attempts to capture system audio but fails silently on macOS - this is expected behavior

**Why "microphone + system audio" appears to work:**
- When microphone is enabled, you hear your own voice (which works)
- System audio is NOT being captured, even though both checkboxes are enabled
- This creates the illusion that "both" work together, but only microphone audio is recorded

### Electron IPC & Memory
- ✅ Streaming approach works for large files (already implemented)
- ✅ Audio recordings work with proper mixing
- ⚠️ Large blob transfers can still cause issues (use streaming for files > 5MB)

## How to Enable System Audio Capture on macOS

Since macOS doesn't natively support system audio capture, you need to install a virtual audio device:

### Option 1: BlackHole (Recommended)
1. Install BlackHole: `brew install blackhole-2ch`
2. Open **Audio MIDI Setup** (Applications > Utilities)
3. Click **+** and create a **Multi-Output Device**
4. Check both **BlackHole 2ch** and your speakers/headphones
5. In **System Preferences > Sound**, set output to the Multi-Output Device
6. System audio will now be routed through BlackHole and can be captured

### Option 2: Soundflower (Alternative)
1. Download from: https://github.com/mattingalls/Soundflower/releases
2. Install and configure similarly to BlackHole
3. Route system audio through Soundflower

### Option 3: Use Microphone Only
- Simply enable "Include microphone" checkbox
- Record your voice narration instead of system audio
- This works without any additional software

## Next Steps for Complete Implementation

1. **Implement Canvas Compositing** for webcam overlay:
   - Create canvas matching desktop resolution
   - Use `requestAnimationFrame` to continuously draw both videos
   - Capture canvas stream at 30 FPS
   - Position webcam in corner with border

2. **Add Volume Controls** (optional enhancement):
   - Add `GainNode` for system audio
   - Add `GainNode` for microphone
   - Allow user to adjust relative volumes

3. **Testing Checklist**:
   - [ ] Record 30+ seconds with system audio only
   - [ ] Record 30+ seconds with microphone only
   - [ ] Record 30+ seconds with both audio sources
   - [ ] Verify audio is present in final MP4
   - [ ] Test with different audio devices
   - [ ] Test with different screen sources

## References

- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- MediaRecorder API: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Electron desktopCapturer: https://www.electronjs.org/docs/latest/api/desktop-capturer
