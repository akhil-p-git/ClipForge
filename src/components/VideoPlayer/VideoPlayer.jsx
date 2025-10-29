import React, { useEffect, useRef } from 'react';
import './VideoPlayer.css';
import { useStore } from '../../store/useStore';

function VideoPlayer() {
  const videoRef = useRef(null);
  const isSyncingRef = useRef(false);
  const currentClip = useStore(state => state.currentClip);
  const { playhead, setPlayhead, isPlaying, setIsPlaying } = useStore();
  
  console.log('VideoPlayer render - currentClip:', currentClip ? 'exists' : 'null');

  // Load video source when currentClip changes
  useEffect(() => {
    if (!videoRef.current || !currentClip) return;
    
    const video = videoRef.current;
    console.log('Loading video:', currentClip.fileName);
    
    // For Electron, we need to load the file:// path
    let videoSrc = currentClip.filePath;
    if (!videoSrc.startsWith('file://')) {
      videoSrc = `file://${videoSrc}`;
    }
    
    console.log('Setting video source:', videoSrc);
    video.src = videoSrc;
    video.load();
  }, [currentClip]);

  // Sync playhead when it changes externally (e.g., from timeline)
  useEffect(() => {
    if (videoRef.current && currentClip) {
      const video = videoRef.current;
      const currentTime = video.currentTime;
      
      // Only seek if there's a meaningful difference (avoid constant seeking)
      if (Math.abs(currentTime - playhead) > 0.1) {
        isSyncingRef.current = true;
        video.currentTime = playhead;
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 100);
      }
    }
  }, [playhead, currentClip]);

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
      if (!isSyncingRef.current) setIsPlaying(false);
    };
    
    const handleTimeUpdate = () => {
      // Only update playhead if we're not currently seeking (to prevent feedback loop)
      if (!isSyncingRef.current) {
        setPlayhead(video.currentTime);
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
  }, [setPlayhead, setIsPlaying]);

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
        />
      )}
    </div>
  );
}

export default VideoPlayer;
