import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/themes/dist/forest/index.css';
import './VideoPlayer.css';
import { useStore } from '../../store/useStore';

function VideoPlayer() {
  console.log('VideoPlayer rendering, currentClip:', useStore.getState().currentClip);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const { currentClip, playhead, setPlayhead, isPlaying, setIsPlaying } = useStore();

  useEffect(() => {
    // Initialize Video.js player
    if (videoRef.current && !playerRef.current) {
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

      console.log('Video.js player initialized');
      // Setup player event listeners
      const player = playerRef.current;

      // Sync play state with store
      player.on('play', () => {
        console.log('Video playing');
        setIsPlaying(true);
      });
      player.on('pause', () => {
        console.log('Video paused');
        setIsPlaying(false);
      });
      player.on('ended', () => {
        console.log('Video ended');
        setIsPlaying(false);
      });

      // Update playhead as video plays
      player.on('timeupdate', () => {
        if (player.currentTime() !== undefined) {
          setPlayhead(player.currentTime());
        }
      });

      // Allow clicking on video to seek
      player.on('click', () => {
        player.play();
      });
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        console.log('Disposing Video.js player');
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [setPlayhead, setIsPlaying]);

  // Load video source when currentClip changes
  useEffect(() => {
    if (playerRef.current && currentClip) {
      const player = playerRef.current;
      
      // For Electron, we need to load the file:// path
      if (currentClip.filePath) {
        // Ensure proper file:// URL format for Electron
        let videoSrc = currentClip.filePath;
        if (!videoSrc.startsWith('file://')) {
          videoSrc = `file://${videoSrc}`;
        }
        
        console.log('Setting video source:', videoSrc);
        console.log('Clip format:', currentClip.format);
        
        // Set source
        player.src({
          src: videoSrc,
          type: getVideoType(currentClip.format)
        });
        
        // Event listeners
        player.on('loadstart', () => {
          console.log('Video: loadstart');
        });
        
        player.on('loadedmetadata', () => {
          console.log('Video: loadedmetadata', player.duration());
        });
        
        player.on('loadeddata', () => {
          console.log('Video: loadeddata');
        });
        
        player.on('canplay', () => {
          console.log('Video: canplay - ready to play');
        });
        
        player.on('error', () => {
          console.error('Video player error:', player.error());
          console.error('Error code:', player.error().code);
          console.error('Error message:', player.error().message);
        });
        
        // Load the video
        player.load().catch(err => {
          console.error('Load error:', err);
        });
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

  // Sync play/pause state
  useEffect(() => {
    if (playerRef.current) {
      const player = playerRef.current;
      
      if (isPlaying && player.paused()) {
        player.play();
      } else if (!isPlaying && !player.paused()) {
        player.pause();
      }
    }
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

  // Show placeholder when no clip is selected
  if (!currentClip) {
    return (
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
    );
  }

  return (
    <div className="video-player-container">
      <div className="video-player-header">
        <h3 className="video-title">{currentClip.fileName}</h3>
        <div className="video-info">
          {currentClip.resolution !== 'Unknown' && (
            <span className="info-badge">{currentClip.resolution}</span>
          )}
          <span className="info-badge">{currentClip.format?.toUpperCase()}</span>
        </div>
      </div>
      
      <div data-vjs-player className="video-player-wrapper">
        <video
          ref={videoRef}
          className="video-js vjs-theme-forest vjs-big-play-centered"
        />
      </div>
    </div>
  );
}

export default VideoPlayer;

