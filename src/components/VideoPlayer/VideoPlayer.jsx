import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/themes/dist/forest/index.css';
import './VideoPlayer.css';
import { useStore } from '../../store/useStore';

function VideoPlayer() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const isSyncingRef = useRef(false);
  const currentClip = useStore(state => state.currentClip);
  const { playhead, setPlayhead, isPlaying, setIsPlaying } = useStore();
  
  console.log('VideoPlayer render - currentClip:', currentClip ? 'exists' : 'null');

  useEffect(() => {
    // Initialize Video.js when video element becomes available
    if (!videoRef.current) {
      console.log('No video element yet');
      return;
    }
    
    if (playerRef.current) {
      console.log('Player already initialized');
      return;
    }
    
    console.log('Initializing Video.js player');
    playerRef.current = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      responsive: true,
      preload: 'auto',
      playbackRates: [0.5, 1, 1.5, 2],
      html5: {
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
    });
    
    // Setup player event listeners (only once)
    const player = playerRef.current;

    player.on('play', () => {
      if (!isSyncingRef.current) setIsPlaying(true);
    });
    player.on('pause', () => {
      if (!isSyncingRef.current) setIsPlaying(false);
    });
    player.on('ended', () => {
      if (!isSyncingRef.current) setIsPlaying(false);
    });

    player.on('timeupdate', () => {
      if (player.currentTime() !== undefined) {
        setPlayhead(player.currentTime());
      }
    });

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [setPlayhead, setIsPlaying]); // Only initialize once on mount

  // Load video source when currentClip changes
  useEffect(() => {
    console.log('=== Load video useEffect ===');
    console.log('playerRef.current:', !!playerRef.current);
    console.log('currentClip:', !!currentClip);
    console.log('currentClip data:', currentClip);
    
    if (!playerRef.current || !currentClip) {
      console.log('Skipping load - player or clip missing');
      return;
    }
    
    const player = playerRef.current;
    console.log('Loading video:', currentClip.fileName);
    
    // For Electron, we need to load the file:// path
    if (currentClip.filePath) {
      // Ensure proper file:// URL format for Electron
      let videoSrc = currentClip.filePath;
      if (!videoSrc.startsWith('file://')) {
        videoSrc = `file://${videoSrc}`;
      }
      
      console.log('Setting video source:', videoSrc);
      
      try {
        player.src({
          src: videoSrc,
          type: getVideoType(currentClip.format)
        });
        
        // Add event listeners
        player.on('loadstart', () => console.log('Video: loadstart'));
        player.on('loadedmetadata', () => console.log('Video: loadedmetadata'));
        player.on('canplay', () => {
          console.log('Video: canplay');
          console.log('Player video element:', player.videoWidth(), player.videoHeight());
          console.log('Player dimensions:', player.width(), player.height());
          console.log('Video element:', player.el());
        });
        player.on('error', () => console.error('Video error:', player.error()));
        
        player.load();
        
        // Force refresh the player display
        player.trigger('loadstart');
      } catch (err) {
        console.error('Error setting source:', err);
      }
    }
  }, [currentClip]);

  // Sync playhead when it changes externally (e.g., from timeline)
  useEffect(() => {
    if (playerRef.current && currentClip) {
      const player = playerRef.current;
      const currentTime = player.currentTime();
      
      // Only seek if there's a meaningful difference (avoid constant seeking)
      if (Math.abs(currentTime - playhead) > 0.5) {
        player.currentTime(playhead);
      }
    }
  }, [playhead, currentClip]);

  // Sync play/pause state from store to player
  useEffect(() => {
    if (!playerRef.current) return;
    
    const player = playerRef.current;
    
    // Set flag to prevent event handlers from updating store
    isSyncingRef.current = true;
    
    // Only change player state if it doesn't match store
    if (isPlaying && player.paused()) {
      player.play().catch(() => {});
    } else if (!isPlaying && !player.paused()) {
      player.pause();
    }
    
    // Reset flag after a brief delay
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 300);
  }, [isPlaying]);

  const getVideoType = (format) => {
    const types = {
      'mp4': 'video/mp4',
      'mov': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
    };
    return types[format?.toLowerCase()] || 'video/mp4';
  };

  // Always render video element so player can initialize
  return (
    <div className="video-player-container">
      {!currentClip && (
        <div className="video-player-empty" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
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
      
      <div data-vjs-player className="video-player-wrapper" style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <video
          ref={videoRef}
          className="video-js vjs-theme-forest vjs-big-play-centered"
        />
      </div>
    </div>
  );
}

export default VideoPlayer;

