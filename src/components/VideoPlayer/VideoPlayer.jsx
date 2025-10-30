import React, { useEffect, useRef } from 'react';
import './VideoPlayer.css';
import { useStore } from '../../store/useStore';

function VideoPlayer() {
  const videoRef = useRef(null);
  const isSyncingRef = useRef(false);
  const currentClip = useStore(state => state.currentClip);
  const timelineClips = useStore(state => state.timelineClips);
  const clips = useStore(state => state.clips);
  const { playhead, setPlayhead, isPlaying, setIsPlaying } = useStore();

  // Find which timeline clip is at the current playhead position
  const getTimelineClipAtPlayhead = () => {
    if (timelineClips.length === 0) return null;

    return timelineClips.find(tc => {
      return playhead >= tc.startTime && playhead < (tc.startTime + tc.duration);
    });
  };

  const activeTimelineClip = getTimelineClipAtPlayhead();

  // Get the source clip from the library, or fall back to currentClip
  const activeClip = activeTimelineClip
    ? clips.find(c => c.id === activeTimelineClip.clipId)
    : currentClip;

  console.log('VideoPlayer render - activeClip:', activeClip ? 'exists' : 'null');

  // Load video source when activeClip changes (NOT on every playhead update)
  useEffect(() => {
    if (!videoRef.current || !activeClip) {
      // Ensure video element is cleared when no clip
      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current.load();
      }
      return;
    }

    // Validate clip has required properties
    if (!activeClip.filePath || !activeClip.fileName) {
      console.error('Invalid clip:', activeClip);
      return;
    }

    const video = videoRef.current;
    try {
      console.log('Loading video:', activeClip.fileName);
      console.log('File path:', activeClip.filePath);
      console.log('File size:', activeClip.fileSize || 0);

      // Check if file size is valid
      if (activeClip.fileSize === 0) {
        console.warn('Warning: File size is 0, video may not load:', activeClip.fileName);
      }

      // For Electron, we need to load the file:// path
      let videoSrc = activeClip.filePath;
      if (!videoSrc || typeof videoSrc !== 'string') {
        console.error('Invalid file path:', videoSrc);
        return;
      }

      if (!videoSrc.startsWith('file://')) {
        videoSrc = `file://${videoSrc}`;
      }

      console.log('Setting video source:', videoSrc);
      console.log('Clip duration:', activeClip.duration || 0, 'seconds');

      // Ensure audio is enabled
      video.muted = false;
      video.volume = 1.0;

      // Safely set video source
      try {
        // Check if we need to reload
        const currentSrc = video.src;
        const needsReload = currentSrc !== videoSrc;

        if (needsReload) {
          console.log('Loading new video source');
          // Set the new source directly
          video.src = videoSrc;
          video.load();
          // Seeking will be handled by the playhead sync useEffect once video loads
        }
      } catch (loadErr) {
        console.error('Error loading video:', loadErr);
        // Clear video on error to prevent crashes
        video.src = '';
        return;
      }
    } catch (err) {
      console.error('Error in video loading useEffect:', err);
      // Clear video element on any error
      if (videoRef.current) {
        try {
          videoRef.current.src = '';
        } catch (clearErr) {
          console.error('Error clearing video:', clearErr);
        }
      }
      return;
    }

    // Handle duration issues (Infinity, NaN, or 0)
    const handleLoadedMetadata = () => {
      const videoDuration = video.duration;
      console.log('Video metadata loaded - video.duration:', videoDuration);
      console.log('Clip duration:', activeClip.duration);

      // If video duration is invalid, use clip's stored duration
      if (!videoDuration || !isFinite(videoDuration) || videoDuration <= 0) {
        if (activeClip.duration && activeClip.duration > 0) {
          console.warn('Video duration invalid, using clip duration:', activeClip.duration);
          // Override the duration property for display purposes
          Object.defineProperty(video, 'duration', {
            get: () => activeClip.duration,
            configurable: true
          });
        }
      }

      // Log audio tracks
      console.log('Video has audio tracks:', video.audioTracks?.length || 'unknown');
      if (video.audioTracks && video.audioTracks.length > 0) {
        console.log('Audio tracks:', Array.from(video.audioTracks).map(t => ({
          enabled: t.enabled,
          kind: t.kind,
          label: t.label
        })));
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Add error handler
    const handleError = (e) => {
      console.error('Video load error:', e);
      console.error('Error details:', video.error);
      if (video.error) {
        const error = video.error;
        let errorMsg = 'Failed to load video';
        if (error.code === error.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          errorMsg = 'Video format not supported';
        } else if (error.code === error.MEDIA_ERR_NETWORK) {
          errorMsg = 'Network error loading video';
        } else if (error.code === error.MEDIA_ERR_DECODE) {
          errorMsg = 'Video decode error';
        }
        console.error(errorMsg);
      }
    };

    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [activeClip]);

  // Sync playhead when it changes externally (e.g., from timeline scrubbing or clip changes)
  useEffect(() => {
    if (!videoRef.current || isSyncingRef.current) return;

    const video = videoRef.current;

    // Wait for video to be ready
    if (video.readyState < 2) {
      // Video not ready yet, wait for it
      const handleCanSeek = () => {
        const timeWithinClip = activeTimelineClip
          ? playhead - activeTimelineClip.startTime
          : playhead;

        console.log('Video ready, seeking to:', timeWithinClip);
        video.currentTime = timeWithinClip;
      };

      video.addEventListener('loadeddata', handleCanSeek, { once: true });
      return;
    }

    // Calculate the time within the current timeline clip (or use playhead directly for individual clips)
    const timeWithinClip = activeTimelineClip
      ? playhead - activeTimelineClip.startTime
      : playhead;

    const currentTime = video.currentTime;

    // Only seek if there's a meaningful difference (avoid constant seeking)
    if (Math.abs(currentTime - timeWithinClip) > 0.3) {
      isSyncingRef.current = true;
      video.currentTime = timeWithinClip;
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  }, [playhead, activeTimelineClip]);

  // Sync play/pause state from store to player
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    // Set flag to prevent event handlers from updating store
    isSyncingRef.current = true;
    
    // Only change player state if it doesn't match store
    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
    
    // Reset flag after a brief delay
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 300);
  }, [isPlaying]);

  // Handle video events
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    const handlePlay = () => {
      if (!isSyncingRef.current) setIsPlaying(true);
    };
    
    const handlePause = () => {
      if (!isSyncingRef.current) setIsPlaying(false);
    };
    
    const handleEnded = () => {
      if (isSyncingRef.current) return;

      console.log('Video ended, looking for next clip');

      // Use activeTimelineClip from the component scope
      if (activeTimelineClip) {
        // Calculate the end of this clip
        const currentClipEnd = activeTimelineClip.startTime + activeTimelineClip.duration;

        // Sort timeline clips and find the next one
        const sortedClips = [...timelineClips].sort((a, b) => a.startTime - b.startTime);
        const nextClip = sortedClips.find(tc => tc.startTime >= currentClipEnd);

        if (nextClip) {
          console.log('Found next clip, advancing playhead to:', nextClip.startTime);
          // Move playhead to start of next clip
          setPlayhead(nextClip.startTime);
          // Keep playing (isPlaying should already be true)
        } else {
          console.log('No more clips, stopping playback');
          // No more clips, stop
          setIsPlaying(false);
        }
      } else {
        console.log('No timeline clip active, stopping playback');
        // No timeline clips, just stop
        setIsPlaying(false);
      }
    };

    const handleTimeUpdate = () => {
      // Only update playhead if we're not currently seeking (to prevent feedback loop)
      if (!isSyncingRef.current) {
        // Find current timeline clip to convert video time to timeline time
        const currentTimelineClip = timelineClips.find(tc => {
          return playhead >= tc.startTime && playhead < (tc.startTime + tc.duration);
        });

        if (currentTimelineClip) {
          // Convert video time to timeline time
          const timelineTime = currentTimelineClip.startTime + video.currentTime;
          setPlayhead(timelineTime);
        } else {
          // Fallback for single clip playback
          setPlayhead(video.currentTime);
        }
      }
    };
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [setPlayhead, setIsPlaying, timelineClips, activeTimelineClip, playhead]);

  // Always render video element
  return (
    <div className="video-player-container">
      {!currentClip && (
        <div className="video-player-empty">
          <div className="empty-state-content">
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="empty-icon"
            >
              <path 
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" 
                fill="currentColor"
              />
            </svg>
            <h3 className="empty-title">No Video Selected</h3>
            <p className="empty-description">
              Click a clip from the media library to preview it
            </p>
          </div>
        </div>
      )}
      
      {currentClip && (
        <video
          ref={videoRef}
          className="native-video-player"
          controls
          muted={false}
          autoPlay={false}
          playsInline
        />
      )}
    </div>
  );
}

export default VideoPlayer;
