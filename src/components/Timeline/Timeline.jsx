import React from 'react';
import { useStore } from '../../store/useStore';
import './Timeline.css';

function Timeline() {
  const { timelineClips, playhead, isPlaying } = useStore();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

        {/* Tracks */}
        <div className="timeline-tracks">
          {/* Track 1: Main Video */}
          <div className="timeline-track">
            <div className="track-label">Track 1</div>
            <div className="track-content">
              {timelineClips.filter(clip => clip.trackId === 0).length === 0 ? (
                <div className="empty-track">Drop clips here</div>
              ) : (
                timelineClips
                  .filter(clip => clip.trackId === 0)
                  .map(clip => (
                    <div key={clip.id} className="clip-block">
                      <span className="clip-name">{clip.clipId}</span>
                    </div>
                  ))
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
                  .map(clip => (
                    <div key={clip.id} className="clip-block overlay">
                      <span className="clip-name">{clip.clipId}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="playback-controls">
          <button className="play-button" title="Play/Pause">
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="control-button" title="Stop">⏹</button>
          <div className="time-display">
            {formatTime(playhead)} / --:--
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;

