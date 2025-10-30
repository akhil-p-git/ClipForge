import React, { useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useStore } from '../../store/useStore';
import TimelineClip from './TimelineClip';
import TrimExportDialog from '../TrimExportDialog/TrimExportDialog';
import './Timeline.css';

// Track component with drop zone
function Track({ trackId, clips, timelineClips, snapTime, updateTimelineClip, removeTimelineClip, setPlayhead, isPlaying, setIsPlaying, timelineDuration, label }) {
  const [{ isOver }, drop] = useDrop({
    accept: 'timeline-clip',
    drop: (item, monitor) => {
      const dropTargetRef = monitor.getDropResult();
      const clientOffset = monitor.getClientOffset();
      const trackElement = document.querySelector(`.timeline-track:nth-child(${trackId + 1}) .track-content`);

      if (!trackElement || !clientOffset) return;

      const rect = trackElement.getBoundingClientRect();
      const x = clientOffset.x - rect.left;
      const percent = (x / rect.width) * 100;
      const newTime = Math.max(0, Math.min((percent / 100) * timelineDuration, timelineDuration));
      const snappedTime = snapTime(newTime, item.clip.id);

      // Update clip position and track
      updateTimelineClip(item.clip.id, {
        startTime: snappedTime,
        trackId: trackId,
      });

      console.log('Repositioned clip to:', snappedTime, 'on track:', trackId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleTrackClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    const newTime = Math.max(0, Math.min((percent / 100) * timelineDuration, timelineDuration));
    setPlayhead(newTime);
    console.log('Clicked timeline at:', newTime);

    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  const trackClips = timelineClips.filter(clip => clip.trackId === trackId);

  return (
    <div className="timeline-track">
      {label && <div className="track-label">{label}</div>}
      <div
        ref={drop}
        className={label ? "track-content" : "track-content track-content-no-label"}
        onClick={handleTrackClick}
        style={{ background: isOver ? 'rgba(59, 130, 246, 0.1)' : undefined }}
      >
        {trackClips.length === 0 ? (
          <div className="empty-track">Drop clips here</div>
        ) : (
          trackClips.map(clip => {
            const sourceClip = clips.find(c => c.id === clip.clipId);
            return (
              <TimelineClip
                key={clip.id}
                clip={clip}
                sourceClip={sourceClip}
                updateClip={updateTimelineClip}
                onRemove={removeTimelineClip}
                timelineDuration={timelineDuration}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function Timeline() {
  const { timelineClips, clips, playhead, isPlaying, setInPoint, setOutPoint, inPoint, outPoint, setIsPlaying, setPlayhead, addToTimeline, updateTimelineClip, currentClip, removeTimelineClip, splitTimelineClip } = useStore();
  const [showTrimDialog, setShowTrimDialog] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const SNAP_THRESHOLD = 0.5; // 0.5 seconds snap threshold
  const GRID_INTERVAL = 1; // 1 second grid intervals

  // Snap time to grid or clip edges
  const snapTime = (time, clipId = null) => {
    if (!snapEnabled) return time;

    // Snap to grid intervals
    const gridSnap = Math.round(time / GRID_INTERVAL) * GRID_INTERVAL;
    if (Math.abs(time - gridSnap) < SNAP_THRESHOLD) {
      return gridSnap;
    }

    // Snap to other clip edges
    for (const clip of timelineClips) {
      if (clip.id === clipId) continue; // Don't snap to self

      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;

      if (Math.abs(time - clipStart) < SNAP_THRESHOLD) {
        return clipStart;
      }
      if (Math.abs(time - clipEnd) < SNAP_THRESHOLD) {
        return clipEnd;
      }
    }

    return time;
  };

  const [{ isOver }, drop] = useDrop({
    accept: ['clip', 'timeline-clip'],
    drop: (item, monitor) => {
      const itemType = monitor.getItemType();

      if (itemType === 'timeline-clip') {
        // Repositioning existing timeline clip
        console.log('Repositioning timeline clip:', item.clip);
        // This will be handled by track drop zones
        return;
      }

      // Adding new clip from library
      console.log('Dropped clip on timeline:', item.clip);
      const snappedTime = snapTime(playhead);
      const timelineClip = {
        id: `timeline-${Date.now()}`,
        clipId: item.clip.id,
        trackId: 0, // Add to main track
        startTime: snappedTime,
        duration: item.clip.duration || 10,
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

  // Calculate timeline duration from all clips on timeline
  // Timeline duration = end time of the last clip, or 60 seconds minimum
  const calculateTimelineDuration = () => {
    if (timelineClips.length === 0) return 60; // Default 60 seconds if empty

    const lastClipEnd = timelineClips.reduce((maxEnd, clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return Math.max(maxEnd, clipEnd);
    }, 0);

    return Math.max(lastClipEnd, 60); // Minimum 60 seconds
  };

  const timelineDuration = calculateTimelineDuration();
  
  // Generate 10 equal ruler marks
  const rulerMarks = Array.from({ length: 11 }, (_, i) => i * (timelineDuration / 10));

  const handleApplyTrim = async () => {
    if (inPoint === null || outPoint === null) {
      alert('Please set both In and Out points first (press I for In, O for Out)');
      return;
    }
    
    if (outPoint <= inPoint) {
      alert('Out point must be after In point');
      return;
    }

    if (!currentClip) {
      alert('No video selected');
      return;
    }

    setShowTrimDialog(true);
  };

  const handleExportTimeline = async () => {
    if (timelineClips.length === 0) {
      alert('No clips on timeline to export');
      return;
    }

    if (!window.electronAPI) {
      alert('Export is only available in Electron');
      return;
    }

    try {
      // Show save dialog
      const { canceled, filePath } = await window.electronAPI.showSaveDialog({
        defaultPath: `timeline_export_${Date.now()}.mp4`,
        filters: [
          { name: 'MP4 Video', extensions: ['mp4'] }
        ]
      });

      if (canceled || !filePath) return;

      // Sort clips by start time
      const sortedClips = [...timelineClips].sort((a, b) => a.startTime - b.startTime);

      // Prepare clip data for export
      const clipInputs = sortedClips.map(timelineClip => {
        const sourceClip = clips.find(c => c.id === timelineClip.clipId);
        return {
          filePath: sourceClip.filePath,
          startTime: timelineClip.startTime,
          duration: timelineClip.duration,
          trimStart: timelineClip.trimStart || 0,
          trimEnd: timelineClip.trimEnd || 0,
        };
      });

      // Call export with all clips
      const result = await window.electronAPI.exportTimeline({
        clips: clipInputs,
        outputPath: filePath,
      });

      if (result.success) {
        alert('Timeline exported successfully!');
      } else {
        alert(`Export failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Timeline export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const handleTrimExport = async (filename, format) => {
    if (!window.electronAPI) {
      alert('Trim export is only available in Electron');
      return;
    }

    try {
      console.log('Exporting trimmed clip:', { inPoint, outPoint, clipId: currentClip.id, filename, format });
      
      // Generate output filename in same directory as input
      const inputDir = currentClip.filePath.substring(0, currentClip.filePath.lastIndexOf('/'));
      const outputFileName = `${inputDir}/${filename}.${format}`;
      
      // Call export with trim points
      const result = await window.electronAPI.exportVideo({
        inputPath: currentClip.filePath,
        outputPath: outputFileName,
        startTime: inPoint,
        endTime: outPoint,
      });
      
      if (result.success) {
        // Load the exported video into the media library
        const metadata = await window.electronAPI.getVideoMetadata(result.outputPath);
        
        const newClip = {
          id: `clip-${Date.now()}-${Math.random()}`,
          filePath: result.outputPath,
          fileName: result.outputPath.split('/').pop() || result.outputPath.split('\\').pop(),
          duration: metadata.duration,
          resolution: metadata.resolution,
          fileSize: metadata.fileSize,
          format: result.outputPath.split('.').pop(),
          hasAudio: metadata.hasAudio,
          createdAt: new Date(),
        };
        
        useStore.getState().addClip(newClip);
        useStore.getState().setCurrentClip(newClip);
        
        // Clear trim points after successful export
        useStore.getState().setInPoint(null);
        useStore.getState().setOutPoint(null);
        
        alert(`Trimmed video exported and added to library: ${newClip.fileName}`);
      } else {
        alert(`Export failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Trim export error:', error);
      alert(`Export failed: ${error.message}`);
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
          <button
            className="control-button"
            onClick={handleExportTimeline}
            disabled={timelineClips.length === 0}
            style={{
              background: timelineClips.length > 0 ? '#10b981' : '#374151',
              color: 'white',
              fontWeight: '600',
              marginRight: '12px'
            }}
            title="Export Timeline"
          >
            Export Timeline
          </button>
          <button
            className={`control-button ${snapEnabled ? 'active' : ''}`}
            onClick={() => setSnapEnabled(!snapEnabled)}
            title={snapEnabled ? 'Snap: ON' : 'Snap: OFF'}
            style={{
              background: snapEnabled ? '#3b82f6' : undefined,
              color: snapEnabled ? 'white' : undefined
            }}
          >
            🧲
          </button>
          <button className="control-button" title="Zoom Out">-</button>
          <span className="zoom-level">100%</span>
          <button className="control-button" title="Zoom In">+</button>
        </div>
      </div>

      <div className="timeline-content">
        {/* Time Ruler */}
        <div className="timeline-ruler">
          <div className="ruler-marks">
            {Array.from({ length: 11 }, (_, i) => {
            const second = i * (timelineDuration / 10);
            const percent = (i / 10) * 100;
            const isFirst = i === 0;
            const isLast = i === 10;
            return (
              <div key={second} className="ruler-mark" style={{ left: `${percent}%` }}>
                <span className={`mark-time ${isFirst ? 'align-left' : isLast ? 'align-right' : 'align-center'}`}>
                  {formatTime(second)}
                </span>
                <div className="mark-line"></div>
              </div>
            );
          })}
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
            <Track
              trackId={0}
              clips={clips}
              timelineClips={timelineClips}
              snapTime={snapTime}
              updateTimelineClip={updateTimelineClip}
              removeTimelineClip={removeTimelineClip}
              setPlayhead={setPlayhead}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              timelineDuration={timelineDuration}
              label={null}
            />

            {/* Track 2: Overlay */}
            <Track
              trackId={1}
              clips={clips}
              timelineClips={timelineClips}
              snapTime={snapTime}
              updateTimelineClip={updateTimelineClip}
              removeTimelineClip={removeTimelineClip}
              setPlayhead={setPlayhead}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              timelineDuration={timelineDuration}
              label="Track 2"
            />
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
            {formatTime(playhead)} / {formatTime(timelineDuration)}
          </div>
        
        <div className="trim-shortcuts">
          <span className="shortcut-hint">Press <kbd>I</kbd> for In, <kbd>O</kbd> for Out</span>
          <button
            className="control-button"
            onClick={() => {
              splitTimelineClip(playhead);
              console.log('Split clip at:', playhead);
            }}
            style={{ marginLeft: '12px', background: '#f59e0b', color: 'white' }}
            title="Split at playhead"
          >
            Split
          </button>
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

      {showTrimDialog && (
        <TrimExportDialog
          onClose={() => setShowTrimDialog(false)}
          onExport={handleTrimExport}
          inPoint={inPoint}
          outPoint={outPoint}
        />
      )}
    </div>
  );
}

export default Timeline;
