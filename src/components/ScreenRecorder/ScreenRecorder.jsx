import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import './ScreenRecorder.css';

function ScreenRecorder({ onClose }) {
  const { addClip, addToTimeline, timelineClips } = useStore();
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [includeMicrophone, setIncludeMicrophone] = useState(false);
  const [includeWebcam, setIncludeWebcam] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [webcamDevices, setWebcamDevices] = useState([]);
  const [selectedWebcam, setSelectedWebcam] = useState('');
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const videoStreamRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const screenVideoRef = useRef(null);
  const webcamVideoRef = useRef(null);
  const animationFrameRef = useRef(null);
  const previewWebcamRef = useRef(null);
  const preWebcamStreamRef = useRef(null);

  useEffect(() => {
    loadSources();
    loadAudioDevices();
    loadWebcamDevices();
    return () => {
      // Cleanup on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (preWebcamStreamRef.current) {
        preWebcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadAudioDevices = async () => {
    try {
      // First request permission by accessing getUserMedia
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioInputDevices(audioInputs);
      
      if (audioInputs.length > 0) {
        setSelectedAudioInput(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Error loading audio devices:', err);
      // Permission denied or not available - continue without microphone
    }
  };

  const loadWebcamDevices = async () => {
    try {
      // First request permission by accessing getUserMedia
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const webcams = devices.filter(device => device.kind === 'videoinput');
      setWebcamDevices(webcams);
      
      if (webcams.length > 0) {
        setSelectedWebcam(webcams[0].deviceId);
      }
    } catch (err) {
      console.warn('Error loading webcam devices:', err);
      // Permission denied or not available - continue without webcam
    }
  };

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Start webcam preview when enabled (but not recording)
  useEffect(() => {
    const startWebcamPreview = async () => {
      if (includeWebcam && selectedWebcam && !isRecording) {
        try {
          const webcamConstraints = {
            video: {
              deviceId: { exact: selectedWebcam },
              width: { ideal: 320 },
              height: { ideal: 240 }
            }
          };
          const webcamStream = await navigator.mediaDevices.getUserMedia(webcamConstraints);
          preWebcamStreamRef.current = webcamStream;

          if (previewWebcamRef.current) {
            previewWebcamRef.current.srcObject = webcamStream;
          }
        } catch (err) {
          console.warn('Could not start webcam preview:', err);
        }
      } else {
        // Stop preview when disabled
        if (preWebcamStreamRef.current) {
          preWebcamStreamRef.current.getTracks().forEach(track => track.stop());
          preWebcamStreamRef.current = null;
        }
        if (previewWebcamRef.current) {
          previewWebcamRef.current.srcObject = null;
        }
      }
    };

    startWebcamPreview();

    return () => {
      if (preWebcamStreamRef.current) {
        preWebcamStreamRef.current.getTracks().forEach(track => track.stop());
        preWebcamStreamRef.current = null;
      }
    };
  }, [includeWebcam, selectedWebcam, isRecording]);

  const loadSources = async () => {
    try {
      if (!window.electronAPI) {
        setError('Screen recording is only available in Electron');
        return;
      }

      const availableSources = await window.electronAPI.getRecorderSources();
      setSources(availableSources);
      
      // Auto-select first screen source if available
      const screenSource = availableSources.find(s => s.name.includes('Screen') || s.name.includes('Entire Screen'));
      if (screenSource) {
        setSelectedSource(screenSource);
      } else if (availableSources.length > 0) {
        setSelectedSource(availableSources[0]);
      }
    } catch (err) {
      console.error('Error loading sources:', err);
      setError('Failed to load screen sources');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!selectedSource) {
      setError('Please select a screen or window');
      return;
    }

    try {
      setError(null);
      
      // Request screen capture with system audio (requested together for better compatibility)
      const screenConstraints = {
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080
          }
        },
        audio: includeSystemAudio ? {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id
          }
        } : false
      };

      // CRITICAL: Always capture video-only first to prevent video track muting
      // System audio requested with video can cause video track to mute on macOS
      let screenStream;

      // ALWAYS request video-only initially - this prevents video track muting issues
      const videoOnlyConstraints = {
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id
          }
        },
        audio: false  // NEVER request audio with video - it causes video track to mute
      };

      try {
        screenStream = await navigator.mediaDevices.getUserMedia(videoOnlyConstraints);
        console.log('Screen stream captured (video only):', {
          videoTracks: screenStream.getVideoTracks().length,
          audioTracks: screenStream.getAudioTracks().length
        });
        
        // Verify video track immediately
        const videoTrack = screenStream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState !== 'live') {
          throw new Error(`Video track not live: ${videoTrack?.readyState}`);
        }
        if (videoTrack.muted) {
          throw new Error('Video track is muted immediately after capture');
        }
        console.log('Video track verified:', {
          id: videoTrack.id,
          enabled: videoTrack.enabled,
          muted: videoTrack.muted,
          readyState: videoTrack.readyState
        });
      } catch (err) {
        console.error('Failed to capture screen:', err);
        throw new Error(`Screen capture failed: ${err.message}`);
      }

      // System audio capture temporarily disabled - causes crashes
      // TODO: Fix system audio capture stability before re-enabling
      let systemAudioCaptured = false;
      if (includeSystemAudio) {
        console.warn('System audio is temporarily disabled - it causes app crashes');
        console.warn('Please use microphone for audio recording instead');
        // Don't throw error - just continue without system audio
      }

      // Capture microphone separately if requested
      // CRITICAL: Add microphone track BEFORE checking video track state
      if (includeMicrophone && selectedAudioInput) {
        try {
          const micConstraints = {
            audio: {
              deviceId: { exact: selectedAudioInput },
              echoCancellation: true,
              noiseSuppression: true
            }
          };
          const micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
          microphoneStreamRef.current = micStream;
          
          // Verify video track is still good BEFORE adding audio
          const videoTrackBefore = screenStream.getVideoTracks()[0];
          if (videoTrackBefore.muted || videoTrackBefore.readyState !== 'live') {
            throw new Error(`Video track compromised before adding audio: muted=${videoTrackBefore.muted}, state=${videoTrackBefore.readyState}`);
          }
          
          // Add microphone track directly to screenStream
          micStream.getAudioTracks().forEach(track => {
            screenStream.addTrack(track);
            console.log('Added microphone track:', track.id);
          });
          
          // Verify video track is STILL good after adding audio
          const videoTrackAfter = screenStream.getVideoTracks()[0];
          if (videoTrackAfter.muted || videoTrackAfter.readyState !== 'live') {
            console.error('Video track became muted/inactive after adding microphone!');
            console.error('Before:', { muted: videoTrackBefore.muted, state: videoTrackBefore.readyState });
            console.error('After:', { muted: videoTrackAfter.muted, state: videoTrackAfter.readyState });
            throw new Error('Video track became muted after adding microphone track');
          }
          
          console.log('Microphone added successfully, video track still OK');
        } catch (micErr) {
          console.error('Failed to add microphone:', micErr);
          throw new Error(`Microphone capture failed: ${micErr.message}`);
        }
      } else {
        console.log('No microphone requested, recording video only');
      }

      // screenStream is ready - microphone already added above if requested

      // Add webcam for picture-in-picture if requested
      // Use Canvas API to composite webcam feed onto screen recording
      let stream = screenStream;
      if (includeWebcam && selectedWebcam) {
        try {
          const webcamConstraints = {
            video: {
              deviceId: { exact: selectedWebcam },
              width: { ideal: 320 },
              height: { ideal: 240 }
            }
          };
          const webcamStream = await navigator.mediaDevices.getUserMedia(webcamConstraints);
          webcamStreamRef.current = webcamStream;

          // Show webcam preview during recording
          if (previewWebcamRef.current) {
            previewWebcamRef.current.srcObject = webcamStream;
          }

          // Create canvas to composite screen + webcam
          const canvas = document.createElement('canvas');
          canvasRef.current = canvas;

          // Create video elements to display the streams
          const screenVideo = document.createElement('video');
          const webcamVideo = document.createElement('video');
          screenVideoRef.current = screenVideo;
          webcamVideoRef.current = webcamVideo;

          // Set up screen video
          screenVideo.srcObject = screenStream;
          screenVideo.autoplay = true;
          screenVideo.muted = true;

          // Set up webcam video
          webcamVideo.srcObject = webcamStream;
          webcamVideo.autoplay = true;
          webcamVideo.muted = true;

          // Wait for videos to load metadata
          await Promise.all([
            new Promise(resolve => screenVideo.onloadedmetadata = resolve),
            new Promise(resolve => webcamVideo.onloadedmetadata = resolve)
          ]);

          // Play both videos
          await screenVideo.play();
          await webcamVideo.play();

          // Set canvas dimensions to match screen video
          canvas.width = screenVideo.videoWidth;
          canvas.height = screenVideo.videoHeight;

          const ctx = canvas.getContext('2d');

          // Calculate webcam dimensions (20% of screen width, maintain aspect ratio)
          const webcamWidth = canvas.width * 0.2;
          const webcamHeight = (webcamVideo.videoHeight / webcamVideo.videoWidth) * webcamWidth;

          // Position webcam in bottom-right corner with 20px padding
          const webcamX = canvas.width - webcamWidth - 20;
          const webcamY = canvas.height - webcamHeight - 20;

          // Draw composite frame
          const drawFrame = () => {
            if (!canvasRef.current) return; // Stop if canvas was cleaned up

            // Draw screen
            ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

            // Draw webcam with border
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(webcamX - 5, webcamY - 5, webcamWidth + 10, webcamHeight + 10);
            ctx.drawImage(webcamVideo, webcamX, webcamY, webcamWidth, webcamHeight);

            animationFrameRef.current = requestAnimationFrame(drawFrame);
          };

          drawFrame();

          // Create stream from canvas with audio from screenStream
          const canvasStream = canvas.captureStream(30); // 30fps
          const compositeStream = new MediaStream();

          // Add video track from canvas
          canvasStream.getVideoTracks().forEach(track => compositeStream.addTrack(track));

          // Add audio tracks from screen stream (includes microphone if enabled)
          screenStream.getAudioTracks().forEach(track => compositeStream.addTrack(track));

          stream = compositeStream;
          console.log('Picture-in-picture webcam composited successfully');
        } catch (webcamErr) {
          console.warn('Could not add webcam PiP:', webcamErr);
          // Continue with screen-only recording
          stream = screenStream;
        }
      }

      videoStreamRef.current = stream;
      streamRef.current = stream;

      // Verify stream integrity - video track should still be connected to original source
      console.log('Final stream composition:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        active: stream.active,
        videoTrackState: stream.getVideoTracks()[0]?.readyState,
        videoTrackEnabled: stream.getVideoTracks()[0]?.enabled,
        videoTrackMuted: stream.getVideoTracks()[0]?.muted
      });

      // CRITICAL: Verify video track is actually working
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track in stream!');
      }
      if (videoTrack.readyState !== 'live') {
        throw new Error(`Video track not live: ${videoTrack.readyState}`);
      }
      // CRITICAL: Video track must not be muted - if it is, try to fix it
      if (videoTrack.muted) {
        console.error('Video track is muted BEFORE starting recording! Attempting to fix...');
        videoTrack.enabled = true;
        // Force unmute by toggling enabled state
        videoTrack.enabled = false;
        await new Promise(resolve => setTimeout(resolve, 50));
        videoTrack.enabled = true;
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (videoTrack.muted) {
          console.error('Video track still muted after fix attempt - this will cause empty recordings');
          // Still try to continue - maybe it will unmute when MediaRecorder starts
        } else {
          console.log('Video track unmuted successfully');
        }
      }

      // Determine if we have any audio tracks (system audio or microphone)
      const hasAudio = stream.getAudioTracks().length > 0;

      // Log audio status
      console.log('Final stream audio status:', {
        includeSystemAudio,
        includeMicrophone,
        systemAudioCaptured,
        audioTracksCount: stream.getAudioTracks().length,
        hasAudio
      });

      // Ensure all video and audio tracks are enabled and not muted BEFORE creating MediaRecorder
      stream.getVideoTracks().forEach(track => {
        if (!track.enabled) {
          console.warn('Video track was disabled, enabling it');
          track.enabled = true;
        }
        if (track.muted) {
          console.warn('Video track was muted');
          track.enabled = true; // Re-enable to try to unmute
        }
      });
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`Audio track ${index}:`, {
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
        if (!track.enabled) {
          console.warn('Audio track was disabled, enabling it');
          track.enabled = true;
        }
        if (track.muted) {
          console.warn('Audio track was muted');
          track.enabled = true; // Re-enable to try to unmute
        }
        // Verify track is actually live
        if (track.readyState !== 'live') {
          console.error(`Audio track ${index} is not live: ${track.readyState}`);
        }
      });

      // Log audio status
      if ((includeSystemAudio || includeMicrophone) && !hasAudio) {
        console.warn('Audio was requested but not captured. Recording video only.');
      }
      console.log('Stream has audio tracks:', hasAudio);
      console.log('Video tracks:', stream.getVideoTracks().length);
      console.log('Audio tracks:', stream.getAudioTracks().length);

      // Create MediaRecorder options
      const options = {
        mimeType: 'video/webm;codecs=vp9'
      };

      // Try to find a compatible codec
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }
      }

      // Validate stream before creating MediaRecorder
      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('No video tracks available in stream');
      }

      // Try creating MediaRecorder with different codec options
      let mediaRecorder;
      let recorderOptions = null;
      
      const codecOptions = hasAudio ? [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ] : [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      
      let recorderCreated = false;
      for (const mimeType of codecOptions) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          try {
            recorderOptions = { mimeType };
            console.log('Trying MediaRecorder with:', mimeType);
            mediaRecorder = new MediaRecorder(stream, recorderOptions);
            console.log('Successfully created MediaRecorder with:', mimeType);
            recorderCreated = true;
            break;
          } catch (err) {
            console.warn('Failed to create with', mimeType, err);
            continue;
          }
        }
      }
      
      // If all codec-specific attempts failed, try default
      if (!recorderCreated) {
        console.log('Trying MediaRecorder with default options');
        try {
          mediaRecorder = new MediaRecorder(stream);
          recorderOptions = null;
          console.log('Created MediaRecorder with default options');
        } catch (fallbackErr) {
          throw new Error(`Failed to create MediaRecorder: ${fallbackErr.message}`);
        }
      }
      
      // Store options for later use
      if (!recorderOptions) {
        recorderOptions = { mimeType: mediaRecorder.mimeType || 'video/webm' };
      }
      
      console.log('Using MediaRecorder with mimeType:', recorderOptions.mimeType);
      
      // Store options and recorder
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      // Store options and audio state for use in onstop handler
      const finalMimeType = recorderOptions.mimeType;
      const finalHasAudio = hasAudio;
      
      // Streaming approach for audio: send chunks directly to main process as they arrive
      // This prevents accumulating all data in memory which causes crashes
      let streamingTempFilePath = null;
      let streamingInitialized = false;
      
      // Initialize streaming file if audio is present (to avoid memory issues)
      // Also ALWAYS use streaming for audio to prevent crashes
      if (finalHasAudio) {
        try {
          const initResult = await window.electronAPI.initStreamingFile({
            fileName: `streaming_recording_${Date.now()}.webm`
          });
          if (initResult.success) {
            streamingTempFilePath = initResult.tempFilePath;
            streamingInitialized = true;
            console.log('Streaming recording initialized for audio:', streamingTempFilePath);
          } else {
            console.warn('Failed to initialize streaming, will use blob approach:', initResult.error);
          }
        } catch (err) {
          console.warn('Error initializing streaming, will use blob approach:', err);
        }
      }

      // Track empty chunks to detect if MediaRecorder stops producing data
      const emptyChunkTracker = { count: 0, lastDataTime: Date.now() };
      
      mediaRecorder.ondataavailable = async (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data && event.data.size > 0) {
          // Reset empty chunk counter on successful data
          emptyChunkTracker.count = 0;
          emptyChunkTracker.lastDataTime = Date.now();
          
          // ALWAYS collect chunks as backup, even when streaming
          // This ensures we have data even if streaming fails
          chunksRef.current.push(event.data);
          
          // If streaming is initialized, also stream to file
          if (streamingInitialized && streamingTempFilePath) {
            try {
              // Read chunk as ArrayBuffer
              const arrayBuffer = await event.data.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              const chunkSize = 256 * 1024; // 256KB chunks for IPC
              
              // Send in small chunks if the MediaRecorder chunk is large
              for (let offset = 0; offset < uint8Array.length; offset += chunkSize) {
                const chunk = uint8Array.slice(offset, offset + chunkSize);
                const chunkArray = [...chunk];
                
                await window.electronAPI.writeStreamingChunk({
                  tempFilePath: streamingTempFilePath,
                  chunk: chunkArray
                });
              }
              console.log('Streamed chunk to file:', event.data.size, 'bytes');
            } catch (streamErr) {
              console.error('Error streaming chunk to file:', streamErr);
              // Chunk already added to chunksRef as backup above
            }
          }
          
          const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          console.log('Total chunks:', chunksRef.current.length, 'Total size:', totalSize, 'bytes');
        } else {
          emptyChunkTracker.count++;
          console.warn('Received empty data chunk (#', emptyChunkTracker.count, ')');
          
          // If we get too many consecutive empty chunks, MediaRecorder may have stopped producing data
          if (emptyChunkTracker.count >= 10) {
            const timeSinceLastData = Date.now() - emptyChunkTracker.lastDataTime;
            console.error('Too many empty chunks received. MediaRecorder may have stopped producing data.');
            console.log('Time since last data:', timeSinceLastData, 'ms');
            if (timeSinceLastData > 2000 && isRecording) {
              setError('Recording stopped producing data. This may happen if audio tracks end unexpectedly.');
            }
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error?.message || 'Unknown error'}`);
        setIsRecording(false);
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started, state:', mediaRecorder.state);
      };

      mediaRecorder.onstop = async () => {
          try {
            console.log('MediaRecorder stopped');
            console.log('Total chunks collected:', chunksRef.current.length);
            
            // Capture recording duration from recorder if available, otherwise use state
            const capturedDuration = mediaRecorder._capturedDuration || recordingTime || 0;
            console.log('Captured recording duration:', capturedDuration, 'seconds');
            console.log('Total data size:', chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');
            
            // Request final data explicitly before stopping
            if (mediaRecorder.state === 'recording') {
              try {
                mediaRecorder.requestData();
                // Wait a moment for the data event
                await new Promise(resolve => setTimeout(resolve, 200));
              } catch (err) {
                console.warn('Error requesting final data:', err);
              }
            }
            
            // Additional wait for any pending data
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // If we used streaming, use the streamed file directly
            // Otherwise, create blob from chunks
            let blob;
            let useStreamedFile = false;
            
            if (streamingInitialized && streamingTempFilePath) {
              try {
                // Finalize the streamed file
                const finalizeResult = await window.electronAPI.finalizeStreamingFile({
                  tempFilePath: streamingTempFilePath
                });
                if (finalizeResult.success) {
                  console.log('Streaming file finalized:', streamingTempFilePath);
                  useStreamedFile = true;
                  // We'll use the temp file directly instead of creating a blob
                } else {
                  console.warn('Failed to finalize streaming file, falling back to blob:', finalizeResult.error);
                }
              } catch (finalizeErr) {
                console.warn('Error finalizing streaming file, falling back to blob:', finalizeErr);
              }
            }
            
            // Create blob from chunks only if not using streamed file
            if (!useStreamedFile) {
              const blobMimeType = finalMimeType || mediaRecorder.mimeType || 'video/webm';
              console.log('Creating blob with mimeType:', blobMimeType);
              blob = new Blob(chunksRef.current, { type: blobMimeType });
            }
            
            // Save to file (will be converted to MP4)
            let saveDialogResult;
            try {
              saveDialogResult = await window.electronAPI.showSaveDialog({
                defaultPath: `screen_recording_${Date.now()}.mp4`,
                filters: [
                  { name: 'MP4 Files', extensions: ['mp4'] },
                  { name: 'WebM Files', extensions: ['webm'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              });
            } catch (dialogErr) {
              console.error('Error showing save dialog:', dialogErr);
              setError('Failed to show save dialog');
              return;
            }
            
            const { canceled, filePath } = saveDialogResult || {};

          if (!canceled && filePath) {
            // If using streamed file, skip blob validation
            if (!useStreamedFile) {
              // Validate blob size before processing
              if (!blob || blob.size === 0) {
                setError('Recording produced empty file');
                return;
              }
              console.log('Blob size:', blob.size, 'bytes');
            } else {
              console.log('Using streamed file, skipping blob creation');
            }
            
            // Determine if audio is present
            let currentStreamHasAudio = false;
            try {
              if (streamRef.current) {
                currentStreamHasAudio = streamRef.current.getAudioTracks().length > 0;
              } else {
                currentStreamHasAudio = finalHasAudio || hasAudio;
              }
            } catch (e) {
              console.warn('Could not check audio tracks:', e);
              currentStreamHasAudio = false;
            }
            
            console.log('Has audio:', currentStreamHasAudio);
            
            // If we used streaming, use the streamed file directly (no blob needed)
            if (useStreamedFile) {
              console.log('Using streamed file for final save');
              // Convert/move streamed temp file to final location
              const convertResult = await window.electronAPI.saveBlobFile({
                tempFilePath: streamingTempFilePath,
                finalFilePath: filePath,
                convertToMp4: true
              });
              
              if (!convertResult.success) {
                throw new Error(convertResult.error || 'Failed to save file');
              }
              
              console.log('File save completed via streaming');
              await saveRecordingFileComplete(convertResult.filePath, currentStreamHasAudio, capturedDuration, convertResult.fileSize);
              return;
            }
            
            // Use temp file approach for audio (avoids IPC crashes)
            // For video-only small files, use base64 (faster)
            const useTempFile = currentStreamHasAudio || (blob && blob.size > 5 * 1024 * 1024);
            
            // Safety check: warn about large files (only if blob exists)
            if (currentStreamHasAudio && blob && blob.size > 30 * 1024 * 1024) {
              console.warn('Large recording with audio detected:', (blob.size / 1024 / 1024).toFixed(2), 'MB. Processing may take longer.');
            }
            
            // Use a timeout wrapper to prevent hanging
            const processBlob = async () => {
              if (useTempFile) {
                // Temp file approach for audio/large files
                console.log('Using temp file approach (audio or large file)');
                return new Promise((resolve, reject) => {
                  const timeoutId = setTimeout(() => {
                    reject(new Error('File processing timed out'));
                  }, 30000);
                  
                  const reader = new FileReader();
                  
                  reader.onloadend = async () => {
                    try {
                      clearTimeout(timeoutId);
                      const arrayBuffer = reader.result;
                      
                      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                        throw new Error('Empty blob data');
                      }
                      
                      console.log('Writing blob to temp file (size:', arrayBuffer.byteLength, 'bytes)');
                      const tempResult = await window.electronAPI.saveBlobToTempFile({
                        blob: new Blob([arrayBuffer]),
                        fileName: `recording_${Date.now()}.webm`
                      });
                      
                      if (!tempResult.success) {
                        throw new Error(tempResult.error || 'Failed to write temp file');
                      }
                      
                      // Convert/move temp file to final location
                      const convertResult = await window.electronAPI.saveBlobFile({
                        tempFilePath: tempResult.tempFilePath,
                        finalFilePath: filePath,
                        convertToMp4: true
                      });
                      
                      if (!convertResult.success) {
                        throw new Error(convertResult.error || 'Failed to save file');
                      }
                      
                      console.log('File save completed via temp file');
                      await saveRecordingFileComplete(convertResult.filePath, currentStreamHasAudio, capturedDuration, convertResult.fileSize);
                      resolve();
                    } catch (err) {
                      clearTimeout(timeoutId);
                      reject(err);
                    }
                  };
                  
                  reader.onerror = (event) => {
                    clearTimeout(timeoutId);
                    const error = reader.error || event.error || 'Unknown error';
                    console.error('FileReader error:', error);
                    reject(new Error(`Failed to read blob: ${error.message || error}`));
                  };
                  
                  reader.onabort = () => {
                    clearTimeout(timeoutId);
                    reject(new Error('Blob read was aborted'));
                  };
                  
                  // Try to read blob with error handling
                  try {
                    console.log('Starting to read blob (size:', blob.size, 'bytes)');
                    reader.readAsArrayBuffer(blob);
                  } catch (readErr) {
                    clearTimeout(timeoutId);
                    console.error('Error starting blob read:', readErr);
                    reject(new Error(`Failed to start reading blob: ${readErr.message}`));
                  }
                });
              } else {
                // Base64 approach for video-only small files
                console.log('Using base64 approach (video-only)');
                return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                  reject(new Error('File processing timed out'));
                }, 30000); // 30 second timeout
                
                const reader = new FileReader();
                
                reader.onloadend = async () => {
                  try {
                    clearTimeout(timeoutId);
                    const result = reader.result;
                    if (!result || typeof result !== 'string') {
                      throw new Error('Failed to read blob data');
                    }
                    
                    // Extract base64 from data URL
                    // Data URL format: data:[<mediatype>][;base64],<data>
                    let base64;
                    if (result.includes(',')) {
                      const parts = result.split(',');
                      base64 = parts[parts.length - 1]; // Get the last part after commas
                    } else {
                      base64 = result;
                    }
                    
                    // Validate base64 string
                    if (!base64 || base64.length === 0) {
                      throw new Error('Empty base64 data');
                    }
                    
                    // Check base64 is valid (only contains valid base64 characters)
                    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                    if (!base64Regex.test(base64)) {
                      throw new Error('Invalid base64 data format');
                    }
                    
                    console.log('Blob size:', blob.size, 'bytes');
                    console.log('Base64 data length:', base64.length, 'characters');
                    
                    // Check if base64 string is too large for IPC (strict limit to prevent crashes)
                    // Reason 263 suggests malformed message or oversized data - be conservative
                    // With audio, files are larger, so use stricter limit
                    // Use finalHasAudio which was captured from the stream earlier
                    const maxBase64Size = finalHasAudio ? 5 * 1024 * 1024 : 8 * 1024 * 1024; // 5MB with audio, 8MB without
                    if (base64.length > maxBase64Size) {
                      const limit = finalHasAudio ? 5 : 8;
                      throw new Error(`File too large (${(base64.length / 1024 / 1024).toFixed(2)}MB base64). Maximum is ${limit}MB${finalHasAudio ? ' with audio' : ''}. Record shorter clips${finalHasAudio ? ' or disable audio' : ''}.`);
                    }
                    
                    // Final validation - ensure base64 doesn't contain any problematic characters
                    if (base64.includes('\n') || base64.includes('\r') || base64.includes('\0')) {
                      // Clean base64 (remove any line breaks or nulls)
                      base64 = base64.replace(/[\n\r\0]/g, '');
                      console.warn('Cleaned problematic characters from base64');
                    }
                    
                    // Add a timeout for the IPC call to prevent hanging
                    console.log('Starting file save via IPC...');
                    console.log('Base64 preview (first 50 chars):', base64.substring(0, 50));
                    
                    // Determine if audio is present by checking the stream (if available)
                    // finalHasAudio is captured in the closure, but we'll check the stream directly to be safe
                    let currentStreamHasAudio = false;
                    try {
                      if (streamRef.current) {
                        currentStreamHasAudio = streamRef.current.getAudioTracks().length > 0;
                      } else {
                        // Fallback to the captured value if stream is cleaned up
                        // But we need to use a safer check since finalHasAudio might not be in scope
                        currentStreamHasAudio = hasAudio; // hasAudio is from the outer scope
                      }
                    } catch (e) {
                      console.warn('Could not check audio tracks:', e);
                      currentStreamHasAudio = false; // Default to no audio if we can't check
                    }
                    
                    try {
                      const savePromise = saveRecordingFile(filePath, base64, currentStreamHasAudio, capturedDuration);
                      const saveTimeout = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('File save operation timed out')), 60000) // 60 second timeout
                      );
                      
                      const saveResult = await Promise.race([savePromise, saveTimeout]);
                      console.log('File save completed');
                      // Complete the save (add to library) - saveRecordingFile will handle the completion
                      resolve();
                    } catch (ipcErr) {
                      // Check if it's an IPC error
                      if (ipcErr.message && (
                        ipcErr.message.includes('bad IPC message') ||
                        ipcErr.message.includes('IPC') ||
                        ipcErr.message.includes('renderer')
                      )) {
                        throw new Error(`IPC communication failed. File may be too large (${(base64.length / 1024 / 1024).toFixed(2)}MB base64). Try recording a shorter clip.`);
                      }
                      throw ipcErr;
                    }
                  } catch (err) {
                    clearTimeout(timeoutId);
                    console.error('Error processing recording:', err);
                    reject(err);
                  }
                };
                
                reader.onerror = (err) => {
                  clearTimeout(timeoutId);
                  console.error('FileReader error:', err);
                  reject(new Error('Failed to read blob data'));
                };
                
                reader.onabort = () => {
                  clearTimeout(timeoutId);
                  reject(new Error('File read aborted'));
                };
                
                // Start reading with a small delay to prevent blocking
                setTimeout(() => {
                  try {
                    reader.readAsDataURL(blob);
                  } catch (err) {
                    clearTimeout(timeoutId);
                    reject(err);
                  }
                }, 100);
              });
            };
              }
            
            // Process blob with error handling
            processBlob().catch(err => {
              console.error('Failed to process recording:', err);
              setError(`Failed to save recording: ${err.message}`);
            });
          }

          // Clean up
          try {
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => {
                try {
                  track.stop();
                } catch (e) {
                  console.warn('Error stopping track:', e);
                }
              });
            }
          } catch (cleanupErr) {
            console.warn('Error during stream cleanup:', cleanupErr);
          }
          
          streamRef.current = null;
          videoStreamRef.current = null;
          mediaRecorderRef.current = null;
        } catch (stopErr) {
            console.error('Fatal error in onstop handler:', stopErr);
            setError(`Recording stopped with error: ${stopErr.message}`);
            
            // Clean up on error
            try {
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                  try {
                    track.stop();
                  } catch (e) {
                    // Ignore cleanup errors
                  }
                });
              }
            } catch (e) {
              // Ignore cleanup errors
            }
            
            streamRef.current = null;
            videoStreamRef.current = null;
            mediaRecorderRef.current = null;
          }
      };

      // Check MediaRecorder state before starting
      console.log('MediaRecorder ready state:', mediaRecorder.state);
      console.log('Stream active:', stream.active);
      console.log('Stream tracks:', {
        video: stream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })),
        audio: stream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState }))
      });

      // Verify tracks are actually ready
      const finalVideoTrackCheck = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      // FINAL CHECK: Video track must not be muted right before starting
      if (finalVideoTrackCheck) {
        if (finalVideoTrackCheck.readyState !== 'live') {
          throw new Error(`Video track not live before recording: ${finalVideoTrackCheck.readyState}`);
        }
        if (finalVideoTrackCheck.muted) {
          console.error('FINAL CHECK: Video track muted right before MediaRecorder.start()!');
          // Last-ditch attempt to unmute
          finalVideoTrackCheck.enabled = false;
          await new Promise(resolve => setTimeout(resolve, 50));
          finalVideoTrackCheck.enabled = true;
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (finalVideoTrackCheck.muted) {
            throw new Error('Video track is muted and cannot be unmuted - cannot start recording');
          }
          console.log('Video track unmuted successfully in final check');
        }
      }
      
      if (hasAudio && audioTrack && audioTrack.readyState !== 'live') {
        console.warn('Audio track not live, readyState:', audioTrack.readyState);
      }
      
      // Add event listeners to tracks to verify they're producing data
      // Also handle unexpected track state changes
      if (videoTrack) {
        videoTrack.onended = () => {
          console.error('Video track ended unexpectedly during recording!');
          setError('Video track stopped - recording may be incomplete');
          if (isRecording) {
            stopRecording();
          }
        };
        videoTrack.onmute = () => {
          console.error('CRITICAL: Video track muted DURING recording! This will cause empty chunks');
          // Aggressively try to unmute immediately
          if (videoTrack.readyState === 'live') {
            // Immediately try to unmute
            videoTrack.enabled = false;
            setTimeout(() => {
              videoTrack.enabled = true;
              console.log('Video track enabled toggled in attempt to unmute');
              // Check if it worked after a delay
              setTimeout(() => {
                if (videoTrack.muted) {
                  console.error('Video track still muted after recovery attempt - recording will fail');
                  setError('Video track muted during recording - file may be empty');
                } else {
                  console.log('Video track recovered from mute!');
                }
              }, 100);
            }, 10);
          } else {
            console.error('Video track muted AND not live - recording definitely failing');
            setError('Video track muted and stopped - recording will be empty');
          }
        };
        // Ensure track is enabled and unmuted
        if (!videoTrack.enabled) {
          console.warn('Video track was disabled, enabling it');
          videoTrack.enabled = true;
        }
        // Ensure track is not muted
        if (videoTrack.muted) {
          console.warn('Video track was muted, unmuting it');
          // Tracks don't have a direct unmute method, but enabling should help
          videoTrack.enabled = true;
        }
      }
      // Handle all audio tracks (system audio + microphone)
      stream.getAudioTracks().forEach((track, index) => {
        track.onended = () => {
          console.warn(`Audio track ${index} ended during recording - continuing with remaining tracks`);
          // When any audio track ends, MediaRecorder configured with audio codec might stop producing data
          // We can't restart MediaRecorder mid-recording, so we monitor for empty chunks instead
        };
        track.onmute = () => {
          console.warn('Audio track muted:', track.id);
          if (track.readyState === 'live') {
            track.enabled = true;
          }
        };
        if (!track.enabled) {
          console.warn('Audio track was disabled, enabling it:', track.id);
          track.enabled = true;
        }
      });
      
      // Also handle the first audio track for logging (backward compatibility)
      if (audioTrack) {
        // Already handled above in forEach, but keep this for compatibility
      }
      
      // Verify tracks are actually live before starting
      if (videoTrack && videoTrack.readyState !== 'live') {
        throw new Error(`Video track not live: ${videoTrack.readyState}`);
      }
      if (hasAudio && audioTrack && audioTrack.readyState !== 'live') {
        console.warn('Audio track not live, but continuing with video');
      }
      
      // Use appropriate timeslice - not too small to avoid empty chunks
      // If too small, MediaRecorder may fire events before data is available
      // Larger timeslice is more reliable but means less frequent chunk updates
      const timeslice = hasAudio ? 500 : 1000; // 500ms for audio (more reliable), 1000ms for video-only
      console.log('Starting MediaRecorder with timeslice:', timeslice, 'ms');
      mediaRecorder.start(timeslice);
      
      // Verify recording started
      setTimeout(() => {
        if (mediaRecorder.state !== 'recording') {
          console.error('MediaRecorder did not start, state:', mediaRecorder.state);
          setError('Failed to start recording - MediaRecorder state: ' + mediaRecorder.state);
          setIsRecording(false);
        } else {
          console.log('Recording confirmed started, state:', mediaRecorder.state);
        }
      }, 200);
      
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err.message || 'Unknown error'}`);
      setIsRecording(false);
      
      // Clean up any partial streams
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              console.warn('Error stopping track:', e);
            }
          });
          streamRef.current = null;
        }
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              console.warn('Error stopping video track:', e);
            }
          });
          videoStreamRef.current = null;
        }
      } catch (cleanupErr) {
        console.error('Error during cleanup:', cleanupErr);
      }
    }
  };

  // Helper function to complete save and add clip to library (shared by both approaches)
  const saveRecordingFileComplete = async (finalPath, recordingHasAudio, capturedDuration, savedFileSize = 0) => {
    const fileExtension = finalPath.toLowerCase().endsWith('.mp4') ? 'mp4' : 'webm';
    const fallbackDuration = capturedDuration > 0 ? capturedDuration : recordingTime;
    
    setTimeout(async () => {
      try {
        const metadata = await window.electronAPI.getVideoMetadata(finalPath);
        const duration = metadata.duration && !isNaN(metadata.duration) && metadata.duration > 0 && isFinite(metadata.duration)
          ? metadata.duration
          : fallbackDuration;
        
          const clip = {
          id: `clip-${Date.now()}-${Math.random()}`,
          filePath: finalPath,
          fileName: finalPath.split('/').pop() || finalPath.split('\\').pop(),
          duration: duration,
          resolution: metadata.resolution || 'Unknown',
          fileSize: metadata.fileSize || savedFileSize || 0,
          format: fileExtension,
          hasAudio: recordingHasAudio,
          createdAt: new Date(),
        };
        
        // Safely add clip with error handling
        // Use requestAnimationFrame to ensure it happens after current render cycle
        requestAnimationFrame(() => {
          try {
            addClip(clip);
            console.log('Clip added successfully:', clip.id);

            // Add recording directly to timeline at the end
            const totalTimelineDuration = timelineClips.reduce((max, tc) => {
              return Math.max(max, tc.startTime + tc.duration);
            }, 0);

            const timelineClip = {
              id: `timeline-${Date.now()}`,
              clipId: clip.id,
              trackId: 0, // Add to main track
              startTime: totalTimelineDuration, // Add at the end of existing clips
              duration: clip.duration,
              trimStart: 0,
              trimEnd: 0,
            };
            addToTimeline(timelineClip);
            console.log('Clip added to timeline at:', totalTimelineDuration);

            // Use multiple animation frames to ensure all state updates complete
            requestAnimationFrame(() => {
              setTimeout(() => {
                try {
                  onClose();
                } catch (closeErr) {
                  console.error('Error closing dialog:', closeErr);
                }
              }, 500); // Longer delay to ensure VideoPlayer state updates
            });
          } catch (addErr) {
            console.error('Error adding clip:', addErr);
            setTimeout(() => {
              try {
                onClose();
              } catch (closeErr) {
                console.error('Error closing dialog:', closeErr);
              }
            }, 500);
          }
        });
      } catch (err) {
        console.error('Error in saveRecordingFileComplete:', err);
        // Create fallback clip
        try {
          const clip = {
            id: `clip-${Date.now()}-${Math.random()}`,
            filePath: finalPath,
            fileName: finalPath.split('/').pop() || finalPath.split('\\').pop() || 'recording.mp4',
            duration: fallbackDuration,
            resolution: 'Unknown',
            fileSize: savedFileSize,
            format: fileExtension,
            hasAudio: recordingHasAudio,
            createdAt: new Date(),
          };
          addClip(clip);

          // Add to timeline
          const totalTimelineDuration = timelineClips.reduce((max, tc) => {
            return Math.max(max, tc.startTime + tc.duration);
          }, 0);
          const timelineClip = {
            id: `timeline-${Date.now()}`,
            clipId: clip.id,
            trackId: 0,
            startTime: totalTimelineDuration,
            duration: clip.duration,
            trimStart: 0,
            trimEnd: 0,
          };
          addToTimeline(timelineClip);

          setTimeout(() => {
            try {
              onClose();
            } catch (closeErr) {
              console.error('Error closing dialog:', closeErr);
            }
          }, 100);
        } catch (fallbackErr) {
          console.error('Error with fallback clip:', fallbackErr);
          setTimeout(() => {
            try {
              onClose();
            } catch (closeErr) {
              console.error('Error closing dialog:', closeErr);
            }
          }, 100);
        }
      }
    }, 2000);
  };

  const saveRecordingFile = async (filePath, base64Data, recordingHasAudio = false, capturedDuration = 0) => {
    try {
      // Save file via IPC and convert to MP4
      const result = await window.electronAPI.saveRecordingFile({ 
        filePath, 
        base64Data, 
        convertToMp4: true 
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save file');
      }
      
      // Use the returned file path (might be MP4 after conversion)
      const finalPath = result.filePath || filePath;
      const fileExtension = finalPath.toLowerCase().endsWith('.mp4') ? 'mp4' : 'webm';
      
      // Wait longer for conversion and file to be ready, then get metadata
      // Use fileSize from save result if available
      const savedFileSize = result.fileSize || 0;
      
      // Use captured duration as the primary source, fallback to current recordingTime
      const fallbackDuration = capturedDuration > 0 ? capturedDuration : recordingTime;
      console.log('Using duration - captured:', capturedDuration, 'fallback:', recordingTime, 'final:', fallbackDuration);
      
      setTimeout(async () => {
        try {
          const metadata = await window.electronAPI.getVideoMetadata(finalPath);
          
          // Validate metadata - ensure duration is valid
          // Use captured duration as primary fallback, then recordingTime
          const duration = metadata.duration && !isNaN(metadata.duration) && metadata.duration > 0 && isFinite(metadata.duration)
            ? metadata.duration
            : fallbackDuration; // Use captured duration
          
          const clip = {
            id: `clip-${Date.now()}-${Math.random()}`,
            filePath: finalPath,
            fileName: finalPath.split('/').pop() || finalPath.split('\\').pop(),
            duration: duration,
            resolution: metadata.resolution || 'Unknown',
            fileSize: metadata.fileSize || savedFileSize || 0,
            format: fileExtension,
            hasAudio: recordingHasAudio, // Use passed audio state
            createdAt: new Date(),
          };

          addClip(clip);

          // Add to timeline
          const totalTimelineDuration = timelineClips.reduce((max, tc) => {
            return Math.max(max, tc.startTime + tc.duration);
          }, 0);
          const timelineClip = {
            id: `timeline-${Date.now()}`,
            clipId: clip.id,
            trackId: 0,
            startTime: totalTimelineDuration,
            duration: clip.duration,
            trimStart: 0,
            trimEnd: 0,
          };
          addToTimeline(timelineClip);

          onClose();
        } catch (err) {
          console.error('Error adding clip to library:', err);
          // Still add clip with captured duration as fallback
          const clip = {
            id: `clip-${Date.now()}-${Math.random()}`,
            filePath: finalPath,
            fileName: finalPath.split('/').pop() || finalPath.split('\\').pop(),
            duration: fallbackDuration,
            resolution: 'Unknown',
            fileSize: 0,
            format: fileExtension,
            hasAudio: recordingHasAudio, // Use passed audio state
            createdAt: new Date(),
          };
          addClip(clip);

          // Add to timeline
          const totalTimelineDuration = timelineClips.reduce((max, tc) => {
            return Math.max(max, tc.startTime + tc.duration);
          }, 0);
          const timelineClip = {
            id: `timeline-${Date.now()}`,
            clipId: clip.id,
            trackId: 0,
            startTime: totalTimelineDuration,
            duration: clip.duration,
            trimStart: 0,
            trimEnd: 0,
          };
          addToTimeline(timelineClip);

          onClose();
        }
      }, 2000); // Longer wait for conversion
    } catch (err) {
      console.error('Error saving recording:', err);
      setError('Failed to save recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const recorder = mediaRecorderRef.current;
      console.log('Stopping recording, state:', recorder.state);
      console.log('Current recording time:', recordingTime, 'seconds');

      // Capture the recording duration BEFORE stopping (so timer doesn't reset it)
      const capturedDuration = recordingTime;

      // Stop animation frame for canvas compositing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Clean up webcam stream
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }

      // Clear webcam preview
      if (previewWebcamRef.current) {
        previewWebcamRef.current.srcObject = null;
      }

      if (recorder.state === 'recording') {
        // Request any pending data
        try {
          recorder.requestData();
        } catch (err) {
          console.warn('Error requesting data:', err);
        }

        // Store the captured duration on the recorder so onstop can access it
        recorder._capturedDuration = capturedDuration;

        // Wait a moment then stop
        setTimeout(() => {
          try {
            recorder.stop();
          } catch (err) {
            console.error('Error stopping recorder:', err);
          }
        }, 100);
      } else {
        recorder._capturedDuration = capturedDuration;
        recorder.stop();
      }

      setIsRecording(false);

      // Clean up canvas and video elements
      canvasRef.current = null;
      screenVideoRef.current = null;
      webcamVideoRef.current = null;
    }
  };

  return (
    <div className="screen-recorder">
      <div className="screen-recorder-header">
        <h3>Screen Recording</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="screen-recorder-content">
        {error && (
          <div className="screen-recorder-error">
            <p>{error}</p>
          </div>
        )}

        <div className="recorder-sources">
          <label>
            <span>Select Screen/Window:</span>
            <div className="sources-grid">
              {sources.map(source => (
                <div
                  key={source.id}
                  className={`source-item ${selectedSource?.id === source.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSource(source)}
                >
                  <img src={source.thumbnail} alt={source.name} />
                  <span className="source-name">{source.name}</span>
                </div>
              ))}
            </div>
          </label>
        </div>

        <div className="recorder-options-wrapper">
          <div className="recorder-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeSystemAudio}
                onChange={(e) => setIncludeSystemAudio(e.target.checked)}
                disabled={isRecording}
              />
              <span>Include system audio</span>
            </label>

            {audioInputDevices.length > 0 && (
              <>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeMicrophone}
                    onChange={(e) => setIncludeMicrophone(e.target.checked)}
                    disabled={isRecording}
                  />
                  <span>Include microphone</span>
                </label>
                {includeMicrophone && (
                  <label>
                    <span>Microphone:</span>
                    <select
                      value={selectedAudioInput}
                      onChange={(e) => setSelectedAudioInput(e.target.value)}
                      disabled={isRecording}
                    >
                      {audioInputDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${audioInputDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}

            {webcamDevices.length > 0 && (
              <>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeWebcam}
                    onChange={(e) => setIncludeWebcam(e.target.checked)}
                    disabled={isRecording}
                  />
                  <span>Include webcam (picture-in-picture)</span>
                </label>
                {includeWebcam && (
                  <label>
                    <span>Webcam:</span>
                    <select
                      value={selectedWebcam}
                      onChange={(e) => setSelectedWebcam(e.target.value)}
                      disabled={isRecording}
                    >
                      {webcamDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${webcamDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
          </div>

          {/* Webcam preview - shown when webcam is enabled */}
          {includeWebcam && (
            <div className="webcam-preview-container">
              <video
                ref={previewWebcamRef}
                autoPlay
                muted
                playsInline
              />
            </div>
          )}
        </div>

        <div className="recorder-controls">
          {!isRecording ? (
            <button
              className="record-button start"
              onClick={startRecording}
              disabled={!selectedSource}
            >
              Start Recording
            </button>
          ) : (
            <>
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span>Recording: {formatTime(recordingTime)}</span>
              </div>
              <button
                className="record-button stop"
                onClick={stopRecording}
              >
                Stop Recording
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default ScreenRecorder;

