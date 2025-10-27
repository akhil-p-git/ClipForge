import React from 'react';

function MediaItem({ clip, onClick }) {
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

  return (
    <div className="media-item" onClick={onClick}>
      <div className="media-item-thumbnail">
        <div className="thumbnail-placeholder">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 10.5V7C17 6.45 16.55 6 16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="currentColor"/>
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

