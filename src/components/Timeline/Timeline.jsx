import React, { useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { useStore } from '../../store/useStore';
import './Timeline.css';

function Timeline() {
  const { timelineClips, clips, playhead, isPlaying, setInPoint, setOutPoint, inPoint, outPoint, setIsPlaying, setPlayhead, addToTimeline } = useStore();

  const [{ isOver }, drop] = useDrop({
    accept: 'clip',
    drop: (item) => {
      console.log('Dropped clip on timeline:', item.clip);
      // Add clip to timeline at current playhead position
      const timelineClip = {
        id: `timeline-${Date.now()}`,
        clipId: item.clip.id,
        trackId: 0, // Add to main track
        startTime: playhead,
        duration: item.clip.duration || 10, // Use actual duration if available
        trimStart: 0,
        trimEnd: 0,
      };
      addToTimeline(timelineClip);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts for trim points and playback
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Trim point shortcuts
      if (e.key === 'i' || e.key === 'I') {
        console.log('Set In Point at:', playhead);
        setInPoint(playhead);
        e.preventDefault();
      } else if (e.key === 'o' || e.key === 'O') {
        console.log('Set Out Point at:', playhead);
        setOutPoint(playhead);
        e.preventDefault();
      }
      
      // Playback shortcuts
      else if (e.key === ' ') {
        setIsPlaying(!isPlaying);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playhead, setInPoint, setOutPoint, isPlaying, setIsPlaying]);

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h2 className="section-title">Timeline</h2>
        <div className="timeline-controls">
          <button className="control-button" title="Zoom Out">-</button>
          <span className="zoom-level">100%</span>
          <button className="control-button" title="Zoom In">+</button>
        </div>
      </div>

      <div className="timeline-content">
        {/* Time Ruler */}
        <div className="timeline-ruler">
          <div className="ruler-marks">
            {[0, 10, 20, 30, 40, 50, 60].map(second => (
              <div key={second} className="ruler-mark">
                <span className="mark-time">{formatTime(second)}</span>
                <div className="mark-line"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Playhead */}
        <div className="timeline-playhead" style={{ left: `${(playhead / 60) * 100}%` }}>
          <div className="playhead-line"></div>
          <div className="playhead-indicator">
            <span className="playhead-time">{formatTime(playhead)}</span>
          </div>
        </div>

        {/* Trim Points */}
        {inPoint !== null && (
          <div className="trim-marker in-point" style={{ left: `${(inPoint / 60) * 100}%` }}>
            <div className="trim-marker-line"></div>
            <div className="trim-marker-label">In: {formatTime(inPoint)}</div>
          </div>
        )}
        
        {outPoint !== null && (
          <div className="trim-marker out-point" style={{ left: `${(outPoint / 60) * 100}%` }}>
            <div className="trim-marker-line"></div>
            <div className="trim-marker-label">Out: {formatTime(outPoint)}</div>
          </div>
        )}
        
        {/* Trim region highlight */}
        {inPoint !== null && outPoint !== null && outPoint > inPoint && (
          <div 
            className="trim-region" 
            style={{ 
              left: `${(inPoint / 60) * 100}%`,
              width: `${((outPoint - inPoint) / 60) * 100}%`
            }}
          />
        )}

        {/* Tracks */}
        <div className="timeline-tracks" ref={drop}>
          {/* Track 1: Main Video */}
          <div className="timeline-track">
            <div className="track-label">Track 1</div>
            <div className="track-content">
              {timelineClips.filter(clip => clip.trackId === 0).length === 0 ? (
                <div className="empty-track">Drop clips here</div>
              ) : (
                timelineClips
                  .filter(clip => clip.trackId === 0)
                  .map(clip => {
                    const sourceClip = clips.find(c => c.id === clip.clipId);
                    const clipWidth = `${(clip.duration / 60) * 100}%`;
                    const clipLeft = `${(clip.startTime / 60) * 100}%`;
                    
                    return (
                      <div 
                        key={clip.id} 
                        className="clip-block"
                        style={{ 
                          left: clipLeft,
                          width: clipWidth,
                          position: 'absolute'
                        }}
                      >
                        <span className="clip-name">{sourceClip?.fileName || 'Clip'}</span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Track 2: Overlay */}
          <div className="timeline-track">
            <div className="track-label">Track 2</div>
            <div className="track-content">
              {timelineClips.filter(clip => clip.trackId === 1).length === 0 ? (
                <div className="empty-track">Drop overlays here</div>
              ) : (
                timelineClips
                  .filter(clip => clip.trackId === 1)
                  .map(clip => {
                    const sourceClip = clips.find(c => c.id === clip.clipId);
                    const clipWidth = `${(clip.duration / 60) * 100}%`;
                    const clipLeft = `${(clip.startTime / 60) * 100}%`;
                    
                    return (
                      <div 
                        key={clip.id} 
                        className="clip-block overlay"
                        style={{ 
                          left: clipLeft,
                          width: clipWidth,
                          position: 'absolute'
                        }}
                      >
                        <span className="clip-name">{sourceClip?.fileName || 'Clip'}</span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="playback-controls">
          <button className="play-button" title="Play/Pause" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="control-button" title="Stop" onClick={() => { setIsPlaying(false); setPlayhead(0); }}>⏹</button>
          <div className="time-display">
            {formatTime(playhead)} / --:--
          </div>
          <div className="trim-shortcuts">
            <span className="shortcut-hint">Press <kbd>I</kbd> for In, <kbd>O</kbd> for Out</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
