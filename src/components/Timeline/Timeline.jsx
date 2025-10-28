import React, { useEffect } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { useStore } from '../../store/useStore';
import TimelineClip from './TimelineClip';
import './Timeline.css';

function Timeline() {
  const { timelineClips, clips, playhead, isPlaying, setInPoint, setOutPoint, inPoint, outPoint, setIsPlaying, setPlayhead, addToTimeline, updateTimelineClip } = useStore();

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

  // Calculate timeline duration based on clips
  const calculateTimelineDuration = () => {
    if (timelineClips.length === 0) return 60; // Default 60 seconds
    
    // Find the furthest end time of all clips
    const maxEnd = Math.max(
      ...timelineClips.map(clip => clip.startTime + clip.duration)
    );
    
    // Add some padding and round up to nearest 10 seconds
    return Math.ceil((maxEnd + 10) / 10) * 10;
  };

  const timelineDuration = calculateTimelineDuration();
  
  // Generate ruler marks
  const rulerMarks = [];
  for (let i = 0; i <= timelineDuration; i += 10) {
    rulerMarks.push(i);
  }

  const handleApplyTrim = () => {
    if (inPoint === null || outPoint === null) {
      alert('Please set both In and Out points first (press I for In, O for Out)');
      return;
    }
    
    if (outPoint <= inPoint) {
      alert('Out point must be after In point');
      return;
    }

    // Apply trim to the first clip on the timeline
    if (timelineClips.length > 0) {
      const clipToTrim = timelineClips.find(clip => clip.trackId === 0);
      if (clipToTrim) {
        updateTimelineClip(clipToTrim.id, {
          trimStart: inPoint,
          trimEnd: outPoint,
          duration: outPoint - inPoint
        });
        alert(`Trim applied! Video will play from ${formatTime(inPoint)} to ${formatTime(outPoint)}`);
        console.log('Trim applied:', { inPoint, outPoint, clipId: clipToTrim.id });
      }
    } else {
      alert('No clips on the timeline to trim');
    }
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
        e.stopPropagation();
      } else if (e.key === 'o' || e.key === 'O') {
        console.log('Set Out Point at:', playhead);
        setOutPoint(playhead);
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Playback shortcuts
      if (e.key === ' ') {
        setIsPlaying(!isPlaying);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playhead, setInPoint, setOutPoint, isPlaying, setIsPlaying]);

  return (
    <div className="timeline-container" tabIndex={0}>
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
            {rulerMarks.map(second => (
              <div key={second} className="ruler-mark">
                <span className="mark-time">{formatTime(second)}</span>
                <div className="mark-line"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Playhead */}
        <div className="timeline-playhead" style={{ left: `${(playhead / timelineDuration) * 100}%` }}>
          <div className="playhead-line"></div>
          <div className="playhead-indicator">
            <span className="playhead-time">{formatTime(playhead)}</span>
          </div>
        </div>

        {/* Trim Points */}
        {inPoint !== null && (
          <div className="trim-marker in-point" style={{ left: `${(inPoint / timelineDuration) * 100}%` }}>
            <div className="trim-marker-line"></div>
            <div className="trim-marker-label">In: {formatTime(inPoint)}</div>
          </div>
        )}
        
        {outPoint !== null && (
          <div className="trim-marker out-point" style={{ left: `${(outPoint / timelineDuration) * 100}%` }}>
            <div className="trim-marker-line"></div>
            <div className="trim-marker-label">Out: {formatTime(outPoint)}</div>
          </div>
        )}
        
        {/* Trim region highlight */}
        {inPoint !== null && outPoint !== null && outPoint > inPoint && (
          <div 
            className="trim-region" 
            style={{ 
              left: `${(inPoint / timelineDuration) * 100}%`,
              width: `${((outPoint - inPoint) / timelineDuration) * 100}%`
            }}
          />
        )}

        {/* Scrollable Tracks Container */}
        <div className="timeline-tracks-wrapper">
          {/* Tracks */}
          <div className="timeline-tracks" ref={drop}>
          {/* Track 1: Main Video */}
          <div className="timeline-track">
            <div className="track-label">Track 1</div>
            <div 
              className="track-content"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = (x / rect.width) * 100;
                const newTime = (percent / 100) * timelineDuration;
                setPlayhead(newTime);
                console.log('Clicked timeline at:', newTime);
              }}
            >
              {timelineClips.filter(clip => clip.trackId === 0).length === 0 ? (
                <div className="empty-track">Drop clips here</div>
              ) : (
                timelineClips
                  .filter(clip => clip.trackId === 0)
                  .map(clip => {
                    const sourceClip = clips.find(c => c.id === clip.clipId);
                    return (
                      <TimelineClip
                        key={clip.id}
                        clip={clip}
                        sourceClip={sourceClip}
                        updateClip={updateTimelineClip}
                      />
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
                    return (
                      <TimelineClip
                        key={clip.id}
                        clip={clip}
                        sourceClip={sourceClip}
                        updateClip={updateTimelineClip}
                      />
                    );
                  })
              )}
            </div>
          </div>
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
          {inPoint !== null && outPoint !== null && (
            <button 
              className="control-button" 
              onClick={handleApplyTrim}
              style={{ marginLeft: '12px', background: '#10b981', color: 'white' }}
              title="Apply Trim"
            >
              Apply Trim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
