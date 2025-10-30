import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';

function MediaItem({ clip, onClick, isSelected = false, onRemove, onTranscribe }) {
  const mouseDownPosRef = useRef(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'clip',
    item: { clip },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const formatDuration = (seconds) => {
    if (seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return 'Unknown';
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  const handleMouseDown = (e) => {
    // Always track mouse position on mousedown to detect drags
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    console.log('Mouse down at:', mouseDownPosRef.current);
  };

  const handleClick = (e) => {
    console.log('=== MediaItem CLICK event fired ===');
    
    // If currently dragging, always ignore clicks
    if (isDragging) {
      console.log('Click ignored - drag in progress');
      return;
    }
    
    // Check if mouse was moved significantly (indicating drag)
    let wasDragged = false;
    if (mouseDownPosRef.current) {
      const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
      const moved = deltaX > 3 || deltaY > 3; // Lower threshold to 3px
      
      if (moved) {
        console.log('Click ignored - mouse moved', { deltaX, deltaY });
        wasDragged = true;
      }
      mouseDownPosRef.current = null;
    }
    
    // If dragged, don't trigger click
    if (wasDragged) {
      return;
    }
    
    // This is a genuine click
    console.log('Genuine click - calling onClick handler');
    if (onClick) {
      onClick();
    } else {
      console.error('No onClick handler provided!');
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation(); // Prevent triggering click
    if (onRemove) {
      onRemove(clip.id);
    }
  };

  const handleTranscribe = (e) => {
    e.stopPropagation(); // Prevent triggering click
    if (onTranscribe) {
      onTranscribe();
    }
  };

  return (
    <div 
      ref={drag}
      className={`media-item ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: 'pointer' }}
    >
      <div className="media-item-thumbnail">
        <div className="thumbnail-placeholder">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="currentColor"/>
          </svg>
        </div>
      </div>
      
      <div className="media-item-info">
        <div className="media-item-name" title={clip.fileName}>
          {clip.fileName}
        </div>
        <div className="media-item-meta">
          <span className="meta-item">
            ⏱ {formatDuration(clip.duration)}
          </span>
          <span className="meta-item">
            📄 {clip.format?.toUpperCase() || 'UNKNOWN'}
          </span>
          <span className="meta-item">
            💾 {formatFileSize(clip.fileSize)}
          </span>
        </div>
      {clip.resolution !== 'Unknown' && (
        <div className="media-item-resolution">
          {clip.resolution}
        </div>
      )}
    </div>
    
    <div className="media-item-actions">
      <button
        className="media-item-export"
        onClick={(e) => {
          e.stopPropagation();
          window.showExportDialog?.();
        }}
        title="Export video"
      >
        ⬇️
      </button>
      {onTranscribe && (
        <button
          className="media-item-transcribe"
          onClick={handleTranscribe}
          title="Transcribe video"
        >
          📝
        </button>
      )}
      {onRemove && (
        <button
          className="media-item-remove"
          onClick={handleRemove}
          title="Remove from library"
        >
          ×
        </button>
      )}
    </div>
  </div>
  );
}

export default MediaItem;
