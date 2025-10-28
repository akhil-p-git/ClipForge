import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';

function MediaItem({ clip, onClick, isSelected = false }) {
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
    // Track mouse position to detect if it's a drag or click
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e) => {
    console.log('=== MediaItem CLICK event fired ===');
    
    // Check if this was a drag by comparing mouse positions
    if (mouseDownPosRef.current) {
      const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
      const moved = deltaX > 5 || deltaY > 5; // Allow 5px threshold
      
      if (moved) {
        console.log('Click ignored - mouse moved (drag occurred)');
        mouseDownPosRef.current = null;
        return;
      }
    }
    
    console.log('Calling onClick handler with clip:', clip);
    if (onClick) {
      onClick();
    }
    console.log('onClick handler called');
    
    mouseDownPosRef.current = null;
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
    </div>
  );
}

export default MediaItem;
